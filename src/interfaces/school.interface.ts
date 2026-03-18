// School Service Interface
import {
  School,
  AcademicCalendar,
  GradingScale,
  Term,
  Holiday,
  GradeRange,
} from '../models';
import { UserContext } from './auth.interface';

export interface SchoolService {
  // School CRUD operations
  createSchool(school: SchoolCreate, adminContext: UserContext): Promise<School>;
  getSchool(schoolId: string, requestorContext: UserContext): Promise<School>;
  updateSchool(
    schoolId: string,
    updates: SchoolUpdate,
    adminContext: UserContext
  ): Promise<School>;
  deleteSchool(schoolId: string, adminContext: UserContext): Promise<void>;
  listSchools(adminContext: UserContext): Promise<School[]>;

  // Custom branding configuration
  updateBranding(
    schoolId: string,
    branding: BrandingConfig,
    adminContext: UserContext
  ): Promise<School>;
  getBranding(schoolId: string, requestorContext: UserContext): Promise<BrandingConfig>;

  // Academic calendar management
  updateAcademicCalendar(
    schoolId: string,
    calendar: AcademicCalendar,
    adminContext: UserContext
  ): Promise<School>;
  getAcademicCalendar(
    schoolId: string,
    requestorContext: UserContext
  ): Promise<AcademicCalendar>;
  addTerm(
    schoolId: string,
    term: TermCreate,
    adminContext: UserContext
  ): Promise<School>;
  removeTerm(
    schoolId: string,
    termId: string,
    adminContext: UserContext
  ): Promise<School>;
  addHoliday(
    schoolId: string,
    holiday: HolidayCreate,
    adminContext: UserContext
  ): Promise<School>;
  removeHoliday(
    schoolId: string,
    holidayId: string,
    adminContext: UserContext
  ): Promise<School>;

  // Grading scale configuration
  updateGradingScale(
    schoolId: string,
    gradingScale: GradingScale,
    adminContext: UserContext
  ): Promise<School>;
  getGradingScale(
    schoolId: string,
    requestorContext: UserContext
  ): Promise<GradingScale>;
  addGradeRange(
    schoolId: string,
    range: GradeRange,
    adminContext: UserContext
  ): Promise<School>;
  removeGradeRange(
    schoolId: string,
    rangeIndex: number,
    adminContext: UserContext
  ): Promise<School>;
}

export interface SchoolCreate {
  name: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface SchoolUpdate {
  name?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface BrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TermCreate {
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface HolidayCreate {
  name: string;
  date: Date;
}

// Middleware context for school data isolation
export interface SchoolContext {
  schoolId: string;
  userId: string;
  role: string;
}
