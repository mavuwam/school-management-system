// Academic Service Unit Tests
import { AcademicService } from './academic.service';
import { Student, UserRole, AttendanceStatus, GradeTrend } from '../models';
import { UserContext } from '../interfaces/auth.interface';
import { GradeEntryCreate, AttendanceEntryCreate } from '../interfaces/academic.interface';

describe('AcademicService', () => {
  let service: AcademicService;
  let teacherContext: UserContext;
  let studentContext: UserContext;
  let student: Student;

  beforeEach(() => {
    service = new AcademicService();

    teacherContext = {
      userId: 'teacher1',
      role: UserRole.TEACHER,
      schoolId: 'school1',
      permissions: [],
    };

    studentContext = {
      userId: 'student1',
      role: UserRole.STUDENT,
      schoolId: 'school1',
      permissions: [],
    };

    student = {
      id: 'student1',
      username: 'student1',
      passwordHash: 'hash',
      email: 'student1@test.com',
      role: UserRole.STUDENT,
      schoolId: 'school1',
      mfaEnabled: false,
      createdAt: new Date(),
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('2010-01-01'),
      enrollmentDate: new Date('2024-09-01'),
      gradeLevel: '9',
      parentIds: [],
    };

    service.addStudent(student);
    service.setGradingScale('school1', 0, 100);
  });

  afterEach(() => {
    service.clearAll();
  });

  describe('recordGrade', () => {
    it('should record a valid grade', async () => {
      const grade: GradeEntryCreate = {
        studentId: 'student1',
        teacherId: 'teacher1',
        subjectId: 'math',
        score: 85,
        maxScore: 100,
        gradingScale: 'standard',
      };

      await service.recordGrade(grade, teacherContext);

      const grades = service.getGradesDirect('student1');
      expect(grades).toHaveLength(1);
      expect(grades[0].score).toBe(85);
      expect(grades[0].maxScore).toBe(100);
      expect(grades[0].enteredBy).toBe('teacher1');
    });

    it('should reject grade from non-teacher', async () => {
      const grade: GradeEntryCreate = {
        studentId: 'student1',
        teacherId: 'teacher1',
        subjectId: 'math',
        score: 85,
        maxScore: 100,
        gradingScale: 'standard',
      };

      await expect(service.recordGrade(grade, studentContext)).rejects.toThrow(
        'Only teachers and school heads can record grades'
      );
    });

    it('should reject grade for non-existent student', async () => {
      const grade: GradeEntryCreate = {
        studentId: 'nonexistent',
        teacherId: 'teacher1',
        subjectId: 'math',
        score: 85,
        maxScore: 100,
        gradingScale: 'standard',
      };

      await expect(service.recordGrade(grade, teacherContext)).rejects.toThrow(
        'Student not found'
      );
    });

    it('should reject grade outside grading scale', async () => {
      const grade: GradeEntryCreate = {
        studentId: 'student1',
        teacherId: 'teacher1',
        subjectId: 'math',
        score: 150,
        maxScore: 100,
        gradingScale: 'standard',
      };

      await expect(service.recordGrade(grade, teacherContext)).rejects.toThrow(
        'Grade score must be between'
      );
    });

    it('should reject score exceeding maxScore', async () => {
      const grade: GradeEntryCreate = {
        studentId: 'student1',
        teacherId: 'teacher1',
        subjectId: 'math',
        score: 95,
        maxScore: 90,
        gradingScale: 'standard',
      };

      await expect(service.recordGrade(grade, teacherContext)).rejects.toThrow(
        'Score cannot exceed max score'
      );
    });

    it('should reject cross-school grade recording', async () => {
      const student2: Student = {
        ...student,
        id: 'student2',
        schoolId: 'school2',
      };
      service.addStudent(student2);

      const grade: GradeEntryCreate = {
        studentId: 'student2',
        teacherId: 'teacher1',
        subjectId: 'math',
        score: 85,
        maxScore: 100,
        gradingScale: 'standard',
      };

      await expect(service.recordGrade(grade, teacherContext)).rejects.toThrow(
        'Cannot record grades for students in other schools'
      );
    });

    it('should create audit log entry when recording grade', async () => {
      const grade: GradeEntryCreate = {
        studentId: 'student1',
        teacherId: 'teacher1',
        subjectId: 'math',
        score: 85,
        maxScore: 100,
        gradingScale: 'standard',
      };

      await service.recordGrade(grade, teacherContext);

      const history = await service.getAcademicHistory('student1');
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('GRADE_RECORDED');
      expect(history[0].performedBy).toBe('teacher1');
    });
  });

  describe('getAcademicProgress', () => {
    it('should return academic progress for a student', async () => {
      const grade: GradeEntryCreate = {
        studentId: 'student1',
        teacherId: 'teacher1',
        subjectId: 'math',
        score: 85,
        maxScore: 100,
        gradingScale: 'standard',
      };

      await service.recordGrade(grade, teacherContext);

      const progress = await service.getAcademicProgress('student1', teacherContext);

      expect(progress.studentId).toBe('student1');
      expect(progress.grades).toHaveLength(1);
      expect(progress.averages.overall).toBe(85);
    });

    it('should allow students to view their own progress', async () => {
      const progress = await service.getAcademicProgress('student1', studentContext);
      expect(progress.studentId).toBe('student1');
    });

    it('should reject students viewing other students progress', async () => {
      const otherStudentContext: UserContext = {
        userId: 'student2',
        role: UserRole.STUDENT,
        schoolId: 'school1',
        permissions: [],
      };

      await expect(
        service.getAcademicProgress('student1', otherStudentContext)
      ).rejects.toThrow('Students can only view their own progress');
    });

    it('should reject cross-school access', async () => {
      const otherSchoolContext: UserContext = {
        userId: 'teacher2',
        role: UserRole.TEACHER,
        schoolId: 'school2',
        permissions: [],
      };

      await expect(
        service.getAcademicProgress('student1', otherSchoolContext)
      ).rejects.toThrow('Cannot access student data from other schools');
    });
  });

  describe('recordAttendance', () => {
    it('should record attendance', async () => {
      const attendance: AttendanceEntryCreate = {
        studentId: 'student1',
        date: new Date('2024-01-15'),
        status: 'PRESENT',
      };

      await service.recordAttendance(attendance, teacherContext);

      const records = service.getAttendanceDirect('student1');
      expect(records).toHaveLength(1);
      expect(records[0].status).toBe(AttendanceStatus.PRESENT);
      expect(records[0].recordedBy).toBe('teacher1');
    });

    it('should reject attendance from non-teacher', async () => {
      const attendance: AttendanceEntryCreate = {
        studentId: 'student1',
        date: new Date('2024-01-15'),
        status: 'PRESENT',
      };

      await expect(service.recordAttendance(attendance, studentContext)).rejects.toThrow(
        'Only teachers and school heads can record attendance'
      );
    });

    it('should reject invalid attendance status', async () => {
      const attendance: AttendanceEntryCreate = {
        studentId: 'student1',
        date: new Date('2024-01-15'),
        status: 'INVALID' as any,
      };

      await expect(service.recordAttendance(attendance, teacherContext)).rejects.toThrow(
        'Invalid attendance status'
      );
    });

    it('should create audit log entry when recording attendance', async () => {
      const attendance: AttendanceEntryCreate = {
        studentId: 'student1',
        date: new Date('2024-01-15'),
        status: 'ABSENT',
      };

      await service.recordAttendance(attendance, teacherContext);

      const history = await service.getAcademicHistory('student1');
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('ATTENDANCE_RECORDED');
    });
  });

  describe('calculateAverages', () => {
    it('should calculate overall average correctly', async () => {
      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'math',
          score: 80,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'science',
          score: 90,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      const averages = await service.calculateAverages('student1');
      expect(averages.overall).toBe(85);
    });

    it('should calculate averages by subject', async () => {
      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'math',
          score: 80,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'math',
          score: 90,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      const averages = await service.calculateAverages('student1');
      expect(averages.bySubject.get('math')).toBe(85);
    });

    it('should return 0 for student with no grades', async () => {
      const averages = await service.calculateAverages('student1');
      expect(averages.overall).toBe(0);
    });

    it('should detect improving trend', async () => {
      // Add 4 grades with improving scores
      for (let i = 0; i < 4; i++) {
        await service.recordGrade(
          {
            studentId: 'student1',
            teacherId: 'teacher1',
            subjectId: 'math',
            score: 60 + i * 10,
            maxScore: 100,
            gradingScale: 'standard',
          },
          teacherContext
        );
      }

      const averages = await service.calculateAverages('student1');
      expect(averages.trend).toBe(GradeTrend.IMPROVING);
    });

    it('should detect declining trend', async () => {
      // Add 4 grades with declining scores
      for (let i = 0; i < 4; i++) {
        await service.recordGrade(
          {
            studentId: 'student1',
            teacherId: 'teacher1',
            subjectId: 'math',
            score: 90 - i * 10,
            maxScore: 100,
            gradingScale: 'standard',
          },
          teacherContext
        );
      }

      const averages = await service.calculateAverages('student1');
      expect(averages.trend).toBe(GradeTrend.DECLINING);
    });
  });

  describe('getAtRiskStudents', () => {
    it('should identify students below threshold', async () => {
      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'math',
          score: 60,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      const atRisk = await service.getAtRiskStudents('school1', 70);
      expect(atRisk).toHaveLength(1);
      expect(atRisk[0].id).toBe('student1');
    });

    it('should not flag students above threshold', async () => {
      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'math',
          score: 85,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      const atRisk = await service.getAtRiskStudents('school1', 70);
      expect(atRisk).toHaveLength(0);
    });

    it('should only return students from specified school', async () => {
      const student2: Student = {
        ...student,
        id: 'student2',
        schoolId: 'school2',
      };
      service.addStudent(student2);

      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'math',
          score: 60,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      const atRisk = await service.getAtRiskStudents('school1', 70);
      expect(atRisk).toHaveLength(1);
      expect(atRisk[0].schoolId).toBe('school1');
    });
  });

  describe('getAcademicHistory', () => {
    it('should return audit trail for student', async () => {
      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'math',
          score: 85,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      await service.recordAttendance(
        {
          studentId: 'student1',
          date: new Date('2024-01-15'),
          status: 'PRESENT',
        },
        teacherContext
      );

      const history = await service.getAcademicHistory('student1');
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('GRADE_RECORDED');
      expect(history[1].action).toBe('ATTENDANCE_RECORDED');
    });

    it('should include timestamps and user attribution', async () => {
      await service.recordGrade(
        {
          studentId: 'student1',
          teacherId: 'teacher1',
          subjectId: 'math',
          score: 85,
          maxScore: 100,
          gradingScale: 'standard',
        },
        teacherContext
      );

      const history = await service.getAcademicHistory('student1');
      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(history[0].performedBy).toBe('teacher1');
    });
  });
});
