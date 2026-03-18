// Academic Service Interface
import {
  GradeEntry,
  AttendanceEntry,
  AcademicProgress,
  GradeAverages,
  Student,
} from '../models';
import { UserContext } from './auth.interface';

export interface AcademicService {
  // Record a grade for a student
  recordGrade(grade: GradeEntryCreate, teacherContext: UserContext): Promise<void>;

  // Get academic progress for a student
  getAcademicProgress(
    studentId: string,
    requestorContext: UserContext
  ): Promise<AcademicProgress>;

  // Record attendance
  recordAttendance(
    attendance: AttendanceEntryCreate,
    recordedByContext: UserContext
  ): Promise<void>;

  // Calculate cumulative averages
  calculateAverages(studentId: string, subjectId?: string): Promise<GradeAverages>;

  // Get students flagged for intervention
  getAtRiskStudents(schoolId: string, threshold: number): Promise<Student[]>;

  // Get academic history with audit trail
  getAcademicHistory(studentId: string): Promise<AcademicHistoryEntry[]>;
}

export interface GradeEntryCreate {
  studentId: string;
  teacherId: string;
  subjectId: string;
  assignmentId?: string;
  score: number;
  maxScore: number;
  gradingScale: string;
}

export interface AttendanceEntryCreate {
  studentId: string;
  date: Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  notes?: string;
}

export interface AcademicHistoryEntry {
  id: string;
  studentId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  performedBy: string;
  changes?: Record<string, any>;
}
