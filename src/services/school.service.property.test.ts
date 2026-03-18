// School Service Property-Based Tests
import * as fc from 'fast-check';
import { SchoolService } from './school.service';
import { School, UserRole, AcademicCalendar, GradingScale, Term, Holiday } from '../models';
import { UserContext } from '../interfaces/auth.interface';
import { SchoolCreate, BrandingConfig } from '../interfaces/school.interface';

describe('SchoolService Property-Based Tests', () => {
  let service: SchoolService;

  beforeEach(() => {
    service = new SchoolService();
    service.clearAll();
  });

  afterEach(() => {
    service.clearAll();
  });

  // Generators for property-based testing

  const schoolIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `school_${s}`);

  const userIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `user_${s}`);

  const schoolCreateArb: fc.Arbitrary<SchoolCreate> = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    address: fc.string({ minLength: 1, maxLength: 100 }),
    contactEmail: fc.emailAddress(),
    contactPhone: fc.string({ minLength: 10, maxLength: 15 }),
    logoUrl: fc.option(fc.webUrl(), { nil: undefined }),
    primaryColor: fc.option(
      fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
      { nil: undefined }
    ),
    secondaryColor: fc.option(
      fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
      { nil: undefined }
    ),
  });

  const termArb: fc.Arbitrary<Term> = fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
      fc.integer({ min: 1, max: 180 })
    )
    .map(([id, name, startDate, durationDays]) => ({
      id,
      name,
      startDate,
      endDate: new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000),
    }));

  const holidayArb: fc.Arbitrary<Holiday> = fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  });

  const academicCalendarArb = (schoolId: string): fc.Arbitrary<AcademicCalendar> =>
    fc
      .tuple(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.integer({ min: 180, max: 365 }),
        fc.array(termArb, { minLength: 0, maxLength: 4 }),
        fc.array(holidayArb, { minLength: 0, maxLength: 10 })
      )
      .map(([startDate, durationDays, terms, holidays]) => ({
        schoolId,
        academicYearStart: startDate,
        academicYearEnd: new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000),
        terms,
        holidays,
      }));

  const gradeRangeArb = fc
    .tuple(
      fc.integer({ min: 0, max: 90 }),
      fc.integer({ min: 5, max: 20 }),
      fc.string({ minLength: 1, maxLength: 2 }),
      fc.double({ min: 0, max: 4, noNaN: true })
    )
    .map(([minScore, rangeSize, letterGrade, gpaValue]) => ({
      minScore,
      maxScore: minScore + rangeSize,
      letterGrade,
      gpaValue,
    }));

  const gradingScaleArb = (schoolId: string): fc.Arbitrary<GradingScale> =>
    fc.record({
      schoolId: fc.constant(schoolId),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      ranges: fc.array(gradeRangeArb, { minLength: 1, maxLength: 5 }),
    });

  const userContextArb = (
    role: UserRole,
    schoolId: string
  ): fc.Arbitrary<UserContext> =>
    fc.record({
      userId: userIdArb,
      role: fc.constant(role),
      schoolId: fc.constant(schoolId),
      permissions: fc.constant([]),
    });

  const schoolArb = (schoolId: string): fc.Arbitrary<School> =>
    fc
      .tuple(
        schoolCreateArb,
        academicCalendarArb(schoolId),
        gradingScaleArb(schoolId),
        fc.date()
      )
      .map(([create, calendar, gradingScale, createdAt]) => ({
        id: schoolId,
        name: create.name,
        address: create.address,
        contactEmail: create.contactEmail,
        contactPhone: create.contactPhone,
        logoUrl: create.logoUrl,
        primaryColor: create.primaryColor,
        secondaryColor: create.secondaryColor,
        academicCalendar: calendar,
        gradingScale: gradingScale,
        createdAt,
      }));

  // Property 20: School Data Isolation
  // **Validates: Requirements 6.1, 6.3**
  test('Property 20: School Data Isolation - data from one school should not be accessible from another school context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(schoolIdArb, schoolIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 10, maxLength: 15 }),
        async (schoolIds, name, address, email, phone) => {
          const [schoolId1, schoolId2] = schoolIds;

          // Create two schools with minimal data
          const school1: School = {
            id: schoolId1,
            name,
            address,
            contactEmail: email,
            contactPhone: phone,
            academicCalendar: {
              schoolId: schoolId1,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId1,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };

          const school2: School = {
            ...school1,
            id: schoolId2,
            academicCalendar: { ...school1.academicCalendar, schoolId: schoolId2 },
            gradingScale: { ...school1.gradingScale, schoolId: schoolId2 },
          };

          service.addSchool(school1);
          service.addSchool(school2);

          // Create user contexts for each school
          const school1Context: UserContext = {
            userId: 'user1',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId1,
            permissions: [],
          };

          const school2Context: UserContext = {
            userId: 'user2',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId2,
            permissions: [],
          };

          // User from school2 should not be able to access school1 data
          await expect(service.getSchool(schoolId1, school2Context)).rejects.toThrow(
            'Cannot access other school data'
          );

          // User from school1 should not be able to access school2 data
          await expect(service.getSchool(schoolId2, school1Context)).rejects.toThrow(
            'Cannot access other school data'
          );

          // But each user should be able to access their own school
          const retrievedSchool1 = await service.getSchool(schoolId1, school1Context);
          const retrievedSchool2 = await service.getSchool(schoolId2, school2Context);

          expect(retrievedSchool1.id).toBe(schoolId1);
          expect(retrievedSchool2.id).toBe(schoolId2);
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 20 (continued): School Data Isolation - middleware enforcement
  // **Validates: Requirements 6.1, 6.3**
  test('Property 20: School Data Isolation - middleware should enforce cross-school access restrictions', () => {
    fc.assert(
      fc.property(
        fc.tuple(schoolIdArb, schoolIdArb).filter(([id1, id2]) => id1 !== id2),
        userContextArb(UserRole.SCHOOL_HEAD, 'school1'),
        ([schoolId1, schoolId2], userContext) => {
          // Update user context to be from school1
          const school1Context = { ...userContext, schoolId: schoolId1 };

          // Should allow access to own school
          expect(() => {
            service.enforceSchoolIsolation(school1Context, schoolId1);
          }).not.toThrow();

          // Should reject access to other school
          expect(() => {
            service.enforceSchoolIsolation(school1Context, schoolId2);
          }).toThrow('Cross-school access not allowed');
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 20 (continued): School Data Isolation - system admin bypass
  // **Validates: Requirements 6.1, 6.3**
  test('Property 20: School Data Isolation - system admin should bypass isolation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(schoolIdArb, { minLength: 2, maxLength: 5 }).map((ids) => [...new Set(ids)]),
        async (schoolIds) => {
          // Create multiple schools
          for (const schoolId of schoolIds) {
            const school: School = {
              id: schoolId,
              name: `School ${schoolId}`,
              address: '123 Main St',
              contactEmail: `contact@${schoolId}.com`,
              contactPhone: '555-1234',
              academicCalendar: {
                schoolId,
                academicYearStart: new Date('2024-09-01'),
                academicYearEnd: new Date('2025-06-30'),
                terms: [],
                holidays: [],
              },
              gradingScale: {
                schoolId,
                name: 'Standard',
                ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
              },
              createdAt: new Date(),
            };
            service.addSchool(school);
          }

          // System admin context
          const adminContext: UserContext = {
            userId: 'admin1',
            role: UserRole.SYSTEM_ADMIN,
            schoolId: schoolIds[0],
            permissions: [],
          };

          // System admin should be able to access all schools
          for (const schoolId of schoolIds) {
            const retrieved = await service.getSchool(schoolId, adminContext);
            expect(retrieved.id).toBe(schoolId);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 20 (continued): School Data Isolation - update operations
  // **Validates: Requirements 6.1, 6.3**
  test('Property 20: School Data Isolation - users cannot update other school data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(schoolIdArb, schoolIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.string({ minLength: 1, maxLength: 50 }),
        async ([schoolId1, schoolId2], newName) => {
          // Create two schools
          const school1: School = {
            id: schoolId1,
            name: 'School 1',
            address: '123 Main St',
            contactEmail: 'school1@test.com',
            contactPhone: '555-1111',
            academicCalendar: {
              schoolId: schoolId1,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId1,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };

          const school2: School = {
            ...school1,
            id: schoolId2,
            name: 'School 2',
            contactEmail: 'school2@test.com',
            contactPhone: '555-2222',
            academicCalendar: { ...school1.academicCalendar, schoolId: schoolId2 },
            gradingScale: { ...school1.gradingScale, schoolId: schoolId2 },
          };

          service.addSchool(school1);
          service.addSchool(school2);

          // Create user context for school1
          const school1Context: UserContext = {
            userId: 'user1',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId1,
            permissions: [],
          };

          const updates = { name: newName };

          // User from school1 should not be able to update school2
          await expect(
            service.updateSchool(schoolId2, updates, school1Context)
          ).rejects.toThrow('Cannot update other school data');

          // But should be able to update their own school
          const updated = await service.updateSchool(schoolId1, updates, school1Context);
          expect(updated.name).toBe(newName);
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 20 (continued): School Data Isolation - branding operations
  // **Validates: Requirements 6.1, 6.3, 6.4**
  test('Property 20: School Data Isolation - users cannot update other school branding', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(schoolIdArb, schoolIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.option(fc.webUrl(), { nil: undefined }),
        fc.option(
          fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
          { nil: undefined }
        ),
        async ([schoolId1, schoolId2], logoUrl, primaryColor) => {
          // Create two schools
          const school1: School = {
            id: schoolId1,
            name: 'School 1',
            address: '123 Main St',
            contactEmail: 'school1@test.com',
            contactPhone: '555-1111',
            academicCalendar: {
              schoolId: schoolId1,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId1,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };

          const school2: School = {
            ...school1,
            id: schoolId2,
            name: 'School 2',
            contactEmail: 'school2@test.com',
            contactPhone: '555-2222',
            academicCalendar: { ...school1.academicCalendar, schoolId: schoolId2 },
            gradingScale: { ...school1.gradingScale, schoolId: schoolId2 },
          };

          service.addSchool(school1);
          service.addSchool(school2);

          // Create user context for school1
          const school1Context: UserContext = {
            userId: 'user1',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId1,
            permissions: [],
          };

          const branding: BrandingConfig = {
            logoUrl,
            primaryColor,
          };

          // User from school1 should not be able to update school2 branding
          await expect(
            service.updateBranding(schoolId2, branding, school1Context)
          ).rejects.toThrow('Cannot update other school branding');

          // But should be able to update their own school branding
          const updated = await service.updateBranding(schoolId1, branding, school1Context);
          if (logoUrl !== undefined) {
            expect(updated.logoUrl).toBe(logoUrl);
          }
          if (primaryColor !== undefined) {
            expect(updated.primaryColor).toBe(primaryColor);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 21: User School Association Routing
  // **Validates: Requirements 6.2**
  test('Property 21: User School Association Routing - users should be directed to their associated school', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(schoolIdArb, { minLength: 2, maxLength: 5 }).map((ids) => [...new Set(ids)]),
        fc.constantFrom(UserRole.STUDENT, UserRole.TEACHER, UserRole.SCHOOL_HEAD, UserRole.PARENT),
        async (schoolIds, role) => {
          // Create multiple schools
          for (const schoolId of schoolIds) {
            const school: School = {
              id: schoolId,
              name: `School ${schoolId}`,
              address: '123 Main St',
              contactEmail: `contact@${schoolId}.com`,
              contactPhone: '555-1234',
              academicCalendar: {
                schoolId,
                academicYearStart: new Date('2024-09-01'),
                academicYearEnd: new Date('2025-06-30'),
                terms: [],
                holidays: [],
              },
              gradingScale: {
                schoolId,
                name: 'Standard',
                ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
              },
              createdAt: new Date(),
            };
            service.addSchool(school);
          }

          // For each school, create a user context and verify they can only access their school
          for (const schoolId of schoolIds) {
            const userContext: UserContext = {
              userId: `user_${schoolId}`,
              role,
              schoolId,
              permissions: [],
            };

            // User should be able to access their associated school
            const school = await service.getSchool(schoolId, userContext);
            expect(school.id).toBe(schoolId);

            // User should NOT be able to access other schools
            for (const otherSchoolId of schoolIds) {
              if (otherSchoolId !== schoolId) {
                await expect(service.getSchool(otherSchoolId, userContext)).rejects.toThrow(
                  'Cannot access other school data'
                );
              }
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 21 (continued): User School Association Routing - school context consistency
  // **Validates: Requirements 6.2**
  test('Property 21: User School Association Routing - user context schoolId must match accessed school', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        fc.constantFrom(UserRole.STUDENT, UserRole.TEACHER, UserRole.SCHOOL_HEAD, UserRole.PARENT),
        async (schoolId, role) => {
          // Create a school
          const school: School = {
            id: schoolId,
            name: `School ${schoolId}`,
            address: '123 Main St',
            contactEmail: `contact@${schoolId}.com`,
            contactPhone: '555-1234',
            academicCalendar: {
              schoolId,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };
          service.addSchool(school);

          // Create user context with matching school ID
          const userContext: UserContext = {
            userId: `user_${schoolId}`,
            role,
            schoolId,
            permissions: [],
          };

          // User should successfully access their school
          const retrieved = await service.getSchool(schoolId, userContext);
          expect(retrieved.id).toBe(schoolId);
          expect(retrieved.id).toBe(userContext.schoolId);
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 22: Custom Branding Application
  // **Validates: Requirements 6.4**
  test('Property 22: Custom Branding Application - schools with custom branding should display that branding', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        fc.option(fc.webUrl(), { nil: undefined }),
        fc.option(
          fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
          { nil: undefined }
        ),
        fc.option(
          fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
          { nil: undefined }
        ),
        async (schoolId, logoUrl, primaryColor, secondaryColor) => {
          // Create a school with custom branding
          const school: School = {
            id: schoolId,
            name: `School ${schoolId}`,
            address: '123 Main St',
            contactEmail: `contact@${schoolId}.com`,
            contactPhone: '555-1234',
            logoUrl,
            primaryColor,
            secondaryColor,
            academicCalendar: {
              schoolId,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };
          service.addSchool(school);

          // Create user context for this school
          const userContext: UserContext = {
            userId: `user_${schoolId}`,
            role: UserRole.STUDENT,
            schoolId,
            permissions: [],
          };

          // Retrieve the school and verify branding is present
          const retrieved = await service.getSchool(schoolId, userContext);
          expect(retrieved.logoUrl).toBe(logoUrl);
          expect(retrieved.primaryColor).toBe(primaryColor);
          expect(retrieved.secondaryColor).toBe(secondaryColor);

          // Also verify through getBranding method
          const branding = await service.getBranding(schoolId, userContext);
          expect(branding.logoUrl).toBe(logoUrl);
          expect(branding.primaryColor).toBe(primaryColor);
          expect(branding.secondaryColor).toBe(secondaryColor);
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 22 (continued): Custom Branding Application - branding updates persist
  // **Validates: Requirements 6.4**
  test('Property 22: Custom Branding Application - branding updates should persist and be retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        fc.webUrl(),
        fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
        fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
        async (schoolId, logoUrl, primaryColor, secondaryColor) => {
          // Create a school without branding
          const school: School = {
            id: schoolId,
            name: `School ${schoolId}`,
            address: '123 Main St',
            contactEmail: `contact@${schoolId}.com`,
            contactPhone: '555-1234',
            academicCalendar: {
              schoolId,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };
          service.addSchool(school);

          // Create admin context
          const adminContext: UserContext = {
            userId: 'admin1',
            role: UserRole.SCHOOL_HEAD,
            schoolId,
            permissions: [],
          };

          // Update branding
          const branding: BrandingConfig = {
            logoUrl,
            primaryColor,
            secondaryColor,
          };

          const updated = await service.updateBranding(schoolId, branding, adminContext);

          // Verify branding was applied
          expect(updated.logoUrl).toBe(logoUrl);
          expect(updated.primaryColor).toBe(primaryColor);
          expect(updated.secondaryColor).toBe(secondaryColor);

          // Retrieve school again and verify branding persists
          const retrieved = await service.getSchool(schoolId, adminContext);
          expect(retrieved.logoUrl).toBe(logoUrl);
          expect(retrieved.primaryColor).toBe(primaryColor);
          expect(retrieved.secondaryColor).toBe(secondaryColor);
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 22 (continued): Custom Branding Application - different schools have independent branding
  // **Validates: Requirements 6.4**
  test('Property 22: Custom Branding Application - different schools should have independent branding', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(schoolIdArb, schoolIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.webUrl(),
        fc.webUrl(),
        fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
        fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
        async ([schoolId1, schoolId2], logo1, logo2, color1, color2) => {
          // Create two schools with different branding
          const school1: School = {
            id: schoolId1,
            name: 'School 1',
            address: '123 Main St',
            contactEmail: 'school1@test.com',
            contactPhone: '555-1111',
            logoUrl: logo1,
            primaryColor: color1,
            academicCalendar: {
              schoolId: schoolId1,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId1,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };

          const school2: School = {
            id: schoolId2,
            name: 'School 2',
            address: '456 Oak Ave',
            contactEmail: 'school2@test.com',
            contactPhone: '555-2222',
            logoUrl: logo2,
            primaryColor: color2,
            academicCalendar: {
              schoolId: schoolId2,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId2,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };

          service.addSchool(school1);
          service.addSchool(school2);

          // Create contexts for each school
          const context1: UserContext = {
            userId: 'user1',
            role: UserRole.STUDENT,
            schoolId: schoolId1,
            permissions: [],
          };

          const context2: UserContext = {
            userId: 'user2',
            role: UserRole.STUDENT,
            schoolId: schoolId2,
            permissions: [],
          };

          // Verify each school has its own branding
          const branding1 = await service.getBranding(schoolId1, context1);
          const branding2 = await service.getBranding(schoolId2, context2);

          expect(branding1.logoUrl).toBe(logo1);
          expect(branding1.primaryColor).toBe(color1);
          expect(branding2.logoUrl).toBe(logo2);
          expect(branding2.primaryColor).toBe(color2);

          // Verify branding is different (if inputs are different)
          if (logo1 !== logo2) {
            expect(branding1.logoUrl).not.toBe(branding2.logoUrl);
          }
          if (color1 !== color2) {
            expect(branding1.primaryColor).not.toBe(branding2.primaryColor);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 23: Independent School Configuration
  // **Validates: Requirements 6.5**
  test('Property 23: Independent School Configuration - schools should have independent academic calendars', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(schoolIdArb, schoolIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        fc.integer({ min: 180, max: 365 }),
        fc.integer({ min: 180, max: 365 }),
        async ([schoolId1, schoolId2], start1, start2, duration1, duration2) => {
          // Create two schools
          const school1: School = {
            id: schoolId1,
            name: 'School 1',
            address: '123 Main St',
            contactEmail: 'school1@test.com',
            contactPhone: '555-1111',
            academicCalendar: {
              schoolId: schoolId1,
              academicYearStart: start1,
              academicYearEnd: new Date(start1.getTime() + duration1 * 24 * 60 * 60 * 1000),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId1,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };

          const school2: School = {
            id: schoolId2,
            name: 'School 2',
            address: '456 Oak Ave',
            contactEmail: 'school2@test.com',
            contactPhone: '555-2222',
            academicCalendar: {
              schoolId: schoolId2,
              academicYearStart: start2,
              academicYearEnd: new Date(start2.getTime() + duration2 * 24 * 60 * 60 * 1000),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId2,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };

          service.addSchool(school1);
          service.addSchool(school2);

          // Create contexts for each school
          const context1: UserContext = {
            userId: 'user1',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId1,
            permissions: [],
          };

          const context2: UserContext = {
            userId: 'user2',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId2,
            permissions: [],
          };

          // Retrieve calendars
          const calendar1 = await service.getAcademicCalendar(schoolId1, context1);
          const calendar2 = await service.getAcademicCalendar(schoolId2, context2);

          // Verify each school has its own calendar
          expect(calendar1.schoolId).toBe(schoolId1);
          expect(calendar2.schoolId).toBe(schoolId2);
          expect(calendar1.academicYearStart).toEqual(start1);
          expect(calendar2.academicYearStart).toEqual(start2);

          // Verify calendars are independent (if inputs are different)
          if (start1.getTime() !== start2.getTime()) {
            expect(calendar1.academicYearStart.getTime()).not.toBe(
              calendar2.academicYearStart.getTime()
            );
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 23 (continued): Independent School Configuration - schools should have independent grading scales
  // **Validates: Requirements 6.5**
  test('Property 23: Independent School Configuration - schools should have independent grading scales', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(schoolIdArb, schoolIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async ([schoolId1, schoolId2], scaleName1, scaleName2) => {
          // Create two schools with different grading scales
          const school1: School = {
            id: schoolId1,
            name: 'School 1',
            address: '123 Main St',
            contactEmail: 'school1@test.com',
            contactPhone: '555-1111',
            academicCalendar: {
              schoolId: schoolId1,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId1,
              name: scaleName1,
              ranges: [
                { minScore: 90, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 },
                { minScore: 0, maxScore: 89, letterGrade: 'B', gpaValue: 3.0 },
              ],
            },
            createdAt: new Date(),
          };

          const school2: School = {
            id: schoolId2,
            name: 'School 2',
            address: '456 Oak Ave',
            contactEmail: 'school2@test.com',
            contactPhone: '555-2222',
            academicCalendar: {
              schoolId: schoolId2,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId2,
              name: scaleName2,
              ranges: [
                { minScore: 93, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 },
                { minScore: 85, maxScore: 92, letterGrade: 'B', gpaValue: 3.0 },
                { minScore: 0, maxScore: 84, letterGrade: 'C', gpaValue: 2.0 },
              ],
            },
            createdAt: new Date(),
          };

          service.addSchool(school1);
          service.addSchool(school2);

          // Create contexts for each school
          const context1: UserContext = {
            userId: 'user1',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId1,
            permissions: [],
          };

          const context2: UserContext = {
            userId: 'user2',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId2,
            permissions: [],
          };

          // Retrieve grading scales
          const scale1 = await service.getGradingScale(schoolId1, context1);
          const scale2 = await service.getGradingScale(schoolId2, context2);

          // Verify each school has its own grading scale
          expect(scale1.schoolId).toBe(schoolId1);
          expect(scale2.schoolId).toBe(schoolId2);
          expect(scale1.name).toBe(scaleName1);
          expect(scale2.name).toBe(scaleName2);
          expect(scale1.ranges.length).toBe(2);
          expect(scale2.ranges.length).toBe(3);

          // Verify scales are independent
          if (scaleName1 !== scaleName2) {
            expect(scale1.name).not.toBe(scale2.name);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  // Property 23 (continued): Independent School Configuration - updating one school's config doesn't affect others
  // **Validates: Requirements 6.5**
  test('Property 23: Independent School Configuration - updating one school config should not affect other schools', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(schoolIdArb, schoolIdArb).filter(([id1, id2]) => id1 !== id2),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        async ([schoolId1, schoolId2], termName, termStart) => {
          // Create two schools with empty calendars
          const school1: School = {
            id: schoolId1,
            name: 'School 1',
            address: '123 Main St',
            contactEmail: 'school1@test.com',
            contactPhone: '555-1111',
            academicCalendar: {
              schoolId: schoolId1,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId1,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
            createdAt: new Date(),
          };

          const school2: School = {
            ...school1,
            id: schoolId2,
            name: 'School 2',
            contactEmail: 'school2@test.com',
            contactPhone: '555-2222',
            academicCalendar: {
              schoolId: schoolId2,
              academicYearStart: new Date('2024-09-01'),
              academicYearEnd: new Date('2025-06-30'),
              terms: [],
              holidays: [],
            },
            gradingScale: {
              schoolId: schoolId2,
              name: 'Standard',
              ranges: [{ minScore: 0, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 }],
            },
          };

          service.addSchool(school1);
          service.addSchool(school2);

          // Create contexts
          const context1: UserContext = {
            userId: 'user1',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId1,
            permissions: [],
          };

          const context2: UserContext = {
            userId: 'user2',
            role: UserRole.SCHOOL_HEAD,
            schoolId: schoolId2,
            permissions: [],
          };

          // Add a term to school1
          const termEnd = new Date(termStart.getTime() + 90 * 24 * 60 * 60 * 1000);
          await service.addTerm(
            schoolId1,
            { name: termName, startDate: termStart, endDate: termEnd },
            context1
          );

          // Verify school1 has the term
          const calendar1 = await service.getAcademicCalendar(schoolId1, context1);
          expect(calendar1.terms.length).toBe(1);
          expect(calendar1.terms[0].name).toBe(termName);

          // Verify school2 is unaffected
          const calendar2 = await service.getAcademicCalendar(schoolId2, context2);
          expect(calendar2.terms.length).toBe(0);
        }
      ),
      { numRuns: 25 }
    );
  });
});
