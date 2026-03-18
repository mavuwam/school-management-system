import { AuditLog } from '../models';

export interface CreateAuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  userAgent: string;
  changes?: Record<string, any>;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AuditService {
  private auditLogs: Map<string, AuditLog> = new Map();
  private userLogs: Map<string, string[]> = new Map(); // userId -> logIds[]
  private entityLogs: Map<string, string[]> = new Map(); // entityId -> logIds[]
  private criticalActions = new Set([
    'DELETE_USER',
    'DELETE_SCHOOL',
    'MODIFY_GRADES',
    'ACCESS_SENSITIVE_DATA',
    'CHANGE_PERMISSIONS',
    'EXPORT_DATA',
  ]);

  /**
   * Creates an audit log entry for sensitive data access
   */
  createAuditLog(input: CreateAuditLogInput): AuditLog {
    // Validate required fields
    if (!input.userId) {
      throw new Error('User ID is required');
    }
    if (!input.action || input.action.trim() === '') {
      throw new Error('Action is required');
    }
    if (!input.entityType || input.entityType.trim() === '') {
      throw new Error('Entity type is required');
    }
    if (!input.entityId || input.entityId.trim() === '') {
      throw new Error('Entity ID is required');
    }
    if (!input.ipAddress) {
      throw new Error('IP address is required');
    }
    if (!input.userAgent) {
      throw new Error('User agent is required');
    }

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random()}`,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      timestamp: new Date(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      changes: input.changes,
    };

    this.auditLogs.set(auditLog.id, auditLog);

    // Index by user
    const userLogList = this.userLogs.get(input.userId) || [];
    userLogList.push(auditLog.id);
    this.userLogs.set(input.userId, userLogList);

    // Index by entity
    const entityLogList = this.entityLogs.get(input.entityId) || [];
    entityLogList.push(auditLog.id);
    this.entityLogs.set(input.entityId, entityLogList);

    // Check if this is a critical action that needs alerting
    if (this.criticalActions.has(input.action)) {
      this.triggerSecurityAlert(auditLog);
    }

    return auditLog;
  }

  /**
   * Retrieves audit logs with optional filtering
   */
  getAuditLogs(filter?: AuditLogFilter): AuditLog[] {
    let logs: AuditLog[] = Array.from(this.auditLogs.values());

    // Apply filters
    if (filter) {
      if (filter.userId) {
        logs = logs.filter((log) => log.userId === filter.userId);
      }
      if (filter.action) {
        logs = logs.filter((log) => log.action === filter.action);
      }
      if (filter.entityType) {
        logs = logs.filter((log) => log.entityType === filter.entityType);
      }
      if (filter.entityId) {
        logs = logs.filter((log) => log.entityId === filter.entityId);
      }
      if (filter.startDate) {
        logs = logs.filter((log) => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter((log) => log.timestamp <= filter.endDate!);
      }
    }

    // Sort by timestamp (most recent first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logs;
  }

  /**
   * Gets audit trail for a specific entity
   */
  getEntityAuditTrail(entityId: string): AuditLog[] {
    const logIds = this.entityLogs.get(entityId) || [];
    const logs: AuditLog[] = [];

    for (const logId of logIds) {
      const log = this.auditLogs.get(logId);
      if (log) {
        logs.push(log);
      }
    }

    // Sort by timestamp (oldest first for audit trail)
    logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return logs;
  }

  /**
   * Gets user activity history
   */
  getUserActivity(userId: string, limit?: number): AuditLog[] {
    const logIds = this.userLogs.get(userId) || [];
    const logs: AuditLog[] = [];

    for (const logId of logIds) {
      const log = this.auditLogs.get(logId);
      if (log) {
        logs.push(log);
      }
    }

    // Sort by timestamp (most recent first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (limit) {
      return logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * Triggers security alert for critical actions
   */
  private triggerSecurityAlert(auditLog: AuditLog): void {
    // In a real implementation, this would send alerts via email, SMS, or monitoring system
    console.warn(`SECURITY ALERT: Critical action detected`, {
      action: auditLog.action,
      userId: auditLog.userId,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      timestamp: auditLog.timestamp,
    });
  }

  /**
   * Gets an audit log by ID
   */
  getAuditLog(logId: string): AuditLog | undefined {
    return this.auditLogs.get(logId);
  }

  /**
   * Clears all data (for testing)
   */
  clear(): void {
    this.auditLogs.clear();
    this.userLogs.clear();
    this.entityLogs.clear();
  }
}
