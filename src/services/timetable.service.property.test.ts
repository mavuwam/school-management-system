import * as fc from 'fast-check';
import { TimetableService } from './timetable.service';
import { Timetable, ClassPeriod } from '../models';

describe('TimetableService - Property-Based Tests', () => {
  let service: TimetableService;

  beforeEach(() => {
    service = new TimetableService();
  });

  // Arbitraries
  const timeArb = fc
    .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
    .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

  const periodArb = fc.record({
    id: fc.string({ minLength: 1 }),
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    startTime: timeArb,
    endTime: timeArb,
    subjectId: fc.string({ minLength: 1 }),
    teacherId: fc.string({ minLength: 1 }),
    roomId: fc.string({ minLength: 1 }),
    classId: fc.string({ minLength: 1 }),
    recurring: fc.boolean(),
  });

  const timetableArb = fc.record({
    id: fc.string({ minLength: 1 }),
    schoolId: fc.string({ minLength: 1 }),
    name: fc.string({ minLength: 1 }),
    effectiveFrom: fc.date(),
    effectiveTo: fc.option(fc.date(), { nil: undefined }),
    periods: fc.array(periodArb, { minLength: 1, maxLength: 10 }),
  });

  describe('Property 38: Timetable Completeness', () => {
    it('should preserve all timetable data when saving', () => {
      fc.assert(
        fc.property(timetableArb, (timetableData) => {
          service.clear();

          // Ensure periods have valid time ranges
          const validPeriods = timetableData.periods.map((p) => ({
            ...p,
            endTime:
              p.startTime >= p.endTime
                ? `${String(Number(p.startTime.split(':')[0]) + 1).padStart(2, '0')}:00`
                : p.endTime,
          }));

          const timetable: Timetable = {
            ...timetableData,
            periods: validPeriods,
          };

          // Skip if validation would fail
          const validation = service.validateTimetable(timetable);
          if (!validation.valid) {
            return true;
          }

          const saved = service.saveTimetable(timetable);

          // Property: All timetable data should be preserved
          expect(saved.id).toBe(timetable.id);
          expect(saved.schoolId).toBe(timetable.schoolId);
          expect(saved.name).toBe(timetable.name);
          expect(saved.effectiveFrom).toEqual(timetable.effectiveFrom);
          expect(saved.periods).toHaveLength(timetable.periods.length);

          // Verify all periods are preserved
          for (let i = 0; i < timetable.periods.length; i++) {
            expect(saved.periods[i]).toEqual(timetable.periods[i]);
          }

          return true;
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 39: Timetable Conflict Detection', () => {
    it('should detect all teacher conflicts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 6 }),
          fc.string({ minLength: 1 }),
          (teacherId, dayOfWeek, schoolId) => {
            service.clear();

            // Create two overlapping periods with same teacher
            const period1: ClassPeriod = {
              id: 'period-1',
              dayOfWeek,
              startTime: '09:00',
              endTime: '10:00',
              subjectId: 'subject-1',
              teacherId,
              roomId: 'room-1',
              classId: 'class-1',
              recurring: true,
            };

            const period2: ClassPeriod = {
              id: 'period-2',
              dayOfWeek,
              startTime: '09:30',
              endTime: '10:30',
              subjectId: 'subject-2',
              teacherId,
              roomId: 'room-2',
              classId: 'class-2',
              recurring: true,
            };

            const timetable: Timetable = {
              id: 'timetable-1',
              schoolId,
              name: 'Test Timetable',
              effectiveFrom: new Date(),
              periods: [period1, period2],
            };

            const validation = service.validateTimetable(timetable);

            // Property: Should detect teacher conflict
            expect(validation.valid).toBe(false);
            expect(validation.conflicts.some((c) => c.conflictType === 'teacher')).toBe(
              true
            );

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should not detect conflicts for non-overlapping periods', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 6 }),
          (teacherId, dayOfWeek) => {
            service.clear();

            // Create two non-overlapping periods with same teacher
            const period1: ClassPeriod = {
              id: 'period-1',
              dayOfWeek,
              startTime: '09:00',
              endTime: '10:00',
              subjectId: 'subject-1',
              teacherId,
              roomId: 'room-1',
              classId: 'class-1',
              recurring: true,
            };

            const period2: ClassPeriod = {
              id: 'period-2',
              dayOfWeek,
              startTime: '10:00',
              endTime: '11:00',
              subjectId: 'subject-2',
              teacherId,
              roomId: 'room-2',
              classId: 'class-2',
              recurring: true,
            };

            const timetable: Timetable = {
              id: 'timetable-1',
              schoolId: 'school-1',
              name: 'Test Timetable',
              effectiveFrom: new Date(),
              periods: [period1, period2],
            };

            const validation = service.validateTimetable(timetable);

            // Property: Should not detect conflicts
            expect(validation.valid).toBe(true);
            expect(validation.conflicts).toHaveLength(0);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 40: Recurring Schedule Support', () => {
    it('should preserve recurring flag for all periods', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (recurringFlags) => {
            service.clear();

            const periods: ClassPeriod[] = recurringFlags.map((recurring, i) => ({
              id: `period-${i}`,
              dayOfWeek: i % 7,
              startTime: `${String(9 + i).padStart(2, '0')}:00`,
              endTime: `${String(10 + i).padStart(2, '0')}:00`,
              subjectId: `subject-${i}`,
              teacherId: `teacher-${i}`,
              roomId: `room-${i}`,
              classId: `class-${i}`,
              recurring,
            }));

            const timetable: Timetable = {
              id: 'timetable-1',
              schoolId: 'school-1',
              name: 'Test Timetable',
              effectiveFrom: new Date(),
              periods,
            };

            const saved = service.saveTimetable(timetable);

            // Property: Recurring flag should be preserved for all periods
            for (let i = 0; i < periods.length; i++) {
              expect(saved.periods[i].recurring).toBe(recurringFlags[i]);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 41: Variable-Length Period Support', () => {
    it('should support periods of different lengths', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 15, max: 180 }), { minLength: 1, maxLength: 8 }),
          (durations) => {
            service.clear();

            let currentTime = 9 * 60; // Start at 9:00 AM in minutes
            const periods: ClassPeriod[] = durations.map((duration, i) => {
              const startHour = Math.floor(currentTime / 60);
              const startMin = currentTime % 60;
              const endTime = currentTime + duration;
              const endHour = Math.floor(endTime / 60);
              const endMin = endTime % 60;

              const period: ClassPeriod = {
                id: `period-${i}`,
                dayOfWeek: 1,
                startTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
                endTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
                subjectId: `subject-${i}`,
                teacherId: `teacher-${i}`,
                roomId: `room-${i}`,
                classId: `class-${i}`,
                recurring: true,
              };

              currentTime = endTime;
              return period;
            });

            const timetable: Timetable = {
              id: 'timetable-1',
              schoolId: 'school-1',
              name: 'Test Timetable',
              effectiveFrom: new Date(),
              periods,
            };

            const saved = service.saveTimetable(timetable);

            // Property: All periods should be preserved with their durations
            expect(saved.periods).toHaveLength(periods.length);
            for (let i = 0; i < periods.length; i++) {
              expect(saved.periods[i].startTime).toBe(periods[i].startTime);
              expect(saved.periods[i].endTime).toBe(periods[i].endTime);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 8: Timetable Display Completeness', () => {
    it('should return all periods for a student class', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.array(periodArb, { minLength: 1, maxLength: 10 }),
          (classId, periodsData) => {
            service.clear();

            // Ensure periods have valid time ranges and assign to class
            const periods = periodsData.map((p) => ({
              ...p,
              classId,
              endTime:
                p.startTime >= p.endTime
                  ? `${String(Number(p.startTime.split(':')[0]) + 1).padStart(2, '0')}:00`
                  : p.endTime,
            }));

            const timetable: Timetable = {
              id: 'timetable-1',
              schoolId: 'school-1',
              name: 'Test Timetable',
              effectiveFrom: new Date(),
              periods,
            };

            // Skip if validation would fail
            const validation = service.validateTimetable(timetable);
            if (!validation.valid) {
              return true;
            }

            service.saveTimetable(timetable);

            const studentTimetable = service.getStudentTimetable('student-1', classId);

            // Property: Should return all periods for the class
            expect(studentTimetable).toHaveLength(periods.length);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return periods sorted chronologically', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.array(periodArb, { minLength: 2, maxLength: 10 }),
          (classId, periodsData) => {
            service.clear();

            // Ensure periods have valid time ranges and assign to class
            const periods = periodsData.map((p) => ({
              ...p,
              classId,
              endTime:
                p.startTime >= p.endTime
                  ? `${String(Number(p.startTime.split(':')[0]) + 1).padStart(2, '0')}:00`
                  : p.endTime,
            }));

            const timetable: Timetable = {
              id: 'timetable-1',
              schoolId: 'school-1',
              name: 'Test Timetable',
              effectiveFrom: new Date(),
              periods,
            };

            // Skip if validation would fail
            const validation = service.validateTimetable(timetable);
            if (!validation.valid) {
              return true;
            }

            service.saveTimetable(timetable);

            const studentTimetable = service.getStudentTimetable('student-1', classId);

            // Property: Periods should be sorted by day, then by time
            for (let i = 1; i < studentTimetable.length; i++) {
              const prev = studentTimetable[i - 1];
              const curr = studentTimetable[i];

              if (prev.dayOfWeek === curr.dayOfWeek) {
                expect(prev.startTime.localeCompare(curr.startTime)).toBeLessThanOrEqual(0);
              } else {
                expect(prev.dayOfWeek).toBeLessThan(curr.dayOfWeek);
              }
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 16: School Head Timetable Permissions', () => {
    it('should allow retrieving any teacher timetable', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          (teacherIds) => {
            service.clear();

            const uniqueTeachers = Array.from(new Set(teacherIds));

            // Create periods for each teacher
            const periods: ClassPeriod[] = uniqueTeachers.map((teacherId, i) => ({
              id: `period-${i}`,
              dayOfWeek: i % 7,
              startTime: `${String(9 + i).padStart(2, '0')}:00`,
              endTime: `${String(10 + i).padStart(2, '0')}:00`,
              subjectId: `subject-${i}`,
              teacherId,
              roomId: `room-${i}`,
              classId: `class-${i}`,
              recurring: true,
            }));

            const timetable: Timetable = {
              id: 'timetable-1',
              schoolId: 'school-1',
              name: 'Test Timetable',
              effectiveFrom: new Date(),
              periods,
            };

            service.saveTimetable(timetable);

            // Property: School head should be able to retrieve any teacher's timetable
            for (const teacherId of uniqueTeachers) {
              const teacherTimetable = service.getTeacherTimetable(teacherId);
              expect(teacherTimetable.length).toBeGreaterThan(0);
              expect(teacherTimetable.every((p) => p.teacherId === teacherId)).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
