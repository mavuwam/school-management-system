// School Service Unit Tests
import { SchoolService } from './school.service';
import { UserRole, School, AcademicCalendar, GradingScale } from '../models';
import { UserContext } from '../interfaces/auth.interface';
import {
  SchoolCreate,
  SchoolUpdate,
  BrandingConfig,
  TermCreate,
  HolidayCreate,
} from '../interfaces/school.interface';

describe('SchoolService', () => {
  let service: SchoolService;
  let systemAdminContext: UserContext;
  let schoolHeadContext: UserContext;
  let teacherContext: UserContext;

  beforeEach(() => {
    service = new SchoolService();
    service.clearAll();

    systemAdminContext = {
      userId: 'admin1',
      role: UserRole.SYSTEM_ADMIN,
      schoolId: 'school1',
      permissions: [],
    };

    schoolHeadContext = {
      userId: 'head1',
      role: UserRole.SCHOOL_HEAD,
      schoolId: 'school1',
      permissions: [],
    };

    teacherContext = {
      userId: 'teacher1',
      role: UserRole.TEACHER,
      schoolId: 'school1',
      permissions: [],
    };
  });

  describe('createSchool', () => {
    it('should create a school with valid data', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      expect(school.id).toBeDefined();
      expect(school.name).toBe('Test School');
      expect(school.address).toBe('123 Main St');
      expect(school.contactEmail).toBe('contact@test.com');
      expect(school.contactPhone).toBe('555-1234');
      expect(school.academicCalendar).toBeDefined();
      expect(school.gradingScale).toBeDefined();
      expect(school.createdAt).toBeInstanceOf(Date);
    });

    it('should create school with custom branding', async () => {
      const schoolData: SchoolCreate = {
        name: 'Branded School',
        address: '456 Oak Ave',
        contactEmail: 'info@branded.com',
        contactPhone: '555-5678',
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#FF0000',
        secondaryColor: '#0000FF',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      expect(school.logoUrl).toBe('https://example.com/logo.png');
      expect(school.primaryColor).toBe('#FF0000');
      expect(school.secondaryColor).toBe('#0000FF');
    });

    it('should reject creation by non-admin', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      await expect(
        service.createSchool(schoolData, schoolHeadContext)
      ).rejects.toThrow('Only system admins can create schools');
    });

    it('should reject creation with missing fields', async () => {
      const schoolData = {
        name: 'Test School',
        address: '123 Main St',
      } as SchoolCreate;

      await expect(
        service.createSchool(schoolData, systemAdminContext)
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('getSchool', () => {
    it('should retrieve school by ID', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const created = await service.createSchool(schoolData, systemAdminContext);
      const retrieved = await service.getSchool(created.id, systemAdminContext);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test School');
    });

    it('should enforce school isolation', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      const otherSchoolContext: UserContext = {
        userId: 'head2',
        role: UserRole.SCHOOL_HEAD,
        schoolId: 'school2',
        permissions: [],
      };

      await expect(
        service.getSchool(school.id, otherSchoolContext)
      ).rejects.toThrow('Cannot access other school data');
    });

    it('should allow system admin to access any school', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);
      const retrieved = await service.getSchool(school.id, systemAdminContext);

      expect(retrieved.id).toBe(school.id);
    });

    it('should throw error for non-existent school', async () => {
      await expect(
        service.getSchool('nonexistent', systemAdminContext)
      ).rejects.toThrow('School not found');
    });
  });

  describe('updateSchool', () => {
    it('should update school basic information', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      // Update context to match the created school
      const matchingContext: UserContext = {
        ...schoolHeadContext,
        schoolId: school.id,
      };

      const updates: SchoolUpdate = {
        name: 'Updated School',
        address: '456 New St',
      };

      const updated = await service.updateSchool(school.id, updates, matchingContext);

      expect(updated.name).toBe('Updated School');
      expect(updated.address).toBe('456 New St');
      expect(updated.contactEmail).toBe('contact@test.com'); // unchanged
    });

    it('should reject update by teacher', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      const updates: SchoolUpdate = {
        name: 'Updated School',
      };

      await expect(
        service.updateSchool(school.id, updates, teacherContext)
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should reject cross-school update by school head', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      const otherSchoolHeadContext: UserContext = {
        userId: 'head2',
        role: UserRole.SCHOOL_HEAD,
        schoolId: 'school2',
        permissions: [],
      };

      const updates: SchoolUpdate = {
        name: 'Hacked School',
      };

      await expect(
        service.updateSchool(school.id, updates, otherSchoolHeadContext)
      ).rejects.toThrow('Cannot update other school data');
    });
  });

  describe('deleteSchool', () => {
    it('should delete school by system admin', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);
      await service.deleteSchool(school.id, systemAdminContext);

      await expect(
        service.getSchool(school.id, systemAdminContext)
      ).rejects.toThrow('School not found');
    });

    it('should reject deletion by school head', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      await expect(
        service.deleteSchool(school.id, schoolHeadContext)
      ).rejects.toThrow('Only system admins can delete schools');
    });
  });

  describe('listSchools', () => {
    it('should list all schools for system admin', async () => {
      const school1: SchoolCreate = {
        name: 'School 1',
        address: '123 Main St',
        contactEmail: 'school1@test.com',
        contactPhone: '555-1111',
      };

      const school2: SchoolCreate = {
        name: 'School 2',
        address: '456 Oak Ave',
        contactEmail: 'school2@test.com',
        contactPhone: '555-2222',
      };

      await service.createSchool(school1, systemAdminContext);
      await service.createSchool(school2, systemAdminContext);

      const schools = await service.listSchools(systemAdminContext);

      expect(schools.length).toBe(2);
      expect(schools.map((s) => s.name)).toContain('School 1');
      expect(schools.map((s) => s.name)).toContain('School 2');
    });

    it('should reject listing by non-admin', async () => {
      await expect(
        service.listSchools(schoolHeadContext)
      ).rejects.toThrow('Only system admins can list all schools');
    });
  });

  describe('updateBranding', () => {
    it('should update school branding', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      // Update context to match the created school
      const matchingContext: UserContext = {
        ...schoolHeadContext,
        schoolId: school.id,
      };

      const branding: BrandingConfig = {
        logoUrl: 'https://example.com/new-logo.png',
        primaryColor: '#00FF00',
        secondaryColor: '#FF00FF',
      };

      const updated = await service.updateBranding(school.id, branding, matchingContext);

      expect(updated.logoUrl).toBe('https://example.com/new-logo.png');
      expect(updated.primaryColor).toBe('#00FF00');
      expect(updated.secondaryColor).toBe('#FF00FF');
    });

    it('should reject branding update by teacher', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      const branding: BrandingConfig = {
        logoUrl: 'https://example.com/logo.png',
      };

      await expect(
        service.updateBranding(school.id, branding, teacherContext)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('getBranding', () => {
    it('should retrieve school branding', async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#FF0000',
      };

      const school = await service.createSchool(schoolData, systemAdminContext);

      // Update context to match the created school
      const matchingContext: UserContext = {
        ...schoolHeadContext,
        schoolId: school.id,
      };

      const branding = await service.getBranding(school.id, matchingContext);

      expect(branding.logoUrl).toBe('https://example.com/logo.png');
      expect(branding.primaryColor).toBe('#FF0000');
    });
  });

  describe('Academic Calendar Management', () => {
    let school: School;
    let matchingContext: UserContext;

    beforeEach(async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };
      school = await service.createSchool(schoolData, systemAdminContext);

      // Update context to match the created school
      matchingContext = {
        ...schoolHeadContext,
        schoolId: school.id,
      };
    });

    it('should add term to calendar', async () => {
      const term: TermCreate = {
        name: 'Fall 2024',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
      };

      const updated = await service.addTerm(school.id, term, matchingContext);

      expect(updated.academicCalendar.terms.length).toBe(1);
      expect(updated.academicCalendar.terms[0].name).toBe('Fall 2024');
    });

    it('should reject invalid term dates', async () => {
      const term: TermCreate = {
        name: 'Invalid Term',
        startDate: new Date('2024-12-20'),
        endDate: new Date('2024-09-01'),
      };

      await expect(
        service.addTerm(school.id, term, matchingContext)
      ).rejects.toThrow('Start date must be before end date');
    });

    it('should remove term from calendar', async () => {
      const term: TermCreate = {
        name: 'Fall 2024',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
      };

      const updated = await service.addTerm(school.id, term, matchingContext);
      const termId = updated.academicCalendar.terms[0].id;

      const removed = await service.removeTerm(school.id, termId, matchingContext);

      expect(removed.academicCalendar.terms.length).toBe(0);
    });

    it('should add holiday to calendar', async () => {
      const holiday: HolidayCreate = {
        name: 'Thanksgiving',
        date: new Date('2024-11-28'),
      };

      const updated = await service.addHoliday(school.id, holiday, matchingContext);

      expect(updated.academicCalendar.holidays.length).toBe(1);
      expect(updated.academicCalendar.holidays[0].name).toBe('Thanksgiving');
    });

    it('should remove holiday from calendar', async () => {
      const holiday: HolidayCreate = {
        name: 'Thanksgiving',
        date: new Date('2024-11-28'),
      };

      const updated = await service.addHoliday(school.id, holiday, matchingContext);
      const holidayId = updated.academicCalendar.holidays[0].id;

      const removed = await service.removeHoliday(school.id, holidayId, matchingContext);

      expect(removed.academicCalendar.holidays.length).toBe(0);
    });

    it('should update complete academic calendar', async () => {
      const calendar: AcademicCalendar = {
        schoolId: school.id,
        academicYearStart: new Date('2024-08-15'),
        academicYearEnd: new Date('2025-06-15'),
        terms: [
          {
            id: 'term1',
            name: 'Fall 2024',
            startDate: new Date('2024-08-15'),
            endDate: new Date('2024-12-20'),
          },
        ],
        holidays: [
          {
            id: 'holiday1',
            name: 'Labor Day',
            date: new Date('2024-09-02'),
          },
        ],
      };

      const updated = await service.updateAcademicCalendar(
        school.id,
        calendar,
        matchingContext
      );

      expect(updated.academicCalendar.academicYearStart).toEqual(new Date('2024-08-15'));
      expect(updated.academicCalendar.terms.length).toBe(1);
      expect(updated.academicCalendar.holidays.length).toBe(1);
    });

    it('should reject invalid calendar dates', async () => {
      const calendar: AcademicCalendar = {
        schoolId: school.id,
        academicYearStart: new Date('2025-06-15'),
        academicYearEnd: new Date('2024-08-15'),
        terms: [],
        holidays: [],
      };

      await expect(
        service.updateAcademicCalendar(school.id, calendar, matchingContext)
      ).rejects.toThrow('Start date must be before end date');
    });
  });

  describe('Grading Scale Management', () => {
    let school: School;
    let matchingContext: UserContext;

    beforeEach(async () => {
      const schoolData: SchoolCreate = {
        name: 'Test School',
        address: '123 Main St',
        contactEmail: 'contact@test.com',
        contactPhone: '555-1234',
      };
      school = await service.createSchool(schoolData, systemAdminContext);

      // Update context to match the created school
      matchingContext = {
        ...schoolHeadContext,
        schoolId: school.id,
      };
    });

    it('should update grading scale', async () => {
      const gradingScale: GradingScale = {
        schoolId: school.id,
        name: 'Custom Scale',
        ranges: [
          { minScore: 93, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 },
          { minScore: 85, maxScore: 92, letterGrade: 'B', gpaValue: 3.0 },
          { minScore: 77, maxScore: 84, letterGrade: 'C', gpaValue: 2.0 },
          { minScore: 70, maxScore: 76, letterGrade: 'D', gpaValue: 1.0 },
          { minScore: 0, maxScore: 69, letterGrade: 'F', gpaValue: 0.0 },
        ],
      };

      const updated = await service.updateGradingScale(
        school.id,
        gradingScale,
        matchingContext
      );

      expect(updated.gradingScale.name).toBe('Custom Scale');
      expect(updated.gradingScale.ranges.length).toBe(5);
    });

    it('should reject overlapping grade ranges', async () => {
      const gradingScale: GradingScale = {
        schoolId: school.id,
        name: 'Invalid Scale',
        ranges: [
          { minScore: 90, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 },
          { minScore: 85, maxScore: 95, letterGrade: 'B', gpaValue: 3.0 }, // overlaps with A
        ],
      };

      await expect(
        service.updateGradingScale(school.id, gradingScale, matchingContext)
      ).rejects.toThrow('Overlapping ranges detected');
    });

    it('should add grade range', async () => {
      // First, clear the existing ranges and add non-overlapping ones
      const newScale: GradingScale = {
        schoolId: school.id,
        name: 'Test Scale',
        ranges: [
          { minScore: 90, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 },
          { minScore: 80, maxScore: 89, letterGrade: 'B', gpaValue: 3.0 },
        ],
      };

      await service.updateGradingScale(school.id, newScale, matchingContext);

      // Now add a new range that doesn't overlap
      const range = {
        minScore: 70,
        maxScore: 79,
        letterGrade: 'C',
        gpaValue: 2.0,
      };

      const updated = await service.addGradeRange(school.id, range, matchingContext);

      expect(updated.gradingScale.ranges.length).toBe(3);
      expect(updated.gradingScale.ranges.some((r) => r.letterGrade === 'C')).toBe(true);
    });

    it('should remove grade range', async () => {
      const initialRanges = school.gradingScale.ranges.length;
      const updated = await service.removeGradeRange(school.id, 0, matchingContext);

      expect(updated.gradingScale.ranges.length).toBe(initialRanges - 1);
    });

    it('should reject invalid range index', async () => {
      await expect(
        service.removeGradeRange(school.id, 999, matchingContext)
      ).rejects.toThrow('Invalid range index');
    });
  });

  describe('School Data Isolation Middleware', () => {
    it('should allow system admin to access any school', () => {
      expect(() => {
        service.enforceSchoolIsolation(systemAdminContext, 'any-school-id');
      }).not.toThrow();
    });

    it('should allow user to access their own school', () => {
      expect(() => {
        service.enforceSchoolIsolation(schoolHeadContext, 'school1');
      }).not.toThrow();
    });

    it('should reject cross-school access', () => {
      expect(() => {
        service.enforceSchoolIsolation(schoolHeadContext, 'school2');
      }).toThrow('Cross-school access not allowed');
    });
  });
});
