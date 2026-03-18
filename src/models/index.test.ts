// Basic tests to verify project setup
import { UserRole, NotificationType, AttendanceStatus } from './index';

describe('Base Enums', () => {
  describe('UserRole', () => {
    it('should have all required roles', () => {
      expect(UserRole.STUDENT).toBe('STUDENT');
      expect(UserRole.TEACHER).toBe('TEACHER');
      expect(UserRole.SCHOOL_HEAD).toBe('SCHOOL_HEAD');
      expect(UserRole.PARENT).toBe('PARENT');
      expect(UserRole.SYSTEM_ADMIN).toBe('SYSTEM_ADMIN');
    });
  });

  describe('NotificationType', () => {
    it('should have all required notification types', () => {
      expect(NotificationType.GRADE_UPDATE).toBe('GRADE_UPDATE');
      expect(NotificationType.ASSIGNMENT_CREATED).toBe('ASSIGNMENT_CREATED');
      expect(NotificationType.ASSIGNMENT_DUE_SOON).toBe('ASSIGNMENT_DUE_SOON');
      expect(NotificationType.PAYMENT_REMINDER).toBe('PAYMENT_REMINDER');
      expect(NotificationType.TIMETABLE_CHANGE).toBe('TIMETABLE_CHANGE');
      expect(NotificationType.ATTENDANCE_ALERT).toBe('ATTENDANCE_ALERT');
    });
  });

  describe('AttendanceStatus', () => {
    it('should have all required attendance statuses', () => {
      expect(AttendanceStatus.PRESENT).toBe('PRESENT');
      expect(AttendanceStatus.ABSENT).toBe('ABSENT');
      expect(AttendanceStatus.LATE).toBe('LATE');
      expect(AttendanceStatus.EXCUSED).toBe('EXCUSED');
    });
  });
});
