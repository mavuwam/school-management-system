// School Service Implementation
import {
  School,
  AcademicCalendar,
  GradingScale,
  Term,
  Holiday,
  GradeRange,
  UserRole,
} from '../models';
import {
  SchoolService as ISchoolService,
  SchoolCreate,
  SchoolUpdate,
  BrandingConfig,
  TermCreate,
  HolidayCreate,
} from '../interfaces/school.interface';
import { UserContext } from '../interfaces/auth.interface';

// In-memory storage (in production, use a database)
const schools = new Map<string, School>();

export class SchoolService implements ISchoolService {
  /**
   * Create a new school instance
   * Requirements: 6.1
   */
  async createSchool(
    school: SchoolCreate,
    adminContext: UserContext
  ): Promise<School> {
    // Only system admins can create schools
    if (adminContext.role !== UserRole.SYSTEM_ADMIN) {
      throw new Error('Access denied: Only system admins can create schools');
    }

    // Validate required fields
    if (!school.name || !school.address || !school.contactEmail || !school.contactPhone) {
      throw new Error('Missing required fields: name, address, contactEmail, contactPhone');
    }

    // Generate unique ID
    const schoolId = `school_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create default academic calendar
    const defaultCalendar: AcademicCalendar = {
      schoolId,
      academicYearStart: new Date(new Date().getFullYear(), 8, 1), // September 1
      academicYearEnd: new Date(new Date().getFullYear() + 1, 5, 30), // June 30
      terms: [],
      holidays: [],
    };

    // Create default grading scale (standard 0-100 scale)
    const defaultGradingScale: GradingScale = {
      schoolId,
      name: 'Standard Scale',
      ranges: [
        { minScore: 90, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 },
        { minScore: 80, maxScore: 89, letterGrade: 'B', gpaValue: 3.0 },
        { minScore: 70, maxScore: 79, letterGrade: 'C', gpaValue: 2.0 },
        { minScore: 60, maxScore: 69, letterGrade: 'D', gpaValue: 1.0 },
        { minScore: 0, maxScore: 59, letterGrade: 'F', gpaValue: 0.0 },
      ],
    };

    const newSchool: School = {
      id: schoolId,
      name: school.name,
      address: school.address,
      contactEmail: school.contactEmail,
      contactPhone: school.contactPhone,
      logoUrl: school.logoUrl,
      primaryColor: school.primaryColor,
      secondaryColor: school.secondaryColor,
      academicCalendar: defaultCalendar,
      gradingScale: defaultGradingScale,
      createdAt: new Date(),
    };

    schools.set(schoolId, newSchool);
    return newSchool;
  }

  /**
   * Get school by ID with access control
   * Requirements: 6.1, 6.3
   */
  async getSchool(
    schoolId: string,
    requestorContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Enforce school data isolation
    if (
      requestorContext.role !== UserRole.SYSTEM_ADMIN &&
      requestorContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot access other school data');
    }

    return school;
  }

  /**
   * Update school basic information
   * Requirements: 6.1
   */
  async updateSchool(
    schoolId: string,
    updates: SchoolUpdate,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can update school info
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school data');
    }

    // Apply updates
    if (updates.name !== undefined) school.name = updates.name;
    if (updates.address !== undefined) school.address = updates.address;
    if (updates.contactEmail !== undefined) school.contactEmail = updates.contactEmail;
    if (updates.contactPhone !== undefined) school.contactPhone = updates.contactPhone;

    schools.set(schoolId, school);
    return school;
  }

  /**
   * Delete school instance
   * Requirements: 6.1
   */
  async deleteSchool(
    schoolId: string,
    adminContext: UserContext
  ): Promise<void> {
    // Only system admins can delete schools
    if (adminContext.role !== UserRole.SYSTEM_ADMIN) {
      throw new Error('Access denied: Only system admins can delete schools');
    }

    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    schools.delete(schoolId);
  }

  /**
   * List all schools (system admin only)
   * Requirements: 6.1
   */
  async listSchools(adminContext: UserContext): Promise<School[]> {
    // Only system admins can list all schools
    if (adminContext.role !== UserRole.SYSTEM_ADMIN) {
      throw new Error('Access denied: Only system admins can list all schools');
    }

    return Array.from(schools.values());
  }

  /**
   * Update school branding configuration
   * Requirements: 6.4
   */
  async updateBranding(
    schoolId: string,
    branding: BrandingConfig,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can update branding
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school branding');
    }

    // Apply branding updates
    if (branding.logoUrl !== undefined) school.logoUrl = branding.logoUrl;
    if (branding.primaryColor !== undefined) school.primaryColor = branding.primaryColor;
    if (branding.secondaryColor !== undefined) school.secondaryColor = branding.secondaryColor;

    schools.set(schoolId, school);
    return school;
  }

  /**
   * Get school branding configuration
   * Requirements: 6.4
   */
  async getBranding(
    schoolId: string,
    requestorContext: UserContext
  ): Promise<BrandingConfig> {
    const school = await this.getSchool(schoolId, requestorContext);

    return {
      logoUrl: school.logoUrl,
      primaryColor: school.primaryColor,
      secondaryColor: school.secondaryColor,
    };
  }

  /**
   * Update academic calendar
   * Requirements: 6.5
   */
  async updateAcademicCalendar(
    schoolId: string,
    calendar: AcademicCalendar,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can update calendar
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school calendar');
    }

    // Validate calendar
    if (calendar.academicYearStart >= calendar.academicYearEnd) {
      throw new Error('Invalid calendar: Start date must be before end date');
    }

    // Ensure schoolId matches
    calendar.schoolId = schoolId;

    school.academicCalendar = calendar;
    schools.set(schoolId, school);
    return school;
  }

  /**
   * Get academic calendar
   * Requirements: 6.5
   */
  async getAcademicCalendar(
    schoolId: string,
    requestorContext: UserContext
  ): Promise<AcademicCalendar> {
    const school = await this.getSchool(schoolId, requestorContext);
    return school.academicCalendar;
  }

  /**
   * Add term to academic calendar
   * Requirements: 6.5
   */
  async addTerm(
    schoolId: string,
    term: TermCreate,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can add terms
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school calendar');
    }

    // Validate term dates
    if (term.startDate >= term.endDate) {
      throw new Error('Invalid term: Start date must be before end date');
    }

    // Generate unique term ID
    const termId = `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTerm: Term = {
      id: termId,
      name: term.name,
      startDate: term.startDate,
      endDate: term.endDate,
    };

    school.academicCalendar.terms.push(newTerm);
    schools.set(schoolId, school);
    return school;
  }

  /**
   * Remove term from academic calendar
   * Requirements: 6.5
   */
  async removeTerm(
    schoolId: string,
    termId: string,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can remove terms
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school calendar');
    }

    const termIndex = school.academicCalendar.terms.findIndex((t) => t.id === termId);
    if (termIndex === -1) {
      throw new Error('Term not found');
    }

    school.academicCalendar.terms.splice(termIndex, 1);
    schools.set(schoolId, school);
    return school;
  }

  /**
   * Add holiday to academic calendar
   * Requirements: 6.5
   */
  async addHoliday(
    schoolId: string,
    holiday: HolidayCreate,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can add holidays
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school calendar');
    }

    // Generate unique holiday ID
    const holidayId = `holiday_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newHoliday: Holiday = {
      id: holidayId,
      name: holiday.name,
      date: holiday.date,
    };

    school.academicCalendar.holidays.push(newHoliday);
    schools.set(schoolId, school);
    return school;
  }

  /**
   * Remove holiday from academic calendar
   * Requirements: 6.5
   */
  async removeHoliday(
    schoolId: string,
    holidayId: string,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can remove holidays
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school calendar');
    }

    const holidayIndex = school.academicCalendar.holidays.findIndex((h) => h.id === holidayId);
    if (holidayIndex === -1) {
      throw new Error('Holiday not found');
    }

    school.academicCalendar.holidays.splice(holidayIndex, 1);
    schools.set(schoolId, school);
    return school;
  }

  /**
   * Update grading scale
   * Requirements: 6.5
   */
  async updateGradingScale(
    schoolId: string,
    gradingScale: GradingScale,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can update grading scale
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school grading scale');
    }

    // Validate grading scale ranges
    this.validateGradingScale(gradingScale);

    // Ensure schoolId matches
    gradingScale.schoolId = schoolId;

    school.gradingScale = gradingScale;
    schools.set(schoolId, school);
    return school;
  }

  /**
   * Get grading scale
   * Requirements: 6.5
   */
  async getGradingScale(
    schoolId: string,
    requestorContext: UserContext
  ): Promise<GradingScale> {
    const school = await this.getSchool(schoolId, requestorContext);
    return school.gradingScale;
  }

  /**
   * Add grade range to grading scale
   * Requirements: 6.5
   */
  async addGradeRange(
    schoolId: string,
    range: GradeRange,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can add grade ranges
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school grading scale');
    }

    // Validate range
    if (range.minScore >= range.maxScore) {
      throw new Error('Invalid range: minScore must be less than maxScore');
    }

    school.gradingScale.ranges.push(range);

    // Validate the complete grading scale
    this.validateGradingScale(school.gradingScale);

    schools.set(schoolId, school);
    return school;
  }

  /**
   * Remove grade range from grading scale
   * Requirements: 6.5
   */
  async removeGradeRange(
    schoolId: string,
    rangeIndex: number,
    adminContext: UserContext
  ): Promise<School> {
    const school = schools.get(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // Only school heads and system admins can remove grade ranges
    if (
      adminContext.role !== UserRole.SYSTEM_ADMIN &&
      adminContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // School heads can only update their own school
    if (
      adminContext.role === UserRole.SCHOOL_HEAD &&
      adminContext.schoolId !== schoolId
    ) {
      throw new Error('Access denied: Cannot update other school grading scale');
    }

    if (rangeIndex < 0 || rangeIndex >= school.gradingScale.ranges.length) {
      throw new Error('Invalid range index');
    }

    school.gradingScale.ranges.splice(rangeIndex, 1);
    schools.set(schoolId, school);
    return school;
  }

  /**
   * Validate grading scale for overlaps and gaps
   */
  private validateGradingScale(gradingScale: GradingScale): void {
    const ranges = gradingScale.ranges;

    // Check for overlaps
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const range1 = ranges[i];
        const range2 = ranges[j];

        // Check if ranges overlap
        if (
          (range1.minScore <= range2.maxScore && range1.maxScore >= range2.minScore) ||
          (range2.minScore <= range1.maxScore && range2.maxScore >= range1.minScore)
        ) {
          throw new Error(
            `Grading scale validation failed: Overlapping ranges detected (${range1.letterGrade} and ${range2.letterGrade})`
          );
        }
      }
    }

    // Validate individual ranges
    for (const range of ranges) {
      if (range.minScore >= range.maxScore) {
        throw new Error(
          `Grading scale validation failed: Invalid range for ${range.letterGrade} (minScore must be less than maxScore)`
        );
      }
    }
  }

  /**
   * Middleware: Enforce school data isolation
   * Requirements: 6.3
   */
  public enforceSchoolIsolation(
    requestorContext: UserContext,
    targetSchoolId: string
  ): void {
    // System admins can access any school
    if (requestorContext.role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    // All other users can only access their own school
    if (requestorContext.schoolId !== targetSchoolId) {
      throw new Error('Access denied: Cross-school access not allowed');
    }
  }

  // Public methods for testing/setup
  public addSchool(school: School): void {
    schools.set(school.id, school);
  }

  public clearAll(): void {
    schools.clear();
  }

  public getSchoolDirect(schoolId: string): School | undefined {
    return schools.get(schoolId);
  }
}

// Export singleton instance
export const schoolService = new SchoolService();
