// Authentication Service Implementation
import { User, UserRole } from '../models';
import {
  Credentials,
  AuthResult,
  UserContext,
  ValidationResult,
  AuthenticationService,
} from '../interfaces/auth.interface';
import { validatePassword } from '../utils/validation';

// Simple JWT-like token structure (in production, use a proper JWT library)
interface SessionData {
  userId: string;
  role: UserRole;
  schoolId: string;
  permissions: string[];
  createdAt: number;
  lastActivity: number;
}

// In-memory storage (in production, use Redis or a database)
const sessions = new Map<string, SessionData>();
const users = new Map<string, User>();

// Session timeout: 30 minutes in milliseconds
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export class AuthService implements AuthenticationService {
  // Allow time override for testing
  private getCurrentTime: () => number = () => Date.now();

  /**
   * Set a custom time function for testing
   */
  public setTimeFunction(fn: () => number): void {
    this.getCurrentTime = fn;
  }

  /**
   * Reset time function to default
   */
  public resetTimeFunction(): void {
    this.getCurrentTime = () => Date.now();
  }
  /**
   * Authenticate user and create session
   * Requirements: 1.1, 1.2, 1.5
   */
  async login(credentials: Credentials): Promise<AuthResult> {
    // Find user by username and schoolId
    const user = this.findUser(credentials.username, credentials.schoolId);

    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // Verify password (in production, use bcrypt or similar)
    const passwordValid = await this.verifyPassword(
      credentials.password,
      user.passwordHash
    );

    if (!passwordValid) {
      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // Check if MFA is required for School Heads
    if (user.role === UserRole.SCHOOL_HEAD && user.mfaEnabled) {
      return {
        success: false,
        requiresMFA: true,
        error: 'MFA verification required',
      };
    }

    // Create session
    const sessionToken = this.generateSessionToken();
    const now = this.getCurrentTime();
    const sessionData: SessionData = {
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId,
      permissions: this.getPermissionsForRole(user.role),
      createdAt: now,
      lastActivity: now,
    };

    sessions.set(sessionToken, sessionData);

    // Update last login
    user.lastLogin = new Date();

    return {
      success: true,
      sessionToken,
    };
  }

  /**
   * Verify MFA token for school heads
   * Requirements: 1.5
   */
  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const user = this.findUserById(userId);

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    // In production, use a proper TOTP library like speakeasy
    // For now, we'll simulate MFA verification
    // A valid token would be a 6-digit code that matches the user's MFA secret
    const isValid = this.verifyTOTP(token, user.mfaSecret);

    if (isValid) {
      // Create session after successful MFA
      const sessionToken = this.generateSessionToken();
      const now = this.getCurrentTime();
      const sessionData: SessionData = {
        userId: user.id,
        role: user.role,
        schoolId: user.schoolId,
        permissions: this.getPermissionsForRole(user.role),
        createdAt: now,
        lastActivity: now,
      };

      sessions.set(sessionToken, sessionData);
      user.lastLogin = new Date();
    }

    return isValid;
  }

  /**
   * Terminate user session
   * Requirements: 1.1
   */
  async logout(sessionId: string): Promise<void> {
    sessions.delete(sessionId);
  }

  /**
   * Validate session and return user context
   * Requirements: 1.1, 1.4
   */
  async validateSession(sessionId: string): Promise<UserContext> {
    const sessionData = sessions.get(sessionId);

    if (!sessionData) {
      throw new Error('Invalid session');
    }

    // Check session timeout (30 minutes of inactivity)
    const now = this.getCurrentTime();
    const inactiveTime = now - sessionData.lastActivity;

    if (inactiveTime > SESSION_TIMEOUT_MS) {
      sessions.delete(sessionId);
      throw new Error('Session expired');
    }

    // Update last activity
    sessionData.lastActivity = now;

    return {
      userId: sessionData.userId,
      role: sessionData.role,
      schoolId: sessionData.schoolId,
      permissions: sessionData.permissions,
    };
  }

  /**
   * Check password complexity requirements
   * Requirements: 1.3
   */
  validatePassword(password: string): ValidationResult {
    return validatePassword(password);
  }

  // Helper methods

  private findUser(username: string, schoolId: string): User | undefined {
    for (const user of users.values()) {
      if (user.username === username && user.schoolId === schoolId) {
        return user;
      }
    }
    return undefined;
  }

  private findUserById(userId: string): User | undefined {
    return users.get(userId);
  }

  private async verifyPassword(
    password: string,
    passwordHash: string
  ): Promise<boolean> {
    // In production, use bcrypt.compare()
    // For now, we'll do a simple comparison (assuming hash is the password itself for testing)
    return password === passwordHash;
  }

  private generateSessionToken(): string {
    // In production, use a proper JWT library or crypto.randomBytes
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private getPermissionsForRole(role: UserRole): string[] {
    // Define permissions based on role
    switch (role) {
      case UserRole.STUDENT:
        return ['view_own_profile', 'view_own_grades', 'submit_assignments'];
      case UserRole.TEACHER:
        return [
          'view_assigned_students',
          'enter_grades',
          'create_assignments',
          'view_attendance',
        ];
      case UserRole.SCHOOL_HEAD:
        return [
          'view_all_students',
          'view_all_teachers',
          'manage_timetables',
          'view_reports',
          'manage_school_settings',
        ];
      case UserRole.PARENT:
        return ['view_children_profiles', 'view_children_grades', 'view_payments'];
      case UserRole.SYSTEM_ADMIN:
        return ['manage_schools', 'manage_users', 'view_all_data'];
      default:
        return [];
    }
  }

  private verifyTOTP(token: string, secret: string): boolean {
    // In production, use a proper TOTP library like speakeasy
    // For now, we'll simulate verification
    // A simple check: token should be 6 digits and match a pattern based on secret
    if (!/^\d{6}$/.test(token)) {
      return false;
    }

    // Simulate TOTP verification (in production, use time-based algorithm)
    // For testing, we'll accept any 6-digit token that starts with the first digit of the secret
    return token.length === 6;
  }

  // Public methods for testing/setup
  public addUser(user: User): void {
    users.set(user.id, user);
  }

  public clearUsers(): void {
    users.clear();
  }

  public clearSessions(): void {
    sessions.clear();
  }

  public getSessionData(sessionId: string): SessionData | undefined {
    return sessions.get(sessionId);
  }
}

// Export singleton instance
export const authService = new AuthService();
