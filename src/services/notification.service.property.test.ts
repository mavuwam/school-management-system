import * as fc from 'fast-check';
import { NotificationService } from './notification.service';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../models';

describe('NotificationService - Property-Based Tests', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  const notificationTypeArb = fc.constantFrom(
    NotificationType.GRADE_UPDATE,
    NotificationType.ASSIGNMENT_CREATED,
    NotificationType.ASSIGNMENT_DUE_SOON,
    NotificationType.PAYMENT_REMINDER,
    NotificationType.TIMETABLE_CHANGE,
    NotificationType.ATTENDANCE_ALERT
  );

  const priorityArb = fc.constantFrom(
    NotificationPriority.LOW,
    NotificationPriority.MEDIUM,
    NotificationPriority.HIGH
  );

  describe('Property 45: Notification Preference Enforcement', () => {
    it('should respect user notification type preferences', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          notificationTypeArb,
          fc.boolean(),
          (userId, notificationType, enabled) => {
            service.clear();

            // Set preference for notification type
            const prefs = service.getPreferences(userId);
            prefs.notificationTypes.set(notificationType, enabled);
            service.updatePreferences(userId, prefs);

            if (enabled) {
              // Should succeed
              const notification = service.sendNotification({
                userId,
                type: notificationType,
                title: 'Test',
                message: 'Test message',
                priority: NotificationPriority.MEDIUM,
              });
              expect(notification).toBeDefined();
              expect(notification.type).toBe(notificationType);
            } else {
              // Should throw error
              expect(() =>
                service.sendNotification({
                  userId,
                  type: notificationType,
                  title: 'Test',
                  message: 'Test message',
                  priority: NotificationPriority.MEDIUM,
                })
              ).toThrow();
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should respect channel preferences', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.boolean(),
          fc.boolean(),
          (userId, emailEnabled, inAppEnabled) => {
            service.clear();

            service.updatePreferences(userId, {
              emailEnabled,
              inAppEnabled,
            });

            // Only send if at least one channel is enabled
            if (!emailEnabled && !inAppEnabled) {
              return true;
            }

            const notification = service.sendNotification({
              userId,
              type: NotificationType.GRADE_UPDATE,
              title: 'Test',
              message: 'Test message',
              priority: NotificationPriority.MEDIUM,
            });

            // Property: Channels should match preferences
            if (emailEnabled) {
              expect(notification.channels).toContain(NotificationChannel.EMAIL);
            } else {
              expect(notification.channels).not.toContain(NotificationChannel.EMAIL);
            }

            if (inAppEnabled) {
              expect(notification.channels).toContain(NotificationChannel.IN_APP);
            } else {
              expect(notification.channels).not.toContain(NotificationChannel.IN_APP);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 46: Notification History Persistence', () => {
    it('should persist all sent notifications in history', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.array(
            fc.record({
              type: notificationTypeArb,
              title: fc.string({ minLength: 1 }),
              message: fc.string({ minLength: 1 }),
              priority: priorityArb,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (userId, notifications) => {
            service.clear();

            const sentNotifications = [];

            for (const notifData of notifications) {
              const notification = service.sendNotification({
                userId,
                type: notifData.type,
                title: notifData.title,
                message: notifData.message,
                priority: notifData.priority,
              });
              sentNotifications.push(notification);
            }

            const history = service.getNotificationHistory(userId);

            // Property: All sent notifications should be in history
            expect(history).toHaveLength(sentNotifications.length);

            for (const sentNotif of sentNotifications) {
              const found = history.find((n) => n.id === sentNotif.id);
              expect(found).toBeDefined();
              expect(found?.title).toBe(sentNotif.title);
              expect(found?.message).toBe(sentNotif.message);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain chronological order in history', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 2, max: 10 }),
          (userId, count) => {
            service.clear();

            for (let i = 0; i < count; i++) {
              service.sendNotification({
                userId,
                type: NotificationType.GRADE_UPDATE,
                title: `Notification ${i}`,
                message: 'Message',
                priority: NotificationPriority.MEDIUM,
              });
            }

            const history = service.getNotificationHistory(userId);

            // Property: History should be sorted by sent date (most recent first)
            for (let i = 1; i < history.length; i++) {
              expect(history[i - 1].sentAt.getTime()).toBeGreaterThanOrEqual(
                history[i].sentAt.getTime()
              );
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 42: Academic Progress Update Notifications', () => {
    it('should send grade update notifications', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (userId, studentName, subject) => {
            service.clear();

            const notification = service.sendNotification({
              userId,
              type: NotificationType.GRADE_UPDATE,
              title: 'New Grade Posted',
              message: `${studentName} received a new grade in ${subject}`,
              priority: NotificationPriority.MEDIUM,
              relatedEntityId: 'grade-123',
              relatedEntityType: 'grade',
            });

            // Property: Grade update notification should be created
            expect(notification.type).toBe(NotificationType.GRADE_UPDATE);
            expect(notification.userId).toBe(userId);
            expect(notification.relatedEntityId).toBe('grade-123');
            expect(notification.relatedEntityType).toBe('grade');

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 43: Assignment Due Date Notifications', () => {
    it('should send assignment due soon notifications', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.date({ min: new Date() }),
          (userId, assignmentTitle, dueDate) => {
            service.clear();

            const notification = service.sendNotification({
              userId,
              type: NotificationType.ASSIGNMENT_DUE_SOON,
              title: 'Assignment Due Soon',
              message: `${assignmentTitle} is due on ${dueDate.toLocaleDateString()}`,
              priority: NotificationPriority.HIGH,
              relatedEntityId: 'assignment-123',
              relatedEntityType: 'assignment',
            });

            // Property: Assignment notification should be created
            expect(notification.type).toBe(NotificationType.ASSIGNMENT_DUE_SOON);
            expect(notification.priority).toBe(NotificationPriority.HIGH);
            expect(notification.relatedEntityId).toBe('assignment-123');

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 44: Weekly Payment Reminder Notifications', () => {
    it('should schedule weekly payment reminders', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.float({ min: 0, max: 10000 }),
          (userId, amount) => {
            service.clear();

            const config = service.scheduleRecurringNotification({
              id: `payment-reminder-${userId}`,
              userId,
              type: NotificationType.PAYMENT_REMINDER,
              title: 'Payment Reminder',
              message: `You have an outstanding balance of $${amount.toFixed(2)}`,
              priority: NotificationPriority.HIGH,
              schedule: 'weekly',
              enabled: true,
            });

            // Property: Recurring notification should be scheduled
            expect(config.schedule).toBe('weekly');
            expect(config.type).toBe(NotificationType.PAYMENT_REMINDER);
            expect(config.enabled).toBe(true);

            const retrieved = service.getRecurringNotification(config.id);
            expect(retrieved).toEqual(config);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 36: Assignment Creation Notification', () => {
    it('should send notification when assignment is created', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1 }),
          fc.date({ min: new Date() }),
          (studentIds, assignmentTitle, dueDate) => {
            service.clear();

            const uniqueStudents = Array.from(new Set(studentIds));

            // Send notification to all students
            for (const studentId of uniqueStudents) {
              const notification = service.sendNotification({
                userId: studentId,
                type: NotificationType.ASSIGNMENT_CREATED,
                title: 'New Assignment',
                message: `${assignmentTitle} has been assigned, due ${dueDate.toLocaleDateString()}`,
                priority: NotificationPriority.MEDIUM,
                relatedEntityId: 'assignment-123',
                relatedEntityType: 'assignment',
              });

              expect(notification.type).toBe(NotificationType.ASSIGNMENT_CREATED);
              expect(notification.userId).toBe(studentId);
            }

            // Property: All students should have the notification in their history
            for (const studentId of uniqueStudents) {
              const history = service.getNotificationHistory(studentId);
              expect(history.length).toBeGreaterThan(0);
              expect(
                history.some((n) => n.type === NotificationType.ASSIGNMENT_CREATED)
              ).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
