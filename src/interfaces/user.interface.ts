// User Service Interface
import {
  Student,
  Teacher,
  Parent,
  AcademicProgress,
  PaymentRecord,
  Assignment,
  Timetable,
} from '../models';
import { UserContext } from './auth.interface';

// Profile types for different user roles

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  schoolId: string;
}

export interface StudentProfile {
  student: Student;
  academicProgress: AcademicProgress;
  paymentRecords: PaymentRecord[];
  pendingWork: Assignment[];
  timetable: Timetable;
}

export interface TeacherFilters {
  classId?: string;
  subjectId?: string;
  performanceLevel?: 'high' | 'medium' | 'low';
}

export interface TeacherView {
  teacher: Teacher;
  students: StudentSummary[];
}

export interface StudentSummary {
  student: Student;
  academicProgress: AcademicProgress;
  pendingWorkCount: number;
}

export interface AdminFilters {
  gradeLevel?: string;
  classId?: string;
  subjectId?: string;
  performanceThreshold?: number;
}

export interface SchoolHeadView {
  schoolId: string;
  students: Student[];
  teachers: Teacher[];
  academicSummary: AcademicSummary;
  paymentSummary: PaymentSummary;
}

export interface AcademicSummary {
  totalStudents: number;
  averageGrade: number;
  attendanceRate: number;
  atRiskStudents: number;
}

export interface PaymentSummary {
  totalOutstanding: number;
  totalCollected: number;
  overdueCount: number;
}

export interface ParentView {
  parent: Parent;
  children: ChildProfile[];
}

export interface ChildProfile {
  student: Student;
  academicProgress: AcademicProgress;
  paymentRecords: PaymentRecord[];
  pendingWork: Assignment[];
  timetable: Timetable;
}

export interface UserService {
  getUserProfile(
    userId: string,
    requestorContext: UserContext
  ): Promise<UserProfile>;

  getStudentProfile(
    studentId: string,
    requestorContext: UserContext
  ): Promise<StudentProfile>;

  getTeacherView(
    teacherId: string,
    filters: TeacherFilters
  ): Promise<TeacherView>;

  getSchoolHeadView(
    schoolId: string,
    filters: AdminFilters
  ): Promise<SchoolHeadView>;

  getParentView(parentId: string): Promise<ParentView>;

  linkParentToStudent(parentId: string, studentId: string): Promise<void>;
}
