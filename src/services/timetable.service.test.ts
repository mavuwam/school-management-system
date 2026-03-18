import { TimetableService } from './timetable.service';
import { Timetable, ClassPeriod } from '../models';

describe('TimetableService', () => {
  let service: TimetableService;

  beforeEach(() => {
    service = new TimetableService();
  });

  const createValidPeriod = (overrides: Partial<ClassPeriod> = {}): ClassPeriod => ({
    id: `period-${Date.now()}-${Math.random()}`,
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    subjectId: 'math-101',
    teacherId: 'teacher-1',
    roomId: 'room-101',
    classId: 'class-a',
    recurring: true,
    ...overrides,
  });

  const createValidTimetable = (overrides: Partial<Timetable> = {}): Timetable => ({
    id: `timetable-${Date.now()}-${Math.random()}`,
    schoolId: 'school-1',
    name: 'Fall 2024',
    effectiveFrom: new Date('2024-09-01'),
    periods: [createValidPeriod()],
    ...overrides,
  });

  describe('saveTimetable', () => {
    it('should save a valid timetable', () => {
      const timetable = createValidTimetable();
      const saved = service.saveTimetable(timetable);

      expect(saved).toEqual(timetable);
      expect(service.getTimetable(timetable.id)).toEqual(timetable);
    });

    it('should throw error if ID is missing', () => {
      const timetable = createValidTimetable({ id: '' });
      expect(() => service.saveTimetable(timetable)).toThrow('Timetable ID is required');
    });

    it('should throw error if school ID is missing', () => {
      const timetable = createValidTimetable({ schoolId: '' });
      expect(() => service.saveTimetable(timetable)).toThrow('School ID is required');
    });

    it('should throw error if name is missing', () => {
      const timetable = createValidTimetable({ name: '' });
      expect(() => service.saveTimetable(timetable)).toThrow('Timetable name is required');
    });

    it('should throw error if effective from date is missing', () => {
      const timetable = createValidTimetable({ effectiveFrom: undefined as any });
      expect(() => service.saveTimetable(timetable)).toThrow(
        'Effective from date is required'
      );
    });

    it('should throw error if no periods are provided', () => {
      const timetable = createValidTimetable({ periods: [] });
      expect(() => service.saveTimetable(timetable)).toThrow(
        'At least one period is required'
      );
    });

    it('should throw error if timetable has conflicts', () => {
      const period1 = createValidPeriod({
        id: 'period-1',
        teacherId: 'teacher-1',
        startTime: '09:00',
        endTime: '10:00',
      });
      const period2 = createValidPeriod({
        id: 'period-2',
        teacherId: 'teacher-1',
        startTime: '09:30',
        endTime: '10:30',
      });

      const timetable = createValidTimetable({ periods: [period1, period2] });

      expect(() => service.saveTimetable(timetable)).toThrow('Timetable has conflicts');
    });

    it('should index timetable by teachers', () => {
      const period1 = createValidPeriod({
        teacherId: 'teacher-1',
        roomId: 'room-1',
        classId: 'class-1',
      });
      const period2 = createValidPeriod({
        teacherId: 'teacher-2',
        roomId: 'room-2',
        classId: 'class-2',
      });
      const timetable = createValidTimetable({ periods: [period1, period2] });

      service.saveTimetable(timetable);

      const teacher1Schedule = service.getTeacherTimetable('teacher-1');
      const teacher2Schedule = service.getTeacherTimetable('teacher-2');

      expect(teacher1Schedule).toContainEqual(period1);
      expect(teacher2Schedule).toContainEqual(period2);
    });
  });

  describe('getStudentTimetable', () => {
    it('should return all periods for a student class', () => {
      const period1 = createValidPeriod({
        classId: 'class-a',
        dayOfWeek: 1,
        startTime: '09:00',
      });
      const period2 = createValidPeriod({
        classId: 'class-a',
        dayOfWeek: 1,
        startTime: '10:00',
      });
      const period3 = createValidPeriod({
        classId: 'class-b',
        dayOfWeek: 1,
        startTime: '11:00',
      });

      const timetable = createValidTimetable({ periods: [period1, period2, period3] });
      service.saveTimetable(timetable);

      const studentTimetable = service.getStudentTimetable('student-1', 'class-a');

      expect(studentTimetable).toHaveLength(2);
      expect(studentTimetable).toContainEqual(period1);
      expect(studentTimetable).toContainEqual(period2);
      expect(studentTimetable).not.toContainEqual(period3);
    });

    it('should return periods sorted by day and time', () => {
      const period1 = createValidPeriod({
        classId: 'class-a',
        dayOfWeek: 2,
        startTime: '10:00',
      });
      const period2 = createValidPeriod({
        classId: 'class-a',
        dayOfWeek: 1,
        startTime: '14:00',
      });
      const period3 = createValidPeriod({
        classId: 'class-a',
        dayOfWeek: 1,
        startTime: '09:00',
      });

      const timetable = createValidTimetable({ periods: [period1, period2, period3] });
      service.saveTimetable(timetable);

      const studentTimetable = service.getStudentTimetable('student-1', 'class-a');

      expect(studentTimetable[0].id).toBe(period3.id); // Day 1, 09:00
      expect(studentTimetable[1].id).toBe(period2.id); // Day 1, 14:00
      expect(studentTimetable[2].id).toBe(period1.id); // Day 2, 10:00
    });

    it('should return empty array if no periods for class', () => {
      const timetable = createValidTimetable();
      service.saveTimetable(timetable);

      const studentTimetable = service.getStudentTimetable('student-1', 'class-z');
      expect(studentTimetable).toEqual([]);
    });
  });

  describe('getTeacherTimetable', () => {
    it('should return all periods for a teacher', () => {
      const period1 = createValidPeriod({
        teacherId: 'teacher-1',
        startTime: '09:00',
        endTime: '10:00',
        roomId: 'room-1',
        classId: 'class-1',
      });
      const period2 = createValidPeriod({
        teacherId: 'teacher-1',
        startTime: '10:00',
        endTime: '11:00',
        roomId: 'room-2',
        classId: 'class-2',
      });
      const period3 = createValidPeriod({
        teacherId: 'teacher-2',
        roomId: 'room-3',
        classId: 'class-3',
      });

      const timetable = createValidTimetable({ periods: [period1, period2, period3] });
      service.saveTimetable(timetable);

      const teacherTimetable = service.getTeacherTimetable('teacher-1');

      expect(teacherTimetable).toHaveLength(2);
      expect(teacherTimetable).toContainEqual(period1);
      expect(teacherTimetable).toContainEqual(period2);
      expect(teacherTimetable).not.toContainEqual(period3);
    });

    it('should return periods sorted by day and time', () => {
      const period1 = createValidPeriod({
        teacherId: 'teacher-1',
        dayOfWeek: 2,
        startTime: '10:00',
      });
      const period2 = createValidPeriod({
        teacherId: 'teacher-1',
        dayOfWeek: 1,
        startTime: '14:00',
      });
      const period3 = createValidPeriod({
        teacherId: 'teacher-1',
        dayOfWeek: 1,
        startTime: '09:00',
      });

      const timetable = createValidTimetable({ periods: [period1, period2, period3] });
      service.saveTimetable(timetable);

      const teacherTimetable = service.getTeacherTimetable('teacher-1');

      expect(teacherTimetable[0].id).toBe(period3.id); // Day 1, 09:00
      expect(teacherTimetable[1].id).toBe(period2.id); // Day 1, 14:00
      expect(teacherTimetable[2].id).toBe(period1.id); // Day 2, 10:00
    });

    it('should aggregate periods from multiple timetables', () => {
      const period1 = createValidPeriod({ teacherId: 'teacher-1' });
      const timetable1 = createValidTimetable({ id: 'tt-1', periods: [period1] });

      const period2 = createValidPeriod({ teacherId: 'teacher-1' });
      const timetable2 = createValidTimetable({ id: 'tt-2', periods: [period2] });

      service.saveTimetable(timetable1);
      service.saveTimetable(timetable2);

      const teacherTimetable = service.getTeacherTimetable('teacher-1');

      expect(teacherTimetable).toHaveLength(2);
      expect(teacherTimetable).toContainEqual(period1);
      expect(teacherTimetable).toContainEqual(period2);
    });

    it('should return empty array if teacher has no periods', () => {
      const timetable = createValidTimetable();
      service.saveTimetable(timetable);

      const teacherTimetable = service.getTeacherTimetable('teacher-999');
      expect(teacherTimetable).toEqual([]);
    });
  });

  describe('validateTimetable', () => {
    it('should return valid for non-conflicting timetable', () => {
      const period1 = createValidPeriod({
        startTime: '09:00',
        endTime: '10:00',
      });
      const period2 = createValidPeriod({
        startTime: '10:00',
        endTime: '11:00',
      });

      const timetable = createValidTimetable({ periods: [period1, period2] });
      const validation = service.validateTimetable(timetable);

      expect(validation.valid).toBe(true);
      expect(validation.conflicts).toHaveLength(0);
    });

    it('should detect teacher conflicts', () => {
      const period1 = createValidPeriod({
        id: 'period-1',
        teacherId: 'teacher-1',
        roomId: 'room-1',
        classId: 'class-1',
        startTime: '09:00',
        endTime: '10:00',
      });
      const period2 = createValidPeriod({
        id: 'period-2',
        teacherId: 'teacher-1',
        roomId: 'room-2',
        classId: 'class-2',
        startTime: '09:30',
        endTime: '10:30',
      });

      const timetable = createValidTimetable({ periods: [period1, period2] });
      const validation = service.validateTimetable(timetable);

      expect(validation.valid).toBe(false);
      expect(validation.conflicts.some((c) => c.conflictType === 'teacher')).toBe(true);
      expect(validation.conflicts.find((c) => c.conflictType === 'teacher')?.reason).toContain('teacher-1');
    });

    it('should detect room conflicts', () => {
      const period1 = createValidPeriod({
        id: 'period-1',
        roomId: 'room-101',
        teacherId: 'teacher-1',
        startTime: '09:00',
        endTime: '10:00',
      });
      const period2 = createValidPeriod({
        id: 'period-2',
        roomId: 'room-101',
        teacherId: 'teacher-2',
        startTime: '09:30',
        endTime: '10:30',
      });

      const timetable = createValidTimetable({ periods: [period1, period2] });
      const validation = service.validateTimetable(timetable);

      expect(validation.valid).toBe(false);
      expect(validation.conflicts.some((c) => c.conflictType === 'room')).toBe(true);
    });

    it('should detect student/class conflicts', () => {
      const period1 = createValidPeriod({
        id: 'period-1',
        classId: 'class-a',
        teacherId: 'teacher-1',
        startTime: '09:00',
        endTime: '10:00',
      });
      const period2 = createValidPeriod({
        id: 'period-2',
        classId: 'class-a',
        teacherId: 'teacher-2',
        startTime: '09:30',
        endTime: '10:30',
      });

      const timetable = createValidTimetable({ periods: [period1, period2] });
      const validation = service.validateTimetable(timetable);

      expect(validation.valid).toBe(false);
      expect(validation.conflicts.some((c) => c.conflictType === 'student')).toBe(true);
    });

    it('should not detect conflicts on different days', () => {
      const period1 = createValidPeriod({
        dayOfWeek: 1,
        teacherId: 'teacher-1',
        startTime: '09:00',
        endTime: '10:00',
      });
      const period2 = createValidPeriod({
        dayOfWeek: 2,
        teacherId: 'teacher-1',
        startTime: '09:00',
        endTime: '10:00',
      });

      const timetable = createValidTimetable({ periods: [period1, period2] });
      const validation = service.validateTimetable(timetable);

      expect(validation.valid).toBe(true);
    });

    it('should not detect conflicts for adjacent periods', () => {
      const period1 = createValidPeriod({
        teacherId: 'teacher-1',
        startTime: '09:00',
        endTime: '10:00',
      });
      const period2 = createValidPeriod({
        teacherId: 'teacher-1',
        startTime: '10:00',
        endTime: '11:00',
      });

      const timetable = createValidTimetable({ periods: [period1, period2] });
      const validation = service.validateTimetable(timetable);

      expect(validation.valid).toBe(true);
    });
  });

  describe('getAffectedUsers', () => {
    it('should return all affected teachers and classes', () => {
      const period1 = createValidPeriod({
        teacherId: 'teacher-1',
        classId: 'class-a',
        startTime: '09:00',
        endTime: '10:00',
        roomId: 'room-1',
      });
      const period2 = createValidPeriod({
        teacherId: 'teacher-2',
        classId: 'class-b',
        startTime: '10:00',
        endTime: '11:00',
        roomId: 'room-2',
      });
      const period3 = createValidPeriod({
        teacherId: 'teacher-1',
        classId: 'class-c',
        startTime: '11:00',
        endTime: '12:00',
        roomId: 'room-3',
      });

      const timetable = createValidTimetable({ periods: [period1, period2, period3] });
      service.saveTimetable(timetable);

      const affected = service.getAffectedUsers(timetable.id);

      expect(affected.teachers).toHaveLength(2);
      expect(affected.teachers).toContain('teacher-1');
      expect(affected.teachers).toContain('teacher-2');

      expect(affected.classes).toHaveLength(3);
      expect(affected.classes).toContain('class-a');
      expect(affected.classes).toContain('class-b');
      expect(affected.classes).toContain('class-c');
    });

    it('should throw error if timetable not found', () => {
      expect(() => service.getAffectedUsers('invalid-id')).toThrow('Timetable not found');
    });
  });

  describe('recurring schedules', () => {
    it('should support recurring periods', () => {
      const period = createValidPeriod({ recurring: true });
      const timetable = createValidTimetable({ periods: [period] });

      const saved = service.saveTimetable(timetable);

      expect(saved.periods[0].recurring).toBe(true);
    });

    it('should support non-recurring periods', () => {
      const period = createValidPeriod({ recurring: false });
      const timetable = createValidTimetable({ periods: [period] });

      const saved = service.saveTimetable(timetable);

      expect(saved.periods[0].recurring).toBe(false);
    });
  });

  describe('variable-length periods', () => {
    it('should support different period lengths', () => {
      const period1 = createValidPeriod({
        startTime: '09:00',
        endTime: '10:00', // 60 minutes
      });
      const period2 = createValidPeriod({
        startTime: '10:00',
        endTime: '10:45', // 45 minutes
      });
      const period3 = createValidPeriod({
        startTime: '10:45',
        endTime: '12:15', // 90 minutes
      });

      const timetable = createValidTimetable({ periods: [period1, period2, period3] });
      const saved = service.saveTimetable(timetable);

      expect(saved.periods).toHaveLength(3);
      expect(saved.periods[0].endTime).toBe('10:00');
      expect(saved.periods[1].endTime).toBe('10:45');
      expect(saved.periods[2].endTime).toBe('12:15');
    });
  });
});
