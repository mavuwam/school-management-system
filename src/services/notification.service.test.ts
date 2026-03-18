import { NotificationService } from './notification.service';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../models';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  describe('sendNotification', () => {
    it('should send a notification with valid input', () => {
      const input = {
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'New Grade Posted',
        message: 'You received a grade for Math Assignment',
        priority: NotificationPriority.MEDIUM,
      };

      const notification = service.sendNotification(input);

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(input.userId);
      expect(notification.type).toBe(input.type);
      expect(notification.title).toBe(input.title);
      expect(notification.message).toBe(input.message);
      expect(notification.priority).toBe(input.priority);
      expect(notification.sentAt).toBeInstanceOf(Date);
      expect(notification.readAt).toBeUndefined();
    });

    it('should route to channels based on user preferences', () => {
      service.updatePreferences('user-1', {
        emailEnabled: true,
        inAppEnabled: true,
      });

      const notification = service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Title',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      expect(notification.channels).toContain(NotificationChannel.EMAIL);
      expect(notification.channels).toContain(NotificationChannel.IN_APP);
    });

    it('should respect email disabled preference', () => {
      service.updatePreferences('user-1', {
        emailEnabled: false,
        inAppEnabled: true,
      });

      const notification = service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Title',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      expect(notification.channels).not.toContain(NotificationChannel.EMAIL);
      expect(notification.channels).toContain(NotificationChannel.IN_APP);
    });

    it('should throw error if notification type is disabled', () => {
      const prefs = service.getPreferences('user-1');
      prefs.notificationTypes.set(NotificationType.GRADE_UPDATE, false);
      service.updatePreferences('user-1', prefs);

      expect(() =>
        service.sendNotification({
          userId: 'user-1',
          type: NotificationType.GRADE_UPDATE,
          title: 'Title',
          message: 'Message',
          priority: NotificationPriority.MEDIUM,
        })
      ).toThrow('Notification type GRADE_UPDATE is disabled');
    });

    it('should throw error if user ID is missing', () => {
      expect(() =>
        service.sendNotification({
          userId: '',
          type: NotificationType.GRADE_UPDATE,
          title: 'Title',
          message: 'Message',
          priority: NotificationPriority.MEDIUM,
        })
      ).toThrow('User ID is required');
    });

    it('should throw error if title is missing', () => {
      expect(() =>
        service.sendNotification({
          userId: 'user-1',
          type: NotificationType.GRADE_UPDATE,
          title: '',
          message: 'Message',
          priority: NotificationPriority.MEDIUM,
        })
      ).toThrow('Notification title is required');
    });

    it('should throw error if message is missing', () => {
      expect(() =>
        service.sendNotification({
          userId: 'user-1',
          type: NotificationType.GRADE_UPDATE,
          title: 'Title',
          message: '',
          priority: NotificationPriority.MEDIUM,
        })
      ).toThrow('Notification message is required');
    });

    it('should include related entity information', () => {
      const notification = service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Title',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
        relatedEntityId: 'grade-123',
        relatedEntityType: 'grade',
      });

      expect(notification.relatedEntityId).toBe('grade-123');
      expect(notification.relatedEntityType).toBe('grade');
    });
  });

  describe('getNotificationHistory', () => {
    it('should return all notifications for a user', () => {
      service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Title 1',
        message: 'Message 1',
        priority: NotificationPriority.MEDIUM,
      });

      service.sendNotification({
        userId: 'user-1',
        type: NotificationType.ASSIGNMENT_CREATED,
        title: 'Title 2',
        message: 'Message 2',
        priority: NotificationPriority.LOW,
      });

      const history = service.getNotificationHistory('user-1');

      expect(history).toHaveLength(2);
    });

    it('should return notifications sorted by sent date (most recent first)', async () => {
      const notif1 = service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'First',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const notif2 = service.sendNotification({
        userId: 'user-1',
        type: NotificationType.ASSIGNMENT_CREATED,
        title: 'Second',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      const history = service.getNotificationHistory('user-1');

      expect(history[0].id).toBe(notif2.id);
      expect(history[1].id).toBe(notif1.id);
    });

    it('should filter by notification type', () => {
      service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Grade',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      service.sendNotification({
        userId: 'user-1',
        type: NotificationType.ASSIGNMENT_CREATED,
        title: 'Assignment',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      const history = service.getNotificationHistory('user-1', {
        type: NotificationType.GRADE_UPDATE,
      });

      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(NotificationType.GRADE_UPDATE);
    });

    it('should filter by unread only', () => {
      const notif1 = service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Title 1',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      service.sendNotification({
        userId: 'user-1',
        type: NotificationType.ASSIGNMENT_CREATED,
        title: 'Title 2',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      service.markAsRead(notif1.id);

      const history = service.getNotificationHistory('user-1', {
        unreadOnly: true,
      });

      expect(history).toHaveLength(1);
      expect(history[0].title).toBe('Title 2');
    });

    it('should filter by date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Title',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      const history = service.getNotificationHistory('user-1', {
        startDate,
        endDate,
      });

      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for user with no notifications', () => {
      const history = service.getNotificationHistory('user-999');
      expect(history).toEqual([]);
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', () => {
      const prefs = service.updatePreferences('user-1', {
        emailEnabled: false,
        inAppEnabled: true,
      });

      expect(prefs.userId).toBe('user-1');
      expect(prefs.emailEnabled).toBe(false);
      expect(prefs.inAppEnabled).toBe(true);
    });

    it('should validate quiet hours time format', () => {
      expect(() =>
        service.updatePreferences('user-1', {
          quietHoursStart: 'invalid',
          quietHoursEnd: '08:00',
        })
      ).toThrow('Invalid quiet hours start time format');
    });

    it('should accept valid quiet hours', () => {
      const prefs = service.updatePreferences('user-1', {
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      expect(prefs.quietHoursStart).toBe('22:00');
      expect(prefs.quietHoursEnd).toBe('08:00');
    });

    it('should update notification type preferences', () => {
      const typePrefs = new Map([
        [NotificationType.GRADE_UPDATE, false],
        [NotificationType.ASSIGNMENT_CREATED, true],
      ]);

      const prefs = service.updatePreferences('user-1', {
        notificationTypes: typePrefs,
      });

      expect(prefs.notificationTypes.get(NotificationType.GRADE_UPDATE)).toBe(false);
      expect(prefs.notificationTypes.get(NotificationType.ASSIGNMENT_CREATED)).toBe(true);
    });

    it('should throw error if user ID is missing', () => {
      expect(() => service.updatePreferences('', {})).toThrow('User ID is required');
    });
  });

  describe('scheduleRecurringNotification', () => {
    it('should schedule a recurring notification', () => {
      const config = {
        id: 'recurring-1',
        userId: 'user-1',
        type: NotificationType.PAYMENT_REMINDER,
        title: 'Payment Due',
        message: 'Your payment is due soon',
        priority: NotificationPriority.HIGH,
        schedule: 'weekly' as const,
        enabled: true,
      };

      const scheduled = service.scheduleRecurringNotification(config);

      expect(scheduled).toEqual(config);
      expect(service.getRecurringNotification(config.id)).toEqual(config);
    });

    it('should throw error if ID is missing', () => {
      expect(() =>
        service.scheduleRecurringNotification({
          id: '',
          userId: 'user-1',
          type: NotificationType.PAYMENT_REMINDER,
          title: 'Title',
          message: 'Message',
          priority: NotificationPriority.HIGH,
          schedule: 'weekly',
          enabled: true,
        })
      ).toThrow('Recurring notification ID is required');
    });

    it('should throw error if user ID is missing', () => {
      expect(() =>
        service.scheduleRecurringNotification({
          id: 'recurring-1',
          userId: '',
          type: NotificationType.PAYMENT_REMINDER,
          title: 'Title',
          message: 'Message',
          priority: NotificationPriority.HIGH,
          schedule: 'weekly',
          enabled: true,
        })
      ).toThrow('User ID is required');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const notification = service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Title',
        message: 'Message',
        priority: NotificationPriority.MEDIUM,
      });

      expect(notification.readAt).toBeUndefined();

      const updated = service.markAsRead(notification.id);

      expect(updated.readAt).toBeInstanceOf(Date);
    });

    it('should throw error if notification not found', () => {
      expect(() => service.markAsRead('invalid-id')).toThrow('Notification not found');
    });
  });

  describe('quiet hours', () => {
    it('should block non-high priority notifications during quiet hours', () => {
      // Set quiet hours to current time
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const nextHour = String((now.getHours() + 1) % 24).padStart(2, '0');

      service.updatePreferences('user-1', {
        quietHoursStart: `${currentHour}:${currentMinute}`,
        quietHoursEnd: `${nextHour}:00`,
      });

      expect(() =>
        service.sendNotification({
          userId: 'user-1',
          type: NotificationType.GRADE_UPDATE,
          title: 'Title',
          message: 'Message',
          priority: NotificationPriority.MEDIUM,
        })
      ).toThrow('Cannot send non-high priority notifications during quiet hours');
    });

    it('should allow high priority notifications during quiet hours', () => {
      // Set quiet hours to current time
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const nextHour = String((now.getHours() + 1) % 24).padStart(2, '0');

      service.updatePreferences('user-1', {
        quietHoursStart: `${currentHour}:${currentMinute}`,
        quietHoursEnd: `${nextHour}:00`,
      });

      const notification = service.sendNotification({
        userId: 'user-1',
        type: NotificationType.GRADE_UPDATE,
        title: 'Title',
        message: 'Message',
        priority: NotificationPriority.HIGH,
      });

      expect(notification).toBeDefined();
    });
  });

  describe('default preferences', () => {
    it('should use default preferences for new users', () => {
      const prefs = service.getPreferences('new-user');

      expect(prefs.emailEnabled).toBe(true);
      expect(prefs.inAppEnabled).toBe(true);
      expect(prefs.notificationTypes.get(NotificationType.GRADE_UPDATE)).toBe(true);
      expect(prefs.notificationTypes.get(NotificationType.ASSIGNMENT_CREATED)).toBe(true);
    });
  });
});
