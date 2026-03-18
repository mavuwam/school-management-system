// User Service Property-Based Tests
import * as fc from 'fast-check';
import { UserService } from './user.service';
import {
  Student,
  UserRole,
  AcademicProgress,
  PaymentRecord,
  Assignment,
  Timetable,
  GradeTrend,
  AttendanceStatus,
  PaymentStatus,
  PaymentMethod,
  Teacher,
  Parent,
} from '../models';
import { UserContext } from '../interfaces/auth.interface';

describe('UserService Property-Based Tests', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    service.clearAll();
  });

  afterEach(() => {
    service.clearAll();
  });

  // Generators for property-based testing

  const schoolIdArb = fc.constantFrom('school1', 'school2', 'school3');

  const userIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `user_${s}`);

  const studentArb = (schoolId: string, studentId: string): fc.Arbitrary<Student> =>
    fc.record({
      id: fc.constant(studentId),
      username: fc.constant(`student_${studentId}`),
      passwordHash: fc.constant('hash'),
      email: fc.constant(`${studentId}@school.com`),
      role: fc.constant(UserRole.STUDENT),
      schoolId: fc.constant(schoolId),
      mfaEnabled: fc.constant(false),
      createdAt: fc.date(),
      firstName: fc.string({ minLength: 1, maxLength: 20 }),
      lastName: fc.string({ minLength: 1, maxLength: 20 }),
      dateOfBirth: fc.date({ min: new Date('2000-01-01'), max: new Date('2010-12-31') }),
      enrollmentDate: fc.date({ min: new Date('2015-01-01'), max: new Date('2023-12-31') }),
      gradeLevel: fc.constantFrom('9', '10', '11', '12'),
      parentIds: fc.constant([]),
    });

  const academicProgressArb = (studentId: string): fc.Arbitrary<AcademicProgress> =>
    fc.record({
      studentId: fc.constant(studentId),
      grades: fc.array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          studentId: fc.constant(studentId),
          teacherId: fc.string({ minLength: 1, maxLength: 10 }),
          subjectId: fc.constantFrom('math', 'science', 'english', 'history'),
          score: fc.integer({ min: 0, max: 100 }),
          maxScore: fc.constant(100),
          gradingScale: fc.constant('standard'),
          enteredAt: fc.date(),
          enteredBy: fc.string({ minLength: 1, maxLength: 10 }),
        }),
        { minLength: 0, maxLength: 10 }
      ),
      attendance: fc.array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          studentId: fc.constant(studentId),
          date: fc.date(),
          status: fc.constantFrom(
            AttendanceStatus.PRESENT,
            AttendanceStatus.ABSENT,
            AttendanceStatus.LATE,
            AttendanceStatus.EXCUSED
          ),
          recordedBy: fc.string({ minLength: 1, maxLength: 10 }),
          recordedAt: fc.date(),
        }),
        { minLength: 0, maxLength: 20 }
      ),
      averages: fc.record({
        overall: fc.integer({ min: 0, max: 100 }),
        bySubject: fc.constant(new Map()),
        trend: fc.constantFrom(GradeTrend.IMPROVING, GradeTrend.STABLE, GradeTrend.DECLINING),
      }),
      flaggedForIntervention: fc.boolean(),
      teacherComments: fc.constant([]),
    });

  const paymentRecordArb = (studentId: string): fc.Arbitrary<PaymentRecord> =>
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 10 }),
      studentId: fc.constant(studentId),
      amount: fc.integer({ min: 100, max: 10000 }),
      date: fc.date(),
      paymentMethod: fc.constantFrom(
        PaymentMethod.CASH,
        PaymentMethod.CHECK,
        PaymentMethod.CARD,
        PaymentMethod.ONLINE,
        PaymentMethod.BANK_TRANSFER
      ),
      purpose: fc.constantFrom('Tuition', 'Fees', 'Books', 'Activities'),
      status: fc.constantFrom(
        PaymentStatus.PENDING,
        PaymentStatus.COMPLETED,
        PaymentStatus.FAILED,
        PaymentStatus.REFUNDED
      ),
      recordedBy: fc.string({ minLength: 1, maxLength: 10 }),
      recordedAt: fc.date(),
    });

  const assignmentArb = (studentId: string): fc.Arbitrary<Assignment> =>
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 10 }),
      title: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.string({ minLength: 1, maxLength: 200 }),
      teacherId: fc.string({ minLength: 1, maxLength: 10 }),
      subjectId: fc.constantFrom('math', 'science', 'english', 'history'),
      classId: fc.string({ minLength: 1, maxLength: 10 }),
      dueDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
      pointValue: fc.integer({ min: 10, max: 100 }),
      createdAt: fc.date(),
      assignedStudents: fc.constant([studentId]),
    });

  const timetableArb = (schoolId: string): fc.Arbitrary<Timetable> =>
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 10 }),
      schoolId: fc.constant(schoolId),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      effectiveFrom: fc.date(),
      periods: fc.array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          dayOfWeek: fc.integer({ min: 0, max: 6 }),
          startTime: fc.constantFrom('08:00', '09:00', '10:00', '11:00', '13:00', '14:00'),
          endTime: fc.constantFrom('09:00', '10:00', '11:00', '12:00', '14:00', '15:00'),
          subjectId: fc.constantFrom('math', 'science', 'english', 'history'),
          teacherId: fc.string({ minLength: 1, maxLength: 10 }),
          roomId: fc.string({ minLength: 1, maxLength: 10 }),
          classId: fc.string({ minLength: 1, maxLength: 10 }),
          recurring: fc.boolean(),
        }),
        { minLength: 0, maxLength: 10 }
      ),
    });

  const teacherArb = (schoolId: string, teacherId: string): fc.Arbitrary<Teacher> =>
    fc.record({
      id: fc.constant(teacherId),
      username: fc.constant(`teacher_${teacherId}`),
      passwordHash: fc.constant('hash'),
      email: fc.constant(`${teacherId}@school.com`),
      role: fc.constant(UserRole.TEACHER),
      schoolId: fc.constant(schoolId),
      mfaEnabled: fc.constant(false),
      createdAt: fc.date(),
      firstName: fc.string({ minLength: 1, maxLength: 20 }),
      lastName: fc.string({ minLength: 1, maxLength: 20 }),
      subjects: fc.array(fc.constantFrom('math', 'science', 'english', 'history'), {
        minLength: 1,
        maxLength: 3,
      }),
      assignedClasses: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
        minLength: 1,
        maxLength: 5,
      }),
    });

  const parentArb = (schoolId: string, parentId: string, childrenIds: string[]): fc.Arbitrary<Parent> =>
    fc.record({
      id: fc.constant(parentId),
      username: fc.constant(`parent_${parentId}`),
      passwordHash: fc.constant('hash'),
      email: fc.constant(`${parentId}@school.com`),
      role: fc.constant(UserRole.PARENT),
      schoolId: fc.constant(schoolId),
      mfaEnabled: fc.constant(false),
      createdAt: fc.date(),
      firstName: fc.string({ minLength: 1, maxLength: 20 }),
      lastName: fc.string({ minLength: 1, maxLength: 20 }),
      childrenIds: fc.constant(childrenIds),
    });

  /**
   * Feature: school-management-system, Property 6: Student Profile Completeness
   * **Validates: Requirements 2.1**
   *
   * For any student profile view, it should contain all required components:
   * academic progress, payment records, status, pending work, and timetable.
   */
  test('Property 6: Student profile contains all required components', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        async (schoolId, studentId) => {
          // Clear service for each iteration
          service.clearAll();
          
          // Setup
          const student = fc.sample(studentArb(schoolId, studentId), 1)[0];
          const progress = fc.sample(academicProgressArb(studentId), 1)[0];
          const payments = fc.sample(fc.array(paymentRecordArb(studentId), { minLength: 0, maxLength: 5 }), 1)[0];
          const assignments = fc.sample(fc.array(assignmentArb(studentId), { minLength: 0, maxLength: 5 }), 1)[0];
          const timetable = fc.sample(timetableArb(schoolId), 1)[0];

          service.addStudent(student);
          service.setAcademicProgress(studentId, progress);
          service.setPaymentRecords(studentId, payments);
          service.setAssignments(studentId, assignments);
          service.setTimetable(studentId, timetable);

          const context: UserContext = {
            userId: studentId,
            role: UserRole.STUDENT,
            schoolId,
            permissions: [],
          };

          // Execute
          const profile = await service.getStudentProfile(studentId, context);

          // Verify all required components are present
          expect(profile.student).toBeDefined();
          expect(profile.academicProgress).toBeDefined();
          expect(profile.paymentRecords).toBeDefined();
          expect(profile.pendingWork).toBeDefined();
          expect(profile.timetable).toBeDefined();

          // Verify data integrity
          expect(profile.student.id).toBe(studentId);
          expect(profile.academicProgress.studentId).toBe(studentId);
          expect(profile.timetable.schoolId).toBe(schoolId);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Feature: school-management-system, Property 9: Teacher Access Limited to Assigned Students
   * **Validates: Requirements 3.1**
   *
   * For any teacher view, it should contain information only for students assigned to that teacher,
   * and should not include students from other teachers' classes.
   */
  test('Property 9: Teacher access limited to assigned students', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.array(
          fc.constantFrom('class_a', 'class_b', 'class_c', 'class_d'),
          { minLength: 1, maxLength: 3 }
        ),
        async (schoolId, teacherNum, studentNum, assignedClasses) => {
          // Clear service for each iteration
          service.clearAll();
          
          const teacherId = `teacher_${teacherNum}`;
          const studentId = `student_${studentNum}`;
          
          // Ensure teacher and student IDs are different
          if (teacherId === studentId) return;

          // Setup teacher with assigned classes
          const teacher = fc.sample(teacherArb(schoolId, teacherId), 1)[0];
          teacher.assignedClasses = assignedClasses;
          service.addTeacher(teacher);

          // Setup student assigned to this teacher
          const assignedStudent = fc.sample(studentArb(schoolId, studentId), 1)[0];
          service.addStudent(assignedStudent);

          // Create assignment linking student to teacher's class
          const assignment: Assignment = {
            id: 'a1',
            title: 'Test Assignment',
            description: 'Test',
            teacherId,
            subjectId: 'math',
            classId: assignedClasses[0],
            dueDate: new Date('2025-12-31'),
            pointValue: 100,
            createdAt: new Date(),
            assignedStudents: [studentId],
          };
          service.setAssignments(studentId, [assignment]);

          const progress = fc.sample(academicProgressArb(studentId), 1)[0];
          service.setAcademicProgress(studentId, progress);

          // Setup another student NOT assigned to this teacher
          const otherStudentId = `other_student_${studentNum}`;
          const otherStudent = fc.sample(studentArb(schoolId, otherStudentId), 1)[0];
          service.addStudent(otherStudent);

          // Create assignment for other student with different class
          const otherAssignment: Assignment = {
            id: 'a2',
            title: 'Other Assignment',
            description: 'Test',
            teacherId: 'other_teacher',
            subjectId: 'science',
            classId: 'other_class_xyz',
            dueDate: new Date('2025-12-31'),
            pointValue: 100,
            createdAt: new Date(),
            assignedStudents: [otherStudentId],
          };
          service.setAssignments(otherStudentId, [otherAssignment]);

          // Execute
          const view = await service.getTeacherView(teacherId, {});

          // Verify: should only contain assigned student
          const studentIds = view.students.map((s) => s.student.id);
          expect(studentIds).toContain(studentId);
          expect(studentIds).not.toContain(otherStudentId);

          // Verify: teacher view only contains students from assigned classes
          expect(view.students.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Feature: school-management-system, Property 13: School Head Access Scope
   * **Validates: Requirements 4.1**
   *
   * For any school head view, it should contain data for all students and teachers in that school instance,
   * but should not contain data from other school instances.
   */
  test('Property 13: School head access scope limited to own school', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('school1', 'school2'),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        async (schoolId, numStudents, numTeachers) => {
          // Clear service for each iteration
          service.clearAll();
          
          const otherSchoolId = schoolId === 'school1' ? 'school2' : 'school1';

          // Add students to both schools
          const ownSchoolStudents: string[] = [];
          for (let i = 0; i < numStudents; i++) {
            const studentId = `${schoolId}_student_${i}`;
            const student = fc.sample(studentArb(schoolId, studentId), 1)[0];
            service.addStudent(student);
            ownSchoolStudents.push(studentId);
          }

          const otherSchoolStudents: string[] = [];
          for (let i = 0; i < numStudents; i++) {
            const studentId = `${otherSchoolId}_student_${i}`;
            const student = fc.sample(studentArb(otherSchoolId, studentId), 1)[0];
            service.addStudent(student);
            otherSchoolStudents.push(studentId);
          }

          // Add teachers to both schools
          const ownSchoolTeachers: string[] = [];
          for (let i = 0; i < numTeachers; i++) {
            const teacherId = `${schoolId}_teacher_${i}`;
            const teacher = fc.sample(teacherArb(schoolId, teacherId), 1)[0];
            service.addTeacher(teacher);
            ownSchoolTeachers.push(teacherId);
          }

          const otherSchoolTeachers: string[] = [];
          for (let i = 0; i < numTeachers; i++) {
            const teacherId = `${otherSchoolId}_teacher_${i}`;
            const teacher = fc.sample(teacherArb(otherSchoolId, teacherId), 1)[0];
            service.addTeacher(teacher);
            otherSchoolTeachers.push(teacherId);
          }

          // Execute
          const view = await service.getSchoolHeadView(schoolId, {});

          // Verify: contains all students from own school
          const viewStudentIds = view.students.map((s) => s.id);
          for (const studentId of ownSchoolStudents) {
            expect(viewStudentIds).toContain(studentId);
          }

          // Verify: does not contain students from other school
          for (const studentId of otherSchoolStudents) {
            expect(viewStudentIds).not.toContain(studentId);
          }

          // Verify: contains all teachers from own school
          const viewTeacherIds = view.teachers.map((t) => t.id);
          for (const teacherId of ownSchoolTeachers) {
            expect(viewTeacherIds).toContain(teacherId);
          }

          // Verify: does not contain teachers from other school
          for (const teacherId of otherSchoolTeachers) {
            expect(viewTeacherIds).not.toContain(teacherId);
          }

          // Verify: correct counts
          expect(view.students.length).toBe(numStudents);
          expect(view.teachers.length).toBe(numTeachers);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Feature: school-management-system, Property 18: Parent Access Limited to Linked Children
   * **Validates: Requirements 5.1, 12.4**
   *
   * For any parent view, it should contain information only for children linked to that parent,
   * and should not include information for other students.
   */
  test('Property 18: Parent access limited to linked children', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        fc.integer({ min: 1, max: 1000 }),
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 3 }),
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 3 }),
        async (schoolId, parentNum, linkedChildNums, otherChildNums) => {
          // Clear service for each iteration
          service.clearAll();

          const parentId = `parent_${parentNum}`;
          const linkedChildIds = linkedChildNums.map((n) => `student_${n}`);
          const otherChildIds = otherChildNums.map((n) => `other_student_${n}`);

          // Ensure no overlap between linked and other children
          const overlap = linkedChildIds.some((id) => otherChildIds.includes(id));
          if (overlap) return;

          // Create parent with linked children
          const parent = fc.sample(parentArb(schoolId, parentId, linkedChildIds), 1)[0];
          service.addParent(parent);

          // Create linked children
          for (const childId of linkedChildIds) {
            const student = fc.sample(studentArb(schoolId, childId), 1)[0];
            student.parentIds = [parentId];
            service.addStudent(student);

            const progress = fc.sample(academicProgressArb(childId), 1)[0];
            service.setAcademicProgress(childId, progress);
          }

          // Create other children (not linked to this parent)
          for (const childId of otherChildIds) {
            const student = fc.sample(studentArb(schoolId, childId), 1)[0];
            student.parentIds = [];
            service.addStudent(student);

            const progress = fc.sample(academicProgressArb(childId), 1)[0];
            service.setAcademicProgress(childId, progress);
          }

          // Execute
          const view = await service.getParentView(parentId);

          // Verify: contains all linked children
          const viewChildIds = view.children.map((c) => c.student.id);
          for (const childId of linkedChildIds) {
            expect(viewChildIds).toContain(childId);
          }

          // Verify: does not contain other children
          for (const childId of otherChildIds) {
            expect(viewChildIds).not.toContain(childId);
          }

          // Verify: correct count
          expect(view.children.length).toBe(linkedChildIds.length);

          // Verify: each child has complete data
          for (const childProfile of view.children) {
            expect(childProfile.student).toBeDefined();
            expect(childProfile.academicProgress).toBeDefined();
            expect(childProfile.paymentRecords).toBeDefined();
            expect(childProfile.pendingWork).toBeDefined();
            expect(childProfile.timetable).toBeDefined();
          }
        }
      ),
      { numRuns: 25 }
    );
  });
});
