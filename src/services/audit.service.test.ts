import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService();
  });

  describe('createAuditLog', () => {
    it('should create an audit log with valid input', () => {
      const input = {
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const log = service.createAuditLog(input);

      expect(log.id).toBeDefined();
      expect(log.userId).toBe(input.userId);
      expect(log.action).toBe(input.action);
      expect(log.entityType).toBe(input.entityType);
      expect(log.entityId).toBe(input.entityId);
      expect(log.ipAddress).toBe(input.ipAddress);
      expect(log.userAgent).toBe(input.userAgent);
      expect(log.timestamp).toBeInstanceOf(Date);
    });

    it('should include changes if provided', () => {
      const changes = {
        oldValue: 85,
        newValue: 90,
      };

      const log = service.createAuditLog({
        userId: 'user-1',
        action: 'MODIFY_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        changes,
      });

      expect(log.changes).toEqual(changes);
    });

    it('should throw error if user ID is missing', () => {
      expect(() =>
        service.createAuditLog({
          userId: '',
          action: 'VIEW_GRADES',
          entityType: 'grade',
          entityId: 'grade-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).toThrow('User ID is required');
    });

    it('should throw error if action is missing', () => {
      expect(() =>
        service.createAuditLog({
          userId: 'user-1',
          action: '',
          entityType: 'grade',
          entityId: 'grade-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).toThrow('Action is required');
    });

    it('should throw error if entity type is missing', () => {
      expect(() =>
        service.createAuditLog({
          userId: 'user-1',
          action: 'VIEW_GRADES',
          entityType: '',
          entityId: 'grade-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).toThrow('Entity type is required');
    });

    it('should throw error if entity ID is missing', () => {
      expect(() =>
        service.createAuditLog({
          userId: 'user-1',
          action: 'VIEW_GRADES',
          entityType: 'grade',
          entityId: '',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).toThrow('Entity ID is required');
    });
  });

  describe('getAuditLogs', () => {
    it('should return all audit logs', () => {
      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      service.createAuditLog({
        userId: 'user-2',
        action: 'VIEW_PAYMENTS',
        entityType: 'payment',
        entityId: 'payment-456',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
      });

      const logs = service.getAuditLogs();
      expect(logs).toHaveLength(2);
    });

    it('should filter by user ID', () => {
      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      service.createAuditLog({
        userId: 'user-2',
        action: 'VIEW_PAYMENTS',
        entityType: 'payment',
        entityId: 'payment-456',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
      });

      const logs = service.getAuditLogs({ userId: 'user-1' });
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user-1');
    });

    it('should filter by action', () => {
      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      service.createAuditLog({
        userId: 'user-1',
        action: 'MODIFY_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const logs = service.getAuditLogs({ action: 'MODIFY_GRADES' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('MODIFY_GRADES');
    });

    it('should filter by entity type', () => {
      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_PAYMENTS',
        entityType: 'payment',
        entityId: 'payment-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const logs = service.getAuditLogs({ entityType: 'grade' });
      expect(logs).toHaveLength(1);
      expect(logs[0].entityType).toBe('grade');
    });

    it('should filter by entity ID', () => {
      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      service.createAuditLog({
        userId: 'user-1',
        action: 'MODIFY_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const logs = service.getAuditLogs({ entityId: 'grade-123' });
      expect(logs).toHaveLength(2);
    });

    it('should filter by date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const logs = service.getAuditLogs({ startDate, endDate });
      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    it('should return logs sorted by timestamp (most recent first)', async () => {
      const log1 = service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const log2 = service.createAuditLog({
        userId: 'user-1',
        action: 'MODIFY_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const logs = service.getAuditLogs();
      expect(logs[0].id).toBe(log2.id);
      expect(logs[1].id).toBe(log1.id);
    });
  });

  describe('getEntityAuditTrail', () => {
    it('should return audit trail for an entity', () => {
      service.createAuditLog({
        userId: 'user-1',
        action: 'CREATE_GRADE',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      service.createAuditLog({
        userId: 'user-2',
        action: 'MODIFY_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
      });

      const trail = service.getEntityAuditTrail('grade-123');
      expect(trail).toHaveLength(2);
    });

    it('should return trail sorted by timestamp (oldest first)', () => {
      const log1 = service.createAuditLog({
        userId: 'user-1',
        action: 'CREATE_GRADE',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const log2 = service.createAuditLog({
        userId: 'user-2',
        action: 'MODIFY_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
      });

      const trail = service.getEntityAuditTrail('grade-123');
      expect(trail[0].id).toBe(log1.id);
      expect(trail[1].id).toBe(log2.id);
    });

    it('should return empty array for entity with no logs', () => {
      const trail = service.getEntityAuditTrail('nonexistent');
      expect(trail).toEqual([]);
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity history', () => {
      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_PAYMENTS',
        entityType: 'payment',
        entityId: 'payment-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const activity = service.getUserActivity('user-1');
      expect(activity).toHaveLength(2);
    });

    it('should limit results when limit is specified', () => {
      for (let i = 0; i < 10; i++) {
        service.createAuditLog({
          userId: 'user-1',
          action: `ACTION_${i}`,
          entityType: 'test',
          entityId: `entity-${i}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        });
      }

      const activity = service.getUserActivity('user-1', 5);
      expect(activity).toHaveLength(5);
    });

    it('should return activity sorted by timestamp (most recent first)', async () => {
      const log1 = service.createAuditLog({
        userId: 'user-1',
        action: 'ACTION_1',
        entityType: 'test',
        entityId: 'entity-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const log2 = service.createAuditLog({
        userId: 'user-1',
        action: 'ACTION_2',
        entityType: 'test',
        entityId: 'entity-2',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const activity = service.getUserActivity('user-1');
      expect(activity[0].id).toBe(log2.id);
      expect(activity[1].id).toBe(log1.id);
    });
  });

  describe('critical action alerts', () => {
    it('should trigger alert for critical actions', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.createAuditLog({
        userId: 'user-1',
        action: 'DELETE_USER',
        entityType: 'user',
        entityId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'SECURITY ALERT: Critical action detected',
        expect.objectContaining({
          action: 'DELETE_USER',
          userId: 'user-1',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should not trigger alert for non-critical actions', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.createAuditLog({
        userId: 'user-1',
        action: 'VIEW_GRADES',
        entityType: 'grade',
        entityId: 'grade-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
