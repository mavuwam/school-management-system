// Academic Service Implementation
import {
  GradeEntry,
  AttendanceEntry,
  AcademicProgress,
  GradeAverages,
  Student,
  UserRole,
  GradeTrend,
  AttendanceStatus,
} from '../models';
import { UserContext } from '../interfaces/auth.interface';
import {
  AcademicService as IAcademicService,
  GradeEntryCreate,
  AttendanceEntryCreate,
  AcademicHistoryEntry,
} from '../interfaces/academic.interface';

export class AcademicService implements IAcademicService {
  private grades: Map<string, GradeEntry[]> = new Map(); // studentId -> grades
  private attendance: Map<string, AttendanceEntry[]> = new Map(); // studentId -> attendance
  private auditLog: AcademicHistoryEntry[] = [];
  private students: Map<string, Student> = new Map(); // studentId -> student
  private gradingScales: Map<string, { minScore: number; maxScore: number }> = new Map(); // schoolId -> scale

  /**
   * Record a grade for a student with validation and audit logging
   * Validates: Requirements 2.2, 3.2, 7.1
   */
  async recordGrade(
    grade: GradeEntryCreate,
    teacherContext: UserContext
  ): Promise<void> {
    // Validate teacher role
    if (teacherContext.role !== UserRole.TEACHER && teacherContext.role !== UserRole.SCHOOL_HEAD) {
      throw new Error('Only teachers and school heads can record grades');
    }

    // Validate student exists and belongs to same school
    const student = this.students.get(grade.studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    if (student.schoolId !== teacherContext.schoolId) {
      throw new Error('Cannot record grades for students in other schools');
    }

    // Validate grade against grading scale
    const scale = this.gradingScales.get(teacherContext.schoolId);
    if (scale) {
      if (grade.score < scale.minScore || grade.score > scale.maxScore) {
        throw new Error(
          `Grade score must be between ${scale.minScore} and ${scale.maxScore}`
        );
      }
      if (grade.maxScore < scale.minScore || grade.maxScore > scale.maxScore) {
        throw new Error(
          `Max score must be between ${scale.minScore} and ${scale.maxScore}`
        );
      }
    }

    // Validate score doesn't exceed maxScore
    if (grade.score > grade.maxScore) {
      throw new Error('Score cannot exceed max score');
    }

    // Create grade entry
    const gradeEntry: GradeEntry = {
      id: `grade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: grade.studentId,
      teacherId: grade.teacherId,
      subjectId: grade.subjectId,
      assignmentId: grade.assignmentId,
      score: grade.score,
      maxScore: grade.maxScore,
      gradingScale: grade.gradingScale,
      enteredAt: new Date(),
      enteredBy: teacherContext.userId,
    };

    // Store grade
    const studentGrades = this.grades.get(grade.studentId) || [];
    studentGrades.push(gradeEntry);
    this.grades.set(grade.studentId, studentGrades);

    // Create audit log entry
    const auditEntry: AcademicHistoryEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: grade.studentId,
      action: 'GRADE_RECORDED',
      entityType: 'GRADE',
      entityId: gradeEntry.id,
      timestamp: new Date(),
      performedBy: teacherContext.userId,
      changes: {
        score: grade.score,
        maxScore: grade.maxScore,
        subjectId: grade.subjectId,
      },
    };

    this.auditLog.push(auditEntry);
  }

  /**
   * Get academic progress for a student with data aggregation
   * Validates: Requirements 4.2
   */
  async getAcademicProgress(
    studentId: string,
    requestorContext: UserContext
  ): Promise<AcademicProgress> {
    // Validate student exists
    const student = this.students.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Validate access permissions
    if (requestorContext.role === UserRole.STUDENT) {
      if (requestorContext.userId !== studentId) {
        throw new Error('Students can only view their own progress');
      }
    } else if (requestorContext.role === UserRole.PARENT) {
      // Parents can only view their children's progress
      const parent = this.students.get(requestorContext.userId);
      if (!parent || !(parent as any).childrenIds?.includes(studentId)) {
        throw new Error('Parents can only view their children\'s progress');
      }
    } else if (
      requestorContext.role !== UserRole.TEACHER &&
      requestorContext.role !== UserRole.SCHOOL_HEAD &&
      requestorContext.role !== UserRole.SYSTEM_ADMIN
    ) {
      throw new Error('Insufficient permissions to view academic progress');
    }

    // Enforce school isolation (except for system admins)
    if (
      requestorContext.role !== UserRole.SYSTEM_ADMIN &&
      student.schoolId !== requestorContext.schoolId
    ) {
      throw new Error('Cannot access student data from other schools');
    }

    // Get grades and attendance
    const grades = this.grades.get(studentId) || [];
    const attendance = this.attendance.get(studentId) || [];

    // Calculate averages
    const averages = await this.calculateAverages(studentId);

    // Determine if student is flagged for intervention
    const threshold = 70; // Default threshold
    const flaggedForIntervention = averages.overall < threshold;

    return {
      studentId,
      grades,
      attendance,
      averages,
      flaggedForIntervention,
      teacherComments: [], // Not implemented in this task
    };
  }

  /**
   * Record attendance with timestamp and user attribution
   * Validates: Requirements 7.3
   */
  async recordAttendance(
    attendance: AttendanceEntryCreate,
    recordedByContext: UserContext
  ): Promise<void> {
    // Validate permissions
    if (
      recordedByContext.role !== UserRole.TEACHER &&
      recordedByContext.role !== UserRole.SCHOOL_HEAD
    ) {
      throw new Error('Only teachers and school heads can record attendance');
    }

    // Validate student exists and belongs to same school
    const student = this.students.get(attendance.studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    if (student.schoolId !== recordedByContext.schoolId) {
      throw new Error('Cannot record attendance for students in other schools');
    }

    // Validate status
    const validStatuses: AttendanceStatus[] = [
      AttendanceStatus.PRESENT,
      AttendanceStatus.ABSENT,
      AttendanceStatus.LATE,
      AttendanceStatus.EXCUSED,
    ];
    if (!validStatuses.includes(attendance.status as AttendanceStatus)) {
      throw new Error('Invalid attendance status');
    }

    // Create attendance entry
    const attendanceEntry: AttendanceEntry = {
      id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: attendance.studentId,
      date: attendance.date,
      status: attendance.status as AttendanceStatus,
      recordedBy: recordedByContext.userId,
      recordedAt: new Date(),
      notes: attendance.notes,
    };

    // Store attendance
    const studentAttendance = this.attendance.get(attendance.studentId) || [];
    studentAttendance.push(attendanceEntry);
    this.attendance.set(attendance.studentId, studentAttendance);

    // Create audit log entry
    const auditEntry: AcademicHistoryEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: attendance.studentId,
      action: 'ATTENDANCE_RECORDED',
      entityType: 'ATTENDANCE',
      entityId: attendanceEntry.id,
      timestamp: new Date(),
      performedBy: recordedByContext.userId,
      changes: {
        date: attendance.date,
        status: attendance.status,
      },
    };

    this.auditLog.push(auditEntry);
  }

  /**
   * Calculate cumulative grade averages
   * Validates: Requirements 7.2
   */
  async calculateAverages(
    studentId: string,
    subjectId?: string
  ): Promise<GradeAverages> {
    const grades = this.grades.get(studentId) || [];

    if (grades.length === 0) {
      return {
        overall: 0,
        bySubject: new Map(),
        trend: GradeTrend.STABLE,
      };
    }

    // Filter by subject if specified
    const relevantGrades = subjectId
      ? grades.filter((g) => g.subjectId === subjectId)
      : grades;

    if (relevantGrades.length === 0) {
      return {
        overall: 0,
        bySubject: new Map(),
        trend: GradeTrend.STABLE,
      };
    }

    // Calculate overall average (as percentage)
    const totalPercentage = relevantGrades.reduce((sum, grade) => {
      return sum + (grade.score / grade.maxScore) * 100;
    }, 0);
    const overall = totalPercentage / relevantGrades.length;

    // Calculate averages by subject
    const bySubject = new Map<string, number>();
    const subjectGrades = new Map<string, GradeEntry[]>();

    for (const grade of relevantGrades) {
      const subjectGradeList = subjectGrades.get(grade.subjectId) || [];
      subjectGradeList.push(grade);
      subjectGrades.set(grade.subjectId, subjectGradeList);
    }

    for (const [subject, subjectGradeList] of subjectGrades.entries()) {
      const subjectTotal = subjectGradeList.reduce((sum, grade) => {
        return sum + (grade.score / grade.maxScore) * 100;
      }, 0);
      bySubject.set(subject, subjectTotal / subjectGradeList.length);
    }

    // Calculate trend (compare first half to second half)
    let trend = GradeTrend.STABLE;
    if (relevantGrades.length >= 4) {
      const midpoint = Math.floor(relevantGrades.length / 2);
      const firstHalf = relevantGrades.slice(0, midpoint);
      const secondHalf = relevantGrades.slice(midpoint);

      const firstHalfAvg =
        firstHalf.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
        firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
        secondHalf.length;

      const difference = secondHalfAvg - firstHalfAvg;
      if (difference > 5) {
        trend = GradeTrend.IMPROVING;
      } else if (difference < -5) {
        trend = GradeTrend.DECLINING;
      }
    }

    return {
      overall,
      bySubject,
      trend,
    };
  }

  /**
   * Get students flagged for intervention based on threshold
   * Validates: Requirements 7.4
   */
  async getAtRiskStudents(schoolId: string, threshold: number): Promise<Student[]> {
    const atRiskStudents: Student[] = [];

    for (const [studentId, student] of this.students.entries()) {
      if (student.schoolId !== schoolId) {
        continue;
      }

      const grades = this.grades.get(studentId) || [];
      if (grades.length === 0) {
        continue; // Skip students with no grades
      }

      const averages = await this.calculateAverages(studentId);
      if (averages.overall < threshold) {
        atRiskStudents.push(student);
      }
    }

    return atRiskStudents;
  }

  /**
   * Get academic history with complete audit trail
   * Validates: Requirements 7.5, 12.3
   */
  async getAcademicHistory(studentId: string): Promise<AcademicHistoryEntry[]> {
    return this.auditLog.filter((entry) => entry.studentId === studentId);
  }

  // Helper methods for testing

  public addStudent(student: Student): void {
    this.students.set(student.id, student);
  }

  public setGradingScale(
    schoolId: string,
    minScore: number,
    maxScore: number
  ): void {
    this.gradingScales.set(schoolId, { minScore, maxScore });
  }

  public clearAll(): void {
    this.grades.clear();
    this.attendance.clear();
    this.auditLog = [];
    this.students.clear();
    this.gradingScales.clear();
  }

  public getGradesDirect(studentId: string): GradeEntry[] {
    return this.grades.get(studentId) || [];
  }

  public getAttendanceDirect(studentId: string): AttendanceEntry[] {
    return this.attendance.get(studentId) || [];
  }
}
