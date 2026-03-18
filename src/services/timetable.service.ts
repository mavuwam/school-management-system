import { Timetable, ClassPeriod } from '../models';

export interface TimetableConflict {
  periodId1: string;
  periodId2: string;
  reason: string;
  conflictType: 'teacher' | 'room' | 'student';
}

export interface ValidationResult {
  valid: boolean;
  conflicts: TimetableConflict[];
}

export class TimetableService {
  private timetables: Map<string, Timetable> = new Map();
  private studentTimetables: Map<string, string[]> = new Map(); // studentId -> timetableIds[]
  private teacherTimetables: Map<string, string[]> = new Map(); // teacherId -> timetableIds[]

  /**
   * Saves a timetable with conflict validation
   */
  saveTimetable(timetable: Timetable): Timetable {
    // Validate required fields
    if (!timetable.id) {
      throw new Error('Timetable ID is required');
    }
    if (!timetable.schoolId) {
      throw new Error('School ID is required');
    }
    if (!timetable.name || timetable.name.trim() === '') {
      throw new Error('Timetable name is required');
    }
    if (!timetable.effectiveFrom) {
      throw new Error('Effective from date is required');
    }
    if (!timetable.periods || timetable.periods.length === 0) {
      throw new Error('At least one period is required');
    }

    // Validate timetable for conflicts
    const validation = this.validateTimetable(timetable);
    if (!validation.valid) {
      throw new Error(
        `Timetable has conflicts: ${validation.conflicts.map((c) => c.reason).join(', ')}`
      );
    }

    this.timetables.set(timetable.id, timetable);

    // Index by teachers
    for (const period of timetable.periods) {
      const teacherTimetableList = this.teacherTimetables.get(period.teacherId) || [];
      if (!teacherTimetableList.includes(timetable.id)) {
        teacherTimetableList.push(timetable.id);
        this.teacherTimetables.set(period.teacherId, teacherTimetableList);
      }
    }

    return timetable;
  }

  /**
   * Gets a student's complete timetable with all period data
   */
  getStudentTimetable(studentId: string, classId: string): ClassPeriod[] {
    const periods: ClassPeriod[] = [];

    for (const timetable of this.timetables.values()) {
      for (const period of timetable.periods) {
        if (period.classId === classId) {
          periods.push(period);
        }
      }
    }

    // Sort by day of week, then by start time
    periods.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });

    return periods;
  }

  /**
   * Gets a teacher's schedule aggregated from all timetables
   */
  getTeacherTimetable(teacherId: string): ClassPeriod[] {
    const periods: ClassPeriod[] = [];
    const timetableIds = this.teacherTimetables.get(teacherId) || [];

    for (const timetableId of timetableIds) {
      const timetable = this.timetables.get(timetableId);
      if (!timetable) continue;

      for (const period of timetable.periods) {
        if (period.teacherId === teacherId) {
          periods.push(period);
        }
      }
    }

    // Sort by day of week, then by start time
    periods.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });

    return periods;
  }

  /**
   * Validates a timetable for conflicts
   */
  validateTimetable(timetable: Timetable): ValidationResult {
    const conflicts: TimetableConflict[] = [];

    // Check for conflicts within the timetable
    for (let i = 0; i < timetable.periods.length; i++) {
      for (let j = i + 1; j < timetable.periods.length; j++) {
        const period1 = timetable.periods[i];
        const period2 = timetable.periods[j];

        // Only check conflicts on the same day
        if (period1.dayOfWeek !== period2.dayOfWeek) {
          continue;
        }

        // Check for time overlap
        if (this.periodsOverlap(period1, period2)) {
          // Teacher conflict
          if (period1.teacherId === period2.teacherId) {
            conflicts.push({
              periodId1: period1.id,
              periodId2: period2.id,
              reason: `Teacher ${period1.teacherId} has overlapping periods`,
              conflictType: 'teacher',
            });
          }

          // Room conflict
          if (period1.roomId === period2.roomId) {
            conflicts.push({
              periodId1: period1.id,
              periodId2: period2.id,
              reason: `Room ${period1.roomId} has overlapping periods`,
              conflictType: 'room',
            });
          }

          // Student conflict (same class)
          if (period1.classId === period2.classId) {
            conflicts.push({
              periodId1: period1.id,
              periodId2: period2.id,
              reason: `Class ${period1.classId} has overlapping periods`,
              conflictType: 'student',
            });
          }
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Gets users affected by timetable changes
   */
  getAffectedUsers(timetableId: string): {
    teachers: string[];
    students: string[];
    classes: string[];
  } {
    const timetable = this.timetables.get(timetableId);
    if (!timetable) {
      throw new Error('Timetable not found');
    }

    const teachers = new Set<string>();
    const classes = new Set<string>();

    for (const period of timetable.periods) {
      teachers.add(period.teacherId);
      classes.add(period.classId);
    }

    return {
      teachers: Array.from(teachers),
      students: [], // Would need class roster data to populate
      classes: Array.from(classes),
    };
  }

  /**
   * Checks if two periods overlap in time
   */
  private periodsOverlap(period1: ClassPeriod, period2: ClassPeriod): boolean {
    // Convert time strings to minutes for comparison
    const start1 = this.timeToMinutes(period1.startTime);
    const end1 = this.timeToMinutes(period1.endTime);
    const start2 = this.timeToMinutes(period2.startTime);
    const end2 = this.timeToMinutes(period2.endTime);

    // Check for overlap: periods overlap if one starts before the other ends
    return start1 < end2 && start2 < end1;
  }

  /**
   * Converts time string (HH:MM) to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Gets a timetable by ID
   */
  getTimetable(timetableId: string): Timetable | undefined {
    return this.timetables.get(timetableId);
  }

  /**
   * Clears all data (for testing)
   */
  clear(): void {
    this.timetables.clear();
    this.studentTimetables.clear();
    this.teacherTimetables.clear();
  }
}
