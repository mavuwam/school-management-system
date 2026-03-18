// Academic Service Property-Based Tests
import * as fc from 'fast-check';
import { AcademicService } from './academic.service';
import { Student, UserRole, AttendanceStatus } from '../models';
import { UserContext } from '../interfaces/auth.interface';
import { GradeEntryCreate, AttendanceEntryCreate } from '../interfaces/academic.interface';

describe('AcademicService Property-Based Tests', () => {
  let service: AcademicService;

  beforeEach(() => {
    service = new AcademicService();
    service.clearAll();
  });

  afterEach(() => {
    service.clearAll();
  });

  // Generators for property-based testing

  const schoolIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `school_${s}`);
  const userIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `user_${s}`);
  const subjectIdArb = fc.constantFrom('math', 'science', 'english', 'history', 'art');

  const studentArb = (schoolId: string, studentId: string): fc.Arbitrary<Student> =>
    fc.record({
      id: fc.constant(studentId),
      username: fc.constant(studentId),
      passwordHash: fc.constant('hash'),
      email: fc.emailAddress(),
      role: fc.constant(UserRole.STUDENT),
      schoolId: fc.constant(schoolId),
      mfaEnabled: fc.constant(false),
      createdAt: fc.date(),
      firstName: fc.string({ minLength: 1, maxLength: 20 }),
      lastName: fc.string({ minLength: 1, maxLength: 20 }),
      dateOfBirth: fc.date({ min: new Date('2005-01-01'), max: new Date('2015-12-31') }),
      enrollmentDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
      gradeLevel: fc.constantFrom('6', '7', '8', '9', '10', '11', '12'),
      parentIds: fc.constant([]),
    });

  const teacherContextArb = (schoolId: string): fc.Arbitrary<UserContext> =>
    fc.record({
      userId: userIdArb,
      role: fc.constant(UserRole.TEACHER),
      schoolId: fc.constant(schoolId),
      permissions: fc.constant([]),
    });

  const gradeEntryCreateArb = (
    studentId: string,
    teacherId: string
  ): fc.Arbitrary<GradeEntryCreate> =>
    fc.record({
      studentId: fc.constant(studentId),
      teacherId: fc.constant(teacherId),
      subjectId: subjectIdArb,
      assignmentId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      score: fc.integer({ min: 0, max: 100 }),
      maxScore: fc.constant(100),
      gradingScale: fc.constant('standard'),
    });

  const attendanceEntryCreateArb = (studentId: string): fc.Arbitrary<AttendanceEntryCreate> =>
    fc.record({
      studentId: fc.constant(studentId),
      date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
      status: fc.constantFrom('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') as fc.Arbitrary<
        'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
      >,
      notes: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
    });

  // Property 12: Grade Update Round Trip
  // **Validates: Requirements 3.4**
  test('Property 12: Grade Update Round Trip - saved grade should be retrievable with same value', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        userIdArb,
        studentArb('school1', 'student1'),
        teacherContextArb('school1'),
        gradeEntryCreateArb('student1', 'teacher1'),
        async (schoolId, studentId, teacherId, student, teacherContext, gradeEntry) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup - use generated values
          const actualStudent = {
            ...student,
            id: studentId,
            schoolId: schoolId,
          };
          service.addStudent(actualStudent);
          service.setGradingScale(schoolId, 0, 100);

          const actualTeacherContext = {
            ...teacherContext,
            schoolId: schoolId,
          };

          const actualGradeEntry = {
            ...gradeEntry,
            studentId: studentId,
            teacherId: teacherId,
          };

          // Record grade
          await service.recordGrade(actualGradeEntry, actualTeacherContext);

          // Retrieve grade through academic progress
          const progress = await service.getAcademicProgress(studentId, actualTeacherContext);

          // Verify grade was saved correctly
          expect(progress.grades).toHaveLength(1);
          expect(progress.grades[0].studentId).toBe(studentId);
          expect(progress.grades[0].score).toBe(actualGradeEntry.score);
          expect(progress.grades[0].maxScore).toBe(actualGradeEntry.maxScore);
          expect(progress.grades[0].subjectId).toBe(actualGradeEntry.subjectId);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 25: Cumulative Average Calculation
  // **Validates: Requirements 7.2**
  test('Property 25: Cumulative Average Calculation - calculated average should equal arithmetic mean', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        userIdArb,
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        async (schoolId, studentId, teacherId, scores) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const student: Student = {
            id: studentId,
            username: studentId,
            passwordHash: 'hash',
            email: 'test@test.com',
            role: UserRole.STUDENT,
            schoolId: schoolId,
            mfaEnabled: false,
            createdAt: new Date(),
            firstName: 'Test',
            lastName: 'Student',
            dateOfBirth: new Date('2010-01-01'),
            enrollmentDate: new Date('2024-09-01'),
            gradeLevel: '9',
            parentIds: [],
          };
          service.addStudent(student);
          service.setGradingScale(schoolId, 0, 100);

          const teacherContext: UserContext = {
            userId: teacherId,
            role: UserRole.TEACHER,
            schoolId: schoolId,
            permissions: [],
          };

          // Record all grades
          for (const score of scores) {
            await service.recordGrade(
              {
                studentId: studentId,
                teacherId: teacherId,
                subjectId: 'math',
                score: score,
                maxScore: 100,
                gradingScale: 'standard',
              },
              teacherContext
            );
          }

          // Calculate averages
          const averages = await service.calculateAverages(studentId);

          // Calculate expected average
          const expectedAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;

          // Verify average matches arithmetic mean
          expect(averages.overall).toBeCloseTo(expectedAverage, 5);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 27: At-Risk Student Flagging
  // **Validates: Requirements 7.4**
  test('Property 27: At-Risk Student Flagging - students should be flagged iff below threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: 100 })
          ),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 50, max: 80 }),
        async (schoolId, scores, threshold) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup students with different scores
          const teacherContext: UserContext = {
            userId: 'teacher1',
            role: UserRole.TEACHER,
            schoolId: schoolId,
            permissions: [],
          };

          service.setGradingScale(schoolId, 0, 100);

          const studentScores: [string, number][] = [];
          for (let i = 0; i < scores.length; i++) {
            const studentId = `student_${i}`;
            const score = scores[i][0];
            studentScores.push([studentId, score]);

            const student: Student = {
              id: studentId,
              username: studentId,
              passwordHash: 'hash',
              email: `${studentId}@test.com`,
              role: UserRole.STUDENT,
              schoolId: schoolId,
              mfaEnabled: false,
              createdAt: new Date(),
              firstName: 'Test',
              lastName: 'Student',
              dateOfBirth: new Date('2010-01-01'),
              enrollmentDate: new Date('2024-09-01'),
              gradeLevel: '9',
              parentIds: [],
            };
            service.addStudent(student);

            // Record a grade for this student
            await service.recordGrade(
              {
                studentId: studentId,
                teacherId: 'teacher1',
                subjectId: 'math',
                score: score,
                maxScore: 100,
                gradingScale: 'standard',
              },
              teacherContext
            );
          }

          // Get at-risk students
          const atRiskStudents = await service.getAtRiskStudents(schoolId, threshold);
          const atRiskIds = new Set(atRiskStudents.map((s) => s.id));

          // Verify each student's flagging status
          for (const [studentId, score] of studentScores) {
            const shouldBeFlagged = score < threshold;
            const isFlagged = atRiskIds.has(studentId);
            expect(isFlagged).toBe(shouldBeFlagged);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 28: Academic History Audit Trail
  // **Validates: Requirements 7.5, 12.3**
  test('Property 28: Academic History Audit Trail - all changes should have audit entries with timestamp and user', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        userIdArb,
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 5 }),
        fc.array(
          fc.constantFrom('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') as fc.Arbitrary<
            'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
          >,
          { minLength: 1, maxLength: 5 }
        ),
        async (schoolId, studentId, teacherId, scores, attendanceStatuses) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const student: Student = {
            id: studentId,
            username: studentId,
            passwordHash: 'hash',
            email: 'test@test.com',
            role: UserRole.STUDENT,
            schoolId: schoolId,
            mfaEnabled: false,
            createdAt: new Date(),
            firstName: 'Test',
            lastName: 'Student',
            dateOfBirth: new Date('2010-01-01'),
            enrollmentDate: new Date('2024-09-01'),
            gradeLevel: '9',
            parentIds: [],
          };
          service.addStudent(student);
          service.setGradingScale(schoolId, 0, 100);

          const teacherContext: UserContext = {
            userId: teacherId,
            role: UserRole.TEACHER,
            schoolId: schoolId,
            permissions: [],
          };

          // Record grades
          for (const score of scores) {
            await service.recordGrade(
              {
                studentId: studentId,
                teacherId: teacherId,
                subjectId: 'math',
                score: score,
                maxScore: 100,
                gradingScale: 'standard',
              },
              teacherContext
            );
          }

          // Record attendance
          for (let i = 0; i < attendanceStatuses.length; i++) {
            await service.recordAttendance(
              {
                studentId: studentId,
                date: new Date(`2024-01-${i + 1}`),
                status: attendanceStatuses[i],
              },
              teacherContext
            );
          }

          // Get audit history
          const history = await service.getAcademicHistory(studentId);

          // Verify audit trail completeness
          const expectedEntries = scores.length + attendanceStatuses.length;
          expect(history.length).toBe(expectedEntries);

          // Verify all entries have required fields
          for (const entry of history) {
            expect(entry.timestamp).toBeInstanceOf(Date);
            expect(entry.performedBy).toBe(teacherId);
            expect(entry.studentId).toBe(studentId);
            expect(['GRADE_RECORDED', 'ATTENDANCE_RECORDED']).toContain(entry.action);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 26: Attendance Record Completeness
  // **Validates: Requirements 7.3**
  test('Property 26: Attendance Record Completeness - attendance records should contain all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        userIdArb,
        fc.array(attendanceEntryCreateArb('student1'), { minLength: 1, maxLength: 10 }),
        async (schoolId, studentId, teacherId, attendanceEntries) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const student: Student = {
            id: studentId,
            username: studentId,
            passwordHash: 'hash',
            email: 'test@test.com',
            role: UserRole.STUDENT,
            schoolId: schoolId,
            mfaEnabled: false,
            createdAt: new Date(),
            firstName: 'Test',
            lastName: 'Student',
            dateOfBirth: new Date('2010-01-01'),
            enrollmentDate: new Date('2024-09-01'),
            gradeLevel: '9',
            parentIds: [],
          };
          service.addStudent(student);

          const teacherContext: UserContext = {
            userId: teacherId,
            role: UserRole.TEACHER,
            schoolId: schoolId,
            permissions: [],
          };

          // Record all attendance entries
          for (const entry of attendanceEntries) {
            await service.recordAttendance(
              {
                ...entry,
                studentId: studentId,
              },
              teacherContext
            );
          }

          // Get attendance records
          const records = service.getAttendanceDirect(studentId);

          // Verify all records have required fields
          expect(records.length).toBe(attendanceEntries.length);
          for (const record of records) {
            expect(record.date).toBeInstanceOf(Date);
            expect(record.status).toBeDefined();
            expect(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']).toContain(record.status);
            expect(record.recordedBy).toBe(teacherId);
            expect(record.recordedAt).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 14: Academic Progress Aggregation Correctness
  // **Validates: Requirements 4.2**
  test('Property 14: Academic Progress Aggregation Correctness - aggregated data should accurately reflect underlying grades', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        userIdArb,
        fc.array(
          fc.tuple(subjectIdArb, fc.integer({ min: 0, max: 100 })),
          { minLength: 1, maxLength: 15 }
        ),
        async (schoolId, studentId, teacherId, subjectScores) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const student: Student = {
            id: studentId,
            username: studentId,
            passwordHash: 'hash',
            email: 'test@test.com',
            role: UserRole.STUDENT,
            schoolId: schoolId,
            mfaEnabled: false,
            createdAt: new Date(),
            firstName: 'Test',
            lastName: 'Student',
            dateOfBirth: new Date('2010-01-01'),
            enrollmentDate: new Date('2024-09-01'),
            gradeLevel: '9',
            parentIds: [],
          };
          service.addStudent(student);
          service.setGradingScale(schoolId, 0, 100);

          const teacherContext: UserContext = {
            userId: teacherId,
            role: UserRole.TEACHER,
            schoolId: schoolId,
            permissions: [],
          };

          // Record all grades
          for (const [subject, score] of subjectScores) {
            await service.recordGrade(
              {
                studentId: studentId,
                teacherId: teacherId,
                subjectId: subject,
                score: score,
                maxScore: 100,
                gradingScale: 'standard',
              },
              teacherContext
            );
          }

          // Get academic progress
          const progress = await service.getAcademicProgress(studentId, teacherContext);

          // Verify grade count
          expect(progress.grades.length).toBe(subjectScores.length);

          // Calculate expected overall average
          const expectedOverall =
            subjectScores.reduce((sum, [_, score]) => sum + score, 0) / subjectScores.length;
          expect(progress.averages.overall).toBeCloseTo(expectedOverall, 5);

          // Verify subject averages
          const subjectMap = new Map<string, number[]>();
          for (const [subject, score] of subjectScores) {
            const scores = subjectMap.get(subject) || [];
            scores.push(score);
            subjectMap.set(subject, scores);
          }

          for (const [subject, scores] of subjectMap.entries()) {
            const expectedSubjectAvg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            const actualSubjectAvg = progress.averages.bySubject.get(subject);
            expect(actualSubjectAvg).toBeCloseTo(expectedSubjectAvg, 5);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 17: Attendance Statistics Calculation
  // **Validates: Requirements 4.5**
  test('Property 17: Attendance Statistics Calculation - statistics should accurately reflect attendance data', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        userIdArb,
        fc.array(
          fc.constantFrom('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') as fc.Arbitrary<
            'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
          >,
          { minLength: 1, maxLength: 20 }
        ),
        async (schoolId, studentId, teacherId, statuses) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const student: Student = {
            id: studentId,
            username: studentId,
            passwordHash: 'hash',
            email: 'test@test.com',
            role: UserRole.STUDENT,
            schoolId: schoolId,
            mfaEnabled: false,
            createdAt: new Date(),
            firstName: 'Test',
            lastName: 'Student',
            dateOfBirth: new Date('2010-01-01'),
            enrollmentDate: new Date('2024-09-01'),
            gradeLevel: '9',
            parentIds: [],
          };
          service.addStudent(student);

          const teacherContext: UserContext = {
            userId: teacherId,
            role: UserRole.TEACHER,
            schoolId: schoolId,
            permissions: [],
          };

          // Record all attendance
          for (let i = 0; i < statuses.length; i++) {
            await service.recordAttendance(
              {
                studentId: studentId,
                date: new Date(`2024-01-${(i % 28) + 1}`),
                status: statuses[i],
              },
              teacherContext
            );
          }

          // Get attendance records
          const records = service.getAttendanceDirect(studentId);

          // Calculate expected statistics
          const presentCount = statuses.filter((s) => s === 'PRESENT').length;
          const absentCount = statuses.filter((s) => s === 'ABSENT').length;
          const lateCount = statuses.filter((s) => s === 'LATE').length;
          const excusedCount = statuses.filter((s) => s === 'EXCUSED').length;

          // Verify record counts match
          expect(records.length).toBe(statuses.length);

          // Verify status distribution
          const actualPresent = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
          const actualAbsent = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
          const actualLate = records.filter((r) => r.status === AttendanceStatus.LATE).length;
          const actualExcused = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;

          expect(actualPresent).toBe(presentCount);
          expect(actualAbsent).toBe(absentCount);
          expect(actualLate).toBe(lateCount);
          expect(actualExcused).toBe(excusedCount);
        }
      ),
      { numRuns: 10 }
    );
  });
});
