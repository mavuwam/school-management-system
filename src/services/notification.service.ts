import {
  Notification,
  NotificationPreferences,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../models';

export interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface RecurringNotificationConfig {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  schedule: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private recurringNotifications: Map<string, RecurringNotificationConfig> = new Map();
  private userNotifications: Map<string, string[]> = new Map(); // userId -> notificationIds[]

  /**
   * Sends a notification with channel routing based on user preferences
   */
  sendNotification(input: SendNotificationInput): Notification {
    // Validate required fields
    if (!input.userId) {
      throw new Error('User ID is required');
    }
    if (!input.type) {
      throw new Error('Notification type is required');
    }
    if (!input.title || input.title.trim() === '') {
      throw new Error('Notification title is required');
    }
    if (!input.message || input.message.trim() === '') {
      throw new Error('Notification message is required');
    }
    if (!input.priority) {
      throw new Error('Notification priority is required');
    }

    // Get user preferences
    const userPrefs = this.preferences.get(input.userId) || this.getDefaultPreferences(input.userId);

    // Check if user has enabled this notification type
    const typeEnabled = userPrefs.notificationTypes.get(input.type);
    if (typeEnabled === false) {
      // User has disabled this notification type, don't send
      throw new Error(`Notification type ${input.type} is disabled for user ${input.userId}`);
    }

    // Determine channels based on preferences
    const channels: NotificationChannel[] = [];
    if (userPrefs.emailEnabled) {
      channels.push(NotificationChannel.EMAIL);
    }
    if (userPrefs.inAppEnabled) {
      channels.push(NotificationChannel.IN_APP);
    }

    // Check quiet hours
    if (this.isInQuietHours(userPrefs)) {
      // Only send high priority notifications during quiet hours
      if (input.priority !== NotificationPriority.HIGH) {
        throw new Error('Cannot send non-high priority notifications during quiet hours');
      }
    }

    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random()}`,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority,
      channels,
      sentAt: new Date(),
      relatedEntityId: input.relatedEntityId,
      relatedEntityType: input.relatedEntityType,
    };

    this.notifications.set(notification.id, notification);

    // Index by user
    const userNotificationList = this.userNotifications.get(input.userId) || [];
    userNotificationList.push(notification.id);
    this.userNotifications.set(input.userId, userNotificationList);

    return notification;
  }

  /**
   * Gets notification history for a user with optional filtering
   */
  getNotificationHistory(
    userId: string,
    filters?: {
      type?: NotificationType;
      unreadOnly?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): Notification[] {
    const notificationIds = this.userNotifications.get(userId) || [];
    let notifications: Notification[] = [];

    for (const notificationId of notificationIds) {
      const notification = this.notifications.get(notificationId);
      if (notification) {
        notifications.push(notification);
      }
    }

    // Apply filters
    if (filters) {
      if (filters.type) {
        notifications = notifications.filter((n) => n.type === filters.type);
      }
      if (filters.unreadOnly) {
        notifications = notifications.filter((n) => !n.readAt);
      }
      if (filters.startDate) {
        notifications = notifications.filter((n) => n.sentAt >= filters.startDate!);
      }
      if (filters.endDate) {
        notifications = notifications.filter((n) => n.sentAt <= filters.endDate!);
      }
    }

    // Sort by sent date (most recent first)
    notifications.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());

    return notifications;
  }

  /**
   * Updates user notification preferences
   */
  updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): NotificationPreferences {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const currentPrefs = this.preferences.get(userId) || this.getDefaultPreferences(userId);

    // Validate quiet hours if provided
    if (preferences.quietHoursStart && preferences.quietHoursEnd) {
      if (!this.isValidTimeFormat(preferences.quietHoursStart)) {
        throw new Error('Invalid quiet hours start time format (use HH:MM)');
      }
      if (!this.isValidTimeFormat(preferences.quietHoursEnd)) {
        throw new Error('Invalid quiet hours end time format (use HH:MM)');
      }
    }

    const updatedPrefs: NotificationPreferences = {
      userId,
      emailEnabled: preferences.emailEnabled ?? currentPrefs.emailEnabled,
      inAppEnabled: preferences.inAppEnabled ?? currentPrefs.inAppEnabled,
      notificationTypes: preferences.notificationTypes || currentPrefs.notificationTypes,
      quietHoursStart: preferences.quietHoursStart ?? currentPrefs.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd ?? currentPrefs.quietHoursEnd,
    };

    this.preferences.set(userId, updatedPrefs);
    return updatedPrefs;
  }

  /**
   * Schedules a recurring notification
   */
  scheduleRecurringNotification(config: RecurringNotificationConfig): RecurringNotificationConfig {
    if (!config.id) {
      throw new Error('Recurring notification ID is required');
    }
    if (!config.userId) {
      throw new Error('User ID is required');
    }
    if (!config.schedule) {
      throw new Error('Schedule is required');
    }

    this.recurringNotifications.set(config.id, config);
    return config;
  }

  /**
   * Marks a notification as read
   */
  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.readAt = new Date();
    return notification;
  }

  /**
   * Gets user preferences
   */
  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || this.getDefaultPreferences(userId);
  }

  /**
   * Gets a notification by ID
   */
  getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Gets recurring notification config
   */
  getRecurringNotification(configId: string): RecurringNotificationConfig | undefined {
    return this.recurringNotifications.get(configId);
  }

  // Helper methods

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      emailEnabled: true,
      inAppEnabled: true,
      notificationTypes: new Map([
        [NotificationType.GRADE_UPDATE, true],
        [NotificationType.ASSIGNMENT_CREATED, true],
        [NotificationType.ASSIGNMENT_DUE_SOON, true],
        [NotificationType.PAYMENT_REMINDER, true],
        [NotificationType.TIMETABLE_CHANGE, true],
        [NotificationType.ATTENDANCE_ALERT, true],
      ]),
    };
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // Handle cases where quiet hours span midnight
    if (start <= end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Clears all data (for testing)
   */
  clear(): void {
    this.notifications.clear();
    this.preferences.clear();
    this.recurringNotifications.clear();
    this.userNotifications.clear();
  }
}
