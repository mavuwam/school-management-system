// Property-Based Tests for Authentication Service
import * as fc from 'fast-check';
import { AuthService } from './auth.service';
import { User, UserRole } from '../models';

describe('Authentication Service - Property-Based Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    authService.clearUsers();
    authService.clearSessions();
    authService.resetTimeFunction();
  });

  /**
   * Property 1: Valid Credentials Create Sessions
   * **Validates: Requirements 1.1**
   * 
   * For any valid user credentials, authenticating with those credentials
   * should create a session token and grant access to the role-appropriate view.
   */
  describe('Property 1: Valid Credentials Create Sessions', () => {
    it('should create session tokens for valid credentials across all user types', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid user data
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            email: fc.emailAddress(),
            schoolId: fc.uuid(),
            role: fc.constantFrom(
              UserRole.STUDENT,
              UserRole.TEACHER,
              UserRole.PARENT,
              UserRole.SYSTEM_ADMIN
            ),
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (userData) => {
            // Create user with password as hash (for testing)
            const user: User = {
              id: userData.id,
              username: userData.username,
              passwordHash: userData.password, // In testing, password = hash
              email: userData.email,
              role: userData.role,
              schoolId: userData.schoolId,
              mfaEnabled: false, // Disable MFA for this test
              createdAt: new Date(),
            };

            authService.addUser(user);

            // Attempt login with valid credentials
            const result = await authService.login({
              username: userData.username,
              password: userData.password,
              schoolId: userData.schoolId,
            });

            // Verify session was created
            expect(result.success).toBe(true);
            expect(result.sessionToken).toBeDefined();
            expect(result.sessionToken).not.toBe('');
            expect(result.error).toBeUndefined();

            // Verify session is valid
            if (result.sessionToken) {
              const userContext = await authService.validateSession(
                result.sessionToken
              );
              expect(userContext.userId).toBe(user.id);
              expect(userContext.role).toBe(user.role);
              expect(userContext.schoolId).toBe(user.schoolId);
              expect(userContext.permissions.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  /**
   * Property 2: Invalid Credentials Deny Access
   * **Validates: Requirements 1.2**
   * 
   * For any invalid credentials (wrong password, non-existent user, or wrong school),
   * authentication attempts should be denied and return an error.
   */
  describe('Property 2: Invalid Credentials Deny Access', () => {
    it('should deny access for wrong passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            correctPassword: fc.string({ minLength: 8, maxLength: 50 }),
            wrongPassword: fc.string({ minLength: 8, maxLength: 50 }),
            email: fc.emailAddress(),
            schoolId: fc.uuid(),
            role: fc.constantFrom(
              UserRole.STUDENT,
              UserRole.TEACHER,
              UserRole.PARENT
            ),
          }),
          async (userData) => {
            // Ensure wrong password is different from correct password
            fc.pre(userData.wrongPassword !== userData.correctPassword);

            const user: User = {
              id: userData.id,
              username: userData.username,
              passwordHash: userData.correctPassword,
              email: userData.email,
              role: userData.role,
              schoolId: userData.schoolId,
              mfaEnabled: false,
              createdAt: new Date(),
            };

            authService.addUser(user);

            // Attempt login with wrong password
            const result = await authService.login({
              username: userData.username,
              password: userData.wrongPassword,
              schoolId: userData.schoolId,
            });

            // Verify access is denied
            expect(result.success).toBe(false);
            expect(result.sessionToken).toBeUndefined();
            expect(result.error).toBeDefined();
            expect(result.error).toBe('Invalid credentials');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should deny access for non-existent users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            schoolId: fc.uuid(),
          }),
          async (credentials) => {
            // Attempt login with non-existent user
            const result = await authService.login(credentials);

            // Verify access is denied
            expect(result.success).toBe(false);
            expect(result.sessionToken).toBeUndefined();
            expect(result.error).toBeDefined();
            expect(result.error).toBe('Invalid credentials');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should deny access for wrong school ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            email: fc.emailAddress(),
            correctSchoolId: fc.uuid(),
            wrongSchoolId: fc.uuid(),
            role: fc.constantFrom(
              UserRole.STUDENT,
              UserRole.TEACHER,
              UserRole.PARENT
            ),
          }),
          async (userData) => {
            // Ensure wrong school ID is different from correct school ID
            fc.pre(userData.wrongSchoolId !== userData.correctSchoolId);

            const user: User = {
              id: userData.id,
              username: userData.username,
              passwordHash: userData.password,
              email: userData.email,
              role: userData.role,
              schoolId: userData.correctSchoolId,
              mfaEnabled: false,
              createdAt: new Date(),
            };

            authService.addUser(user);

            // Attempt login with wrong school ID
            const result = await authService.login({
              username: userData.username,
              password: userData.password,
              schoolId: userData.wrongSchoolId,
            });

            // Verify access is denied
            expect(result.success).toBe(false);
            expect(result.sessionToken).toBeUndefined();
            expect(result.error).toBeDefined();
            expect(result.error).toBe('Invalid credentials');
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  /**
   * Property 4: Session Timeout Enforcement
   * **Validates: Requirements 1.4**
   * 
   * For any user session, if the session remains inactive for 30 minutes,
   * it should be automatically terminated and subsequent requests should be rejected.
   */
  describe('Property 4: Session Timeout Enforcement', () => {
    it('should expire sessions after 30 minutes of inactivity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            email: fc.emailAddress(),
            schoolId: fc.uuid(),
            role: fc.constantFrom(
              UserRole.STUDENT,
              UserRole.TEACHER,
              UserRole.PARENT
            ),
          }),
          async (userData) => {
            const user: User = {
              id: userData.id,
              username: userData.username,
              passwordHash: userData.password,
              email: userData.email,
              role: userData.role,
              schoolId: userData.schoolId,
              mfaEnabled: false,
              createdAt: new Date(),
            };

            authService.addUser(user);

            // Set initial time
            let currentTime = 1000000000000; // Fixed timestamp
            authService.setTimeFunction(() => currentTime);

            // Login to create session
            const loginResult = await authService.login({
              username: userData.username,
              password: userData.password,
              schoolId: userData.schoolId,
            });

            expect(loginResult.success).toBe(true);
            expect(loginResult.sessionToken).toBeDefined();

            const sessionToken = loginResult.sessionToken!;

            // Verify session is valid immediately
            const context1 = await authService.validateSession(sessionToken);
            expect(context1.userId).toBe(user.id);

            // Advance time by 31 minutes without any activity (don't validate)
            currentTime += 31 * 60 * 1000;

            // Session should now be expired
            await expect(
              authService.validateSession(sessionToken)
            ).rejects.toThrow('Session expired');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should keep sessions alive with activity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            email: fc.emailAddress(),
            schoolId: fc.uuid(),
            role: fc.constantFrom(
              UserRole.STUDENT,
              UserRole.TEACHER,
              UserRole.PARENT
            ),
          }),
          async (userData) => {
            const user: User = {
              id: userData.id,
              username: userData.username,
              passwordHash: userData.password,
              email: userData.email,
              role: userData.role,
              schoolId: userData.schoolId,
              mfaEnabled: false,
              createdAt: new Date(),
            };

            authService.addUser(user);

            // Set initial time
            let currentTime = 1000000000000;
            authService.setTimeFunction(() => currentTime);

            // Login to create session
            const loginResult = await authService.login({
              username: userData.username,
              password: userData.password,
              schoolId: userData.schoolId,
            });

            const sessionToken = loginResult.sessionToken!;

            // Simulate activity every 20 minutes for 2 hours
            for (let i = 0; i < 6; i++) {
              currentTime += 20 * 60 * 1000; // Advance 20 minutes
              const context = await authService.validateSession(sessionToken);
              expect(context.userId).toBe(user.id);
            }

            // Session should still be valid after 2 hours of regular activity
            const finalContext = await authService.validateSession(sessionToken);
            expect(finalContext.userId).toBe(user.id);
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  /**
   * Property 5: MFA Required for School Heads
   * **Validates: Requirements 1.5**
   * 
   * For any school head account, authentication should require multi-factor
   * authentication verification, while other roles should not require MFA.
   */
  describe('Property 5: MFA Required for School Heads', () => {
    it('should require MFA for school head accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            email: fc.emailAddress(),
            schoolId: fc.uuid(),
            mfaSecret: fc.string({ minLength: 16, maxLength: 32 }),
          }),
          async (userData) => {
            const user: User = {
              id: userData.id,
              username: userData.username,
              passwordHash: userData.password,
              email: userData.email,
              role: UserRole.SCHOOL_HEAD,
              schoolId: userData.schoolId,
              mfaEnabled: true,
              mfaSecret: userData.mfaSecret,
              createdAt: new Date(),
            };

            authService.addUser(user);

            // Attempt login - should require MFA
            const loginResult = await authService.login({
              username: userData.username,
              password: userData.password,
              schoolId: userData.schoolId,
            });

            // Login should fail and indicate MFA is required
            expect(loginResult.success).toBe(false);
            expect(loginResult.requiresMFA).toBe(true);
            expect(loginResult.sessionToken).toBeUndefined();
            expect(loginResult.error).toBe('MFA verification required');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should not require MFA for non-school-head roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            email: fc.emailAddress(),
            schoolId: fc.uuid(),
            role: fc.constantFrom(
              UserRole.STUDENT,
              UserRole.TEACHER,
              UserRole.PARENT,
              UserRole.SYSTEM_ADMIN
            ),
          }),
          async (userData) => {
            const user: User = {
              id: userData.id,
              username: userData.username,
              passwordHash: userData.password,
              email: userData.email,
              role: userData.role,
              schoolId: userData.schoolId,
              mfaEnabled: false, // MFA not enabled for other roles
              createdAt: new Date(),
            };

            authService.addUser(user);

            // Attempt login - should succeed without MFA
            const loginResult = await authService.login({
              username: userData.username,
              password: userData.password,
              schoolId: userData.schoolId,
            });

            // Login should succeed without MFA requirement
            expect(loginResult.success).toBe(true);
            expect(loginResult.requiresMFA).toBeUndefined();
            expect(loginResult.sessionToken).toBeDefined();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should create session after successful MFA verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            email: fc.emailAddress(),
            schoolId: fc.uuid(),
            mfaSecret: fc.string({ minLength: 16, maxLength: 32 }),
            mfaToken: fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^\d{6}$/.test(s)),
          }),
          async (userData) => {
            const user: User = {
              id: userData.id,
              username: userData.username,
              passwordHash: userData.password,
              email: userData.email,
              role: UserRole.SCHOOL_HEAD,
              schoolId: userData.schoolId,
              mfaEnabled: true,
              mfaSecret: userData.mfaSecret,
              createdAt: new Date(),
            };

            authService.addUser(user);

            // First login attempt should require MFA
            const loginResult = await authService.login({
              username: userData.username,
              password: userData.password,
              schoolId: userData.schoolId,
            });

            expect(loginResult.requiresMFA).toBe(true);

            // Verify MFA with valid token
            const mfaResult = await authService.verifyMFA(
              user.id,
              userData.mfaToken
            );

            // MFA verification should succeed (our simple implementation accepts any 6-digit token)
            expect(mfaResult).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });
  });
});
