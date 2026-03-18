// User Service Unit Tests
import { UserService } from './user.service';
import {
  Student,
  Teacher,
  Parent,
  UserRole,
  AcademicProgress,
  PaymentRecord,
  Assignment,
  Timetable,
  GradeTrend,
  AttendanceStatus,
  PaymentStatus,
  PaymentMethod,
} from '../models';
import { UserContext } from '../interfaces/auth.interface';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    service.clearAll();
  });

  afterEach(() => {
    service.clearAll();
  });

  // Test data factory functions
  const createStudent = (
    id: string,
    schoolId: string,
    gradeLevel: string = '10'
  ): Student => ({
    id,
    username: `student_${id}`,
    passwordHash: 'hash',
    email: `student${id}@school.com`,
    role: UserRole.STUDENT,
    schoolId,
    mfaEnabled: false,
    createdAt: new Date(),
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('2005-01-01'),
    enrollmentDate: new Date('2020-09-01'),
    gradeLevel,
    parentIds: [],
  });

  const createTeacher = (
    id: string,
    schoolId: string,
    assignedClasses: string[] = []
  ): Teacher => ({
    id,
    username: `teacher${id}`,
    passwordHash: 'hash',
    email: `teacher${id}@school.com`,
    role: UserRole.TEACHER,
    schoolId,
    mfaEnabled: false,
    createdAt: new Date(),
    firstName: 'Jane',
    lastName: 'Smith',
    subjects: ['Math', 'Science'],
    assignedClasses,
  });

  const createParent = (
    id: string,
    schoolId: string,
    childrenIds: string[] = []
  ): Parent => ({
    id,
    username: `parent${id}`,
    passwordHash: 'hash',
    email: `parent${id}@school.com`,
    role: UserRole.PARENT,
    schoolId,
    mfaEnabled: false,
    createdAt: new Date(),
    firstName: 'Bob',
    lastName: 'Johnson',
    childrenIds,
  });

  const createUserContext = (
    userId: string,
    role: UserRole,
    schoolId: string
  ): UserContext => ({
    userId,
    role,
    schoolId,
    permissions: [],
  });

  const createAcademicProgress = (studentId: string): AcademicProgress => ({
    studentId,
    grades: [
      {
        id: 'g1',
        studentId,
        teacherId: 't1',
        subjectId: 'math',
        score: 85,
        maxScore: 100,
        gradingScale: 'standard',
        enteredAt: new Date(),
        enteredBy: 't1',
      },
    ],
    attendance: [
      {
        id: 'a1',
        studentId,
        date: new Date(),
        status: AttendanceStatus.PRESENT,
        recordedBy: 't1',
        recordedAt: new Date(),
      },
    ],
    averages: {
      overall: 85,
      bySubject: new Map([['math', 85]]),
      trend: GradeTrend.STABLE,
    },
    flaggedForIntervention: false,
    teacherComments: [],
  });

  describe('getUserProfile', () => {
    it('should return user profile for own user', async () => {
      const student = createStudent('s1', 'school1');
      service.addStudent(student);

      const context = createUserContext('s1', UserRole.STUDENT, 'school1');
      const profile = await service.getUserProfile('s1', context);

      expect(profile.id).toBe('s1');
      expect(profile.username).toBe('student_s1');
      expect(profile.role).toBe(UserRole.STUDENT);
      expect(profile.schoolId).toBe('school1');
    });

    it('should allow school head to access any profile in their school', async () => {
      const student = createStudent('s1', 'school1');
      service.addStudent(student);

      const context = createUserContext('sh1', UserRole.SCHOOL_HEAD, 'school1');
      const profile = await service.getUserProfile('s1', context);

      expect(profile.id).toBe('s1');
    });

    it('should deny access to profiles from different schools', async () => {
      const student = createStudent('s1', 'school1');
      service.addStudent(student);

      const context = createUserContext('s2', UserRole.STUDENT, 'school2');

      await expect(service.getUserProfile('s1', context)).rejects.toThrow(
        'Access denied'
      );
    });

    it('should throw error for non-existent user', async () => {
      const context = createUserContext('s1', UserRole.STUDENT, 'school1');

      await expect(service.getUserProfile('nonexistent', context)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('getStudentProfile', () => {
    it('should return complete student profile with all data', async () => {
      const student = createStudent('s1', 'school1');
      service.addStudent(student);

      const progress = createAcademicProgress('s1');
      service.setAcademicProgress('s1', progress);

      const payments: PaymentRecord[] = [
        {
          id: 'p1',
          studentId: 's1',
          amount: 1000,
          date: new Date(),
          paymentMethod: PaymentMethod.CASH,
          purpose: 'Tuition',
          status: PaymentStatus.COMPLETED,
          recordedBy: 'admin',
          recordedAt: new Date(),
        },
      ];
      service.setPaymentRecords('s1', payments);

      const context = createUserContext('s1', UserRole.STUDENT, 'school1');
      const profile = await service.getStudentProfile('s1', context);

      expect(profile.student.id).toBe('s1');
      expect(profile.academicProgress.studentId).toBe('s1');
      expect(profile.paymentRecords).toHaveLength(1);
      expect(profile.pendingWork).toBeDefined();
      expect(profile.timetable).toBeDefined();
    });

    it('should allow parent to access their child profile', async () => {
      const student = createStudent('s1', 'school1');
      const parent = createParent('p1', 'school1', ['s1']);
      service.addStudent(student);
      service.addParent(parent);

      const context = createUserContext('p1', UserRole.PARENT, 'school1');
      const profile = await service.getStudentProfile('s1', context);

      expect(profile.student.id).toBe('s1');
    });

    it('should deny parent access to non-linked child', async () => {
      const student = createStudent('s1', 'school1');
      const parent = createParent('p1', 'school1', []);
      service.addStudent(student);
      service.addParent(parent);

      const context = createUserContext('p1', UserRole.PARENT, 'school1');

      await expect(service.getStudentProfile('s1', context)).rejects.toThrow(
        'Cannot access this student profile'
      );
    });
  });

  describe('getTeacherView', () => {
    it('should return teacher view with assigned students', async () => {
      const teacher = createTeacher('t1', 'school1', ['class1']);
      const student = createStudent('s1', 'school1');
      service.addTeacher(teacher);
      service.addStudent(student);

      const assignment: Assignment = {
        id: 'a1',
        title: 'Homework',
        description: 'Math homework',
        teacherId: 't1',
        subjectId: 'math',
        classId: 'class1',
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
        pointValue: 100,
        createdAt: new Date(),
        assignedStudents: ['s1'],
      };
      service.setAssignments('s1', [assignment]);

      const progress = createAcademicProgress('s1');
      service.setAcademicProgress('s1', progress);

      const view = await service.getTeacherView('t1', {});

      expect(view.teacher.id).toBe('t1');
      expect(view.students).toHaveLength(1);
      expect(view.students[0].student.id).toBe('s1');
    });

    it('should filter students by class', async () => {
      const teacher = createTeacher('t1', 'school1', ['class1', 'class2']);
      const student1 = createStudent('s1', 'school1');
      const student2 = createStudent('s2', 'school1');
      service.addTeacher(teacher);
      service.addStudent(student1);
      service.addStudent(student2);

      const assignment1: Assignment = {
        id: 'a1',
        title: 'Homework',
        description: 'Math homework',
        teacherId: 't1',
        subjectId: 'math',
        classId: 'class1',
        dueDate: new Date(Date.now() + 86400000),
        pointValue: 100,
        createdAt: new Date(),
        assignedStudents: ['s1'],
      };
      service.setAssignments('s1', [assignment1]);

      const assignment2: Assignment = {
        id: 'a2',
        title: 'Homework',
        description: 'Science homework',
        teacherId: 't1',
        subjectId: 'science',
        classId: 'class2',
        dueDate: new Date(Date.now() + 86400000),
        pointValue: 100,
        createdAt: new Date(),
        assignedStudents: ['s2'],
      };
      service.setAssignments('s2', [assignment2]);

      const view = await service.getTeacherView('t1', { classId: 'class1' });

      expect(view.students).toHaveLength(1);
      expect(view.students[0].student.id).toBe('s1');
    });

    it('should filter students by performance level', async () => {
      const teacher = createTeacher('t1', 'school1', ['class1']);
      const student1 = createStudent('s1', 'school1');
      const student2 = createStudent('s2', 'school1');
      service.addTeacher(teacher);
      service.addStudent(student1);
      service.addStudent(student2);

      const assignment: Assignment = {
        id: 'a1',
        title: 'Homework',
        description: 'Math homework',
        teacherId: 't1',
        subjectId: 'math',
        classId: 'class1',
        dueDate: new Date(Date.now() + 86400000),
        pointValue: 100,
        createdAt: new Date(),
        assignedStudents: ['s1', 's2'],
      };
      service.setAssignments('s1', [assignment]);
      service.setAssignments('s2', [assignment]);

      const progress1 = createAcademicProgress('s1');
      progress1.averages.overall = 85; // High
      service.setAcademicProgress('s1', progress1);

      const progress2 = createAcademicProgress('s2');
      progress2.averages.overall = 55; // Low
      service.setAcademicProgress('s2', progress2);

      const view = await service.getTeacherView('t1', {
        performanceLevel: 'high',
      });

      expect(view.students).toHaveLength(1);
      expect(view.students[0].student.id).toBe('s1');
    });
  });

  describe('getSchoolHeadView', () => {
    it('should return all students and teachers in school', async () => {
      const student1 = createStudent('s1', 'school1');
      const student2 = createStudent('s2', 'school1');
      const teacher = createTeacher('t1', 'school1');
      service.addStudent(student1);
      service.addStudent(student2);
      service.addTeacher(teacher);

      const view = await service.getSchoolHeadView('school1', {});

      expect(view.students).toHaveLength(2);
      expect(view.teachers).toHaveLength(1);
      expect(view.schoolId).toBe('school1');
    });

    it('should not include students from other schools', async () => {
      const student1 = createStudent('s1', 'school1');
      const student2 = createStudent('s2', 'school2');
      service.addStudent(student1);
      service.addStudent(student2);

      const view = await service.getSchoolHeadView('school1', {});

      expect(view.students).toHaveLength(1);
      expect(view.students[0].id).toBe('s1');
    });

    it('should filter by grade level', async () => {
      const student1 = createStudent('s1', 'school1', '10');
      const student2 = createStudent('s2', 'school1', '11');
      service.addStudent(student1);
      service.addStudent(student2);

      const view = await service.getSchoolHeadView('school1', {
        gradeLevel: '10',
      });

      expect(view.students).toHaveLength(1);
      expect(view.students[0].id).toBe('s1');
    });

    it('should calculate academic summary correctly', async () => {
      const student1 = createStudent('s1', 'school1');
      const student2 = createStudent('s2', 'school1');
      service.addStudent(student1);
      service.addStudent(student2);

      const progress1 = createAcademicProgress('s1');
      progress1.averages.overall = 80;
      progress1.flaggedForIntervention = false;
      service.setAcademicProgress('s1', progress1);

      const progress2 = createAcademicProgress('s2');
      progress2.averages.overall = 90;
      progress2.flaggedForIntervention = true;
      service.setAcademicProgress('s2', progress2);

      const view = await service.getSchoolHeadView('school1', {});

      expect(view.academicSummary.totalStudents).toBe(2);
      expect(view.academicSummary.averageGrade).toBe(85);
      expect(view.academicSummary.atRiskStudents).toBe(1);
    });
  });

  describe('getParentView', () => {
    it('should return parent view with all linked children', async () => {
      const student1 = createStudent('s1', 'school1');
      const student2 = createStudent('s2', 'school1');
      const parent = createParent('p1', 'school1', ['s1', 's2']);
      service.addStudent(student1);
      service.addStudent(student2);
      service.addParent(parent);

      const progress1 = createAcademicProgress('s1');
      service.setAcademicProgress('s1', progress1);

      const progress2 = createAcademicProgress('s2');
      service.setAcademicProgress('s2', progress2);

      const view = await service.getParentView('p1');

      expect(view.parent.id).toBe('p1');
      expect(view.children).toHaveLength(2);
      expect(view.children[0].student.id).toBe('s1');
      expect(view.children[1].student.id).toBe('s2');
    });

    it('should not include children from different schools', async () => {
      const student1 = createStudent('s1', 'school1');
      const student2 = createStudent('s2', 'school2');
      const parent = createParent('p1', 'school1', ['s1', 's2']);
      service.addStudent(student1);
      service.addStudent(student2);
      service.addParent(parent);

      const view = await service.getParentView('p1');

      expect(view.children).toHaveLength(1);
      expect(view.children[0].student.id).toBe('s1');
    });

    it('should include complete data for each child', async () => {
      const student = createStudent('s1', 'school1');
      const parent = createParent('p1', 'school1', ['s1']);
      service.addStudent(student);
      service.addParent(parent);

      const progress = createAcademicProgress('s1');
      service.setAcademicProgress('s1', progress);

      const payments: PaymentRecord[] = [
        {
          id: 'p1',
          studentId: 's1',
          amount: 1000,
          date: new Date(),
          paymentMethod: PaymentMethod.CASH,
          purpose: 'Tuition',
          status: PaymentStatus.COMPLETED,
          recordedBy: 'admin',
          recordedAt: new Date(),
        },
      ];
      service.setPaymentRecords('s1', payments);

      const view = await service.getParentView('p1');

      expect(view.children[0].academicProgress).toBeDefined();
      expect(view.children[0].paymentRecords).toHaveLength(1);
      expect(view.children[0].pendingWork).toBeDefined();
      expect(view.children[0].timetable).toBeDefined();
    });
  });

  describe('linkParentToStudent', () => {
    it('should link parent to student successfully', async () => {
      const student = createStudent('s1', 'school1');
      const parent = createParent('p1', 'school1', []);
      service.addStudent(student);
      service.addParent(parent);

      await service.linkParentToStudent('p1', 's1');

      expect(parent.childrenIds).toContain('s1');
      expect(student.parentIds).toContain('p1');
    });

    it('should not create duplicate links', async () => {
      const student = createStudent('s1', 'school1');
      const parent = createParent('p1', 'school1', ['s1']);
      student.parentIds = ['p1'];
      service.addStudent(student);
      service.addParent(parent);

      await service.linkParentToStudent('p1', 's1');

      expect(parent.childrenIds.filter((id) => id === 's1')).toHaveLength(1);
      expect(student.parentIds.filter((id) => id === 'p1')).toHaveLength(1);
    });

    it('should prevent linking across different schools', async () => {
      const student = createStudent('s1', 'school1');
      const parent = createParent('p1', 'school2', []);
      service.addStudent(student);
      service.addParent(parent);

      await expect(service.linkParentToStudent('p1', 's1')).rejects.toThrow(
        'Cannot link parent and student from different schools'
      );
    });

    it('should throw error for non-existent parent', async () => {
      const student = createStudent('s1', 'school1');
      service.addStudent(student);

      await expect(
        service.linkParentToStudent('nonexistent', 's1')
      ).rejects.toThrow('Parent not found');
    });

    it('should throw error for non-existent student', async () => {
      const parent = createParent('p1', 'school1', []);
      service.addParent(parent);

      await expect(
        service.linkParentToStudent('p1', 'nonexistent')
      ).rejects.toThrow('Student not found');
    });
  });
});
