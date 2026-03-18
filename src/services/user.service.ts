// User Service Implementation
import {
  Student,
  Teacher,
  Parent,
  User,
  UserRole,
  AcademicProgress,
  PaymentRecord,
  Assignment,
  Timetable,
  GradeAverages,
  GradeTrend,
} from '../models';
import {
  UserProfile,
  StudentProfile,
  TeacherView,
  TeacherFilters,
  SchoolHeadView,
  AdminFilters,
  ParentView,
  ChildProfile,
  StudentSummary,
  AcademicSummary,
  PaymentSummary,
  UserService as IUserService,
} from '../interfaces/user.interface';
import { UserContext } from '../interfaces/auth.interface';

// In-memory storage (in production, use a database)
const users = new Map<string, User>();
const students = new Map<string, Student>();
const teachers = new Map<string, Teacher>();
const parents = new Map<string, Parent>();
const academicProgress = new Map<string, AcademicProgress>();
const paymentRecords = new Map<string, PaymentRecord[]>();
const assignments = new Map<string, Assignment[]>();
const timetables = new Map<string, Timetable>();

export class UserService implements IUserService {
  /**
   * Get user profile by ID with role-based access control
   * Requirements: 2.1, 3.1, 4.1, 5.1
   */
  async getUserProfile(
    userId: string,
    requestorContext: UserContext
  ): Promise<UserProfile> {
    const user = users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if requestor has permission to view this profile
    if (!this.canAccessProfile(userId, requestorContext)) {
      throw new Error('Access denied: Insufficient permissions');
    }

    // Verify school isolation
    if (
      requestorContext.role !== UserRole.SYSTEM_ADMIN &&
      user.schoolId !== requestorContext.schoolId
    ) {
      throw new Error('Access denied: Cross-school access not allowed');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    };
  }

  /**
   * Get complete student profile with all related data
   * Requirements: 2.1
   */
  async getStudentProfile(
    studentId: string,
    requestorContext: UserContext
  ): Promise<StudentProfile> {
    const student = students.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Check access permissions
    if (!this.canAccessStudentData(studentId, requestorContext)) {
      throw new Error('Access denied: Cannot access this student profile');
    }

    // Verify school isolation
    if (
      requestorContext.role !== UserRole.SYSTEM_ADMIN &&
      student.schoolId !== requestorContext.schoolId
    ) {
      throw new Error('Access denied: Cross-school access not allowed');
    }

    // Get all related data
    const progress = academicProgress.get(studentId) || this.createEmptyProgress(studentId);
    const payments = paymentRecords.get(studentId) || [];
    const pending = this.getPendingWorkForStudent(studentId);
    const timetable = timetables.get(studentId) || this.createEmptyTimetable(student.schoolId);

    return {
      student,
      academicProgress: progress,
      paymentRecords: payments,
      pendingWork: pending,
      timetable,
    };
  }

  /**
   * Get teacher view with assigned students and filtering
   * Requirements: 3.1, 3.3
   */
  async getTeacherView(
    teacherId: string,
    filters: TeacherFilters
  ): Promise<TeacherView> {
    const teacher = teachers.get(teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // Get all students assigned to this teacher
    let assignedStudents = this.getStudentsForTeacher(teacherId);

    // Apply filters
    if (filters.classId) {
      assignedStudents = assignedStudents.filter((s) =>
        this.isStudentInClass(s.id, filters.classId!)
      );
    }

    if (filters.subjectId) {
      assignedStudents = assignedStudents.filter((s) =>
        this.isStudentInSubject(s.id, filters.subjectId!)
      );
    }

    if (filters.performanceLevel) {
      assignedStudents = assignedStudents.filter((s) => {
        const progress = academicProgress.get(s.id);
        if (!progress) return false;
        return this.matchesPerformanceLevel(
          progress.averages.overall,
          filters.performanceLevel!
        );
      });
    }

    // Build student summaries
    const studentSummaries: StudentSummary[] = assignedStudents.map((student) => {
      const progress = academicProgress.get(student.id) || this.createEmptyProgress(student.id);
      const pending = this.getPendingWorkForStudent(student.id);

      return {
        student,
        academicProgress: progress,
        pendingWorkCount: pending.length,
      };
    });

    return {
      teacher,
      students: studentSummaries,
    };
  }

  /**
   * Get school head view with all school data
   * Requirements: 4.1
   */
  async getSchoolHeadView(
    schoolId: string,
    filters: AdminFilters
  ): Promise<SchoolHeadView> {
    // Get all students and teachers in this school
    let schoolStudents = Array.from(students.values()).filter(
      (s) => s.schoolId === schoolId
    );
    const schoolTeachers = Array.from(teachers.values()).filter(
      (t) => t.schoolId === schoolId
    );

    // Apply filters
    if (filters.gradeLevel) {
      schoolStudents = schoolStudents.filter(
        (s) => s.gradeLevel === filters.gradeLevel
      );
    }

    if (filters.classId) {
      schoolStudents = schoolStudents.filter((s) =>
        this.isStudentInClass(s.id, filters.classId!)
      );
    }

    if (filters.subjectId) {
      schoolStudents = schoolStudents.filter((s) =>
        this.isStudentInSubject(s.id, filters.subjectId!)
      );
    }

    if (filters.performanceThreshold !== undefined) {
      schoolStudents = schoolStudents.filter((s) => {
        const progress = academicProgress.get(s.id);
        if (!progress) return false;
        return progress.averages.overall >= filters.performanceThreshold!;
      });
    }

    // Calculate academic summary
    const academicSummary = this.calculateAcademicSummary(schoolStudents);

    // Calculate payment summary
    const paymentSummary = this.calculatePaymentSummary(schoolStudents);

    return {
      schoolId,
      students: schoolStudents,
      teachers: schoolTeachers,
      academicSummary,
      paymentSummary,
    };
  }

  /**
   * Get parent view with linked children's data
   * Requirements: 5.1
   */
  async getParentView(parentId: string): Promise<ParentView> {
    const parent = parents.get(parentId);
    if (!parent) {
      throw new Error('Parent not found');
    }

    // Get all linked children
    const children: ChildProfile[] = [];

    for (const childId of parent.childrenIds) {
      const student = students.get(childId);
      if (!student) continue;

      // Verify school isolation - parent can only see children in their school
      if (student.schoolId !== parent.schoolId) {
        continue;
      }

      const progress = academicProgress.get(childId) || this.createEmptyProgress(childId);
      const payments = paymentRecords.get(childId) || [];
      const pending = this.getPendingWorkForStudent(childId);
      const timetable = timetables.get(childId) || this.createEmptyTimetable(student.schoolId);

      children.push({
        student,
        academicProgress: progress,
        paymentRecords: payments,
        pendingWork: pending,
        timetable,
      });
    }

    return {
      parent,
      children,
    };
  }

  /**
   * Link parent to student with validation
   * Requirements: 5.1, 12.4
   */
  async linkParentToStudent(
    parentId: string,
    studentId: string
  ): Promise<void> {
    const parent = parents.get(parentId);
    if (!parent) {
      throw new Error('Parent not found');
    }

    const student = students.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Verify same school
    if (parent.schoolId !== student.schoolId) {
      throw new Error('Cannot link parent and student from different schools');
    }

    // Add student to parent's children if not already linked
    if (!parent.childrenIds.includes(studentId)) {
      parent.childrenIds.push(studentId);
    }

    // Add parent to student's parents if not already linked
    if (!student.parentIds.includes(parentId)) {
      student.parentIds.push(parentId);
    }
  }

  // Helper methods

  private canAccessProfile(
    userId: string,
    requestorContext: UserContext
  ): boolean {
    // Users can always access their own profile
    if (requestorContext.userId === userId) {
      return true;
    }

    // School heads can access any profile in their school
    if (requestorContext.role === UserRole.SCHOOL_HEAD) {
      return true;
    }

    // System admins can access any profile
    if (requestorContext.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    return false;
  }

  private canAccessStudentData(
    studentId: string,
    requestorContext: UserContext
  ): boolean {
    const student = students.get(studentId);
    if (!student) return false;

    // Students can access their own data
    if (requestorContext.userId === studentId) {
      return true;
    }

    // Teachers can access assigned students
    if (requestorContext.role === UserRole.TEACHER) {
      const teacher = teachers.get(requestorContext.userId);
      if (teacher) {
        return this.isStudentAssignedToTeacher(studentId, teacher.id);
      }
    }

    // Parents can access their children's data
    if (requestorContext.role === UserRole.PARENT) {
      const parent = parents.get(requestorContext.userId);
      if (parent) {
        return parent.childrenIds.includes(studentId);
      }
    }

    // School heads can access all students in their school
    if (requestorContext.role === UserRole.SCHOOL_HEAD) {
      return student.schoolId === requestorContext.schoolId;
    }

    // System admins can access all data
    if (requestorContext.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    return false;
  }

  private getStudentsForTeacher(teacherId: string): Student[] {
    const teacher = teachers.get(teacherId);
    if (!teacher) return [];

    // Get all students in the teacher's assigned classes
    return Array.from(students.values()).filter((student) =>
      this.isStudentAssignedToTeacher(student.id, teacherId)
    );
  }

  private isStudentAssignedToTeacher(
    studentId: string,
    teacherId: string
  ): boolean {
    const teacher = teachers.get(teacherId);
    if (!teacher) return false;

    // Check if student is in any of the teacher's assigned classes
    const student = students.get(studentId);
    if (!student) return false;

    // For simplicity, we'll check if the student's grade level matches
    // any of the teacher's assigned classes
    // In a real system, this would involve more complex class membership logic
    return teacher.assignedClasses.some((classId) =>
      this.isStudentInClass(studentId, classId)
    );
  }

  private isStudentInClass(studentId: string, classId: string): boolean {
    // In a real system, this would query a class membership table
    // For now, we'll use a simple heuristic based on student data
    const student = students.get(studentId);
    if (!student) return false;

    // Check if any assignments for this student are from this class
    const studentAssignments = assignments.get(studentId) || [];
    return studentAssignments.some((a) => a.classId === classId);
  }

  private isStudentInSubject(studentId: string, subjectId: string): boolean {
    // Check if student has grades or assignments in this subject
    const progress = academicProgress.get(studentId);
    if (!progress) return false;

    return progress.grades.some((g) => g.subjectId === subjectId);
  }

  private matchesPerformanceLevel(
    average: number,
    level: 'high' | 'medium' | 'low'
  ): boolean {
    if (level === 'high') return average >= 80;
    if (level === 'medium') return average >= 60 && average < 80;
    if (level === 'low') return average < 60;
    return false;
  }

  private getPendingWorkForStudent(studentId: string): Assignment[] {
    const allAssignments = assignments.get(studentId) || [];
    // Filter for pending assignments (not submitted, not overdue)
    return allAssignments.filter((a) => {
      const now = new Date();
      return a.dueDate > now;
    });
  }

  private calculateAcademicSummary(students: Student[]): AcademicSummary {
    let totalGrade = 0;
    let totalAttendance = 0;
    let atRiskCount = 0;
    let studentsWithData = 0;

    for (const student of students) {
      const progress = academicProgress.get(student.id);
      if (progress) {
        totalGrade += progress.averages.overall;
        studentsWithData++;

        // Calculate attendance rate
        const presentCount = progress.attendance.filter(
          (a) => a.status === 'PRESENT'
        ).length;
        const totalDays = progress.attendance.length;
        if (totalDays > 0) {
          totalAttendance += (presentCount / totalDays) * 100;
        }

        if (progress.flaggedForIntervention) {
          atRiskCount++;
        }
      }
    }

    return {
      totalStudents: students.length,
      averageGrade: studentsWithData > 0 ? totalGrade / studentsWithData : 0,
      attendanceRate:
        studentsWithData > 0 ? totalAttendance / studentsWithData : 0,
      atRiskStudents: atRiskCount,
    };
  }

  private calculatePaymentSummary(students: Student[]): PaymentSummary {
    let totalOutstanding = 0;
    let totalCollected = 0;
    let overdueCount = 0;

    for (const student of students) {
      const payments = paymentRecords.get(student.id) || [];

      for (const payment of payments) {
        if (payment.status === 'COMPLETED') {
          totalCollected += payment.amount;
        } else if (payment.status === 'PENDING') {
          totalOutstanding += payment.amount;

          // Check if overdue (more than 30 days)
          const daysSince =
            (Date.now() - payment.date.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 30) {
            overdueCount++;
          }
        }
      }
    }

    return {
      totalOutstanding,
      totalCollected,
      overdueCount,
    };
  }

  private createEmptyProgress(studentId: string): AcademicProgress {
    return {
      studentId,
      grades: [],
      attendance: [],
      averages: {
        overall: 0,
        bySubject: new Map(),
        trend: GradeTrend.STABLE,
      },
      flaggedForIntervention: false,
      teacherComments: [],
    };
  }

  private createEmptyTimetable(schoolId: string): Timetable {
    return {
      id: `timetable_${schoolId}_empty`,
      schoolId,
      name: 'Empty Timetable',
      effectiveFrom: new Date(),
      periods: [],
    };
  }

  // Public methods for testing/setup
  public addUser(user: User): void {
    users.set(user.id, user);
  }

  public addStudent(student: Student): void {
    students.set(student.id, student);
    users.set(student.id, student);
  }

  public addTeacher(teacher: Teacher): void {
    teachers.set(teacher.id, teacher);
    users.set(teacher.id, teacher);
  }

  public addParent(parent: Parent): void {
    parents.set(parent.id, parent);
    users.set(parent.id, parent);
  }

  public setAcademicProgress(
    studentId: string,
    progress: AcademicProgress
  ): void {
    academicProgress.set(studentId, progress);
  }

  public setPaymentRecords(
    studentId: string,
    records: PaymentRecord[]
  ): void {
    paymentRecords.set(studentId, records);
  }

  public setAssignments(studentId: string, studentAssignments: Assignment[]): void {
    assignments.set(studentId, studentAssignments);
  }

  public setTimetable(studentId: string, timetable: Timetable): void {
    timetables.set(studentId, timetable);
  }

  public clearAll(): void {
    users.clear();
    students.clear();
    teachers.clear();
    parents.clear();
    academicProgress.clear();
    paymentRecords.clear();
    assignments.clear();
    timetables.clear();
  }
}

// Export singleton instance
export const userService = new UserService();
