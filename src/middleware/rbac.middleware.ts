import { UserRole } from '../models';

/**
 * Role-Based Access Control Middleware
 * 
 * NOTE: This is a placeholder implementation for demonstration purposes.
 * In a production environment, integrate with your web framework (Express, Fastify, etc.)
 */

export interface RBACContext {
  userId: string;
  userRole: UserRole;
  schoolId: string;
  requestedResource: string;
  requestedAction: string;
}

export class RBACMiddleware {
  private permissions: Map<UserRole, Set<string>> = new Map();

  constructor() {
    this.initializePermissions();
  }

  /**
   * Initializes role-based permissions
   */
  private initializePermissions(): void {
    // Student permissions
    this.permissions.set(
      UserRole.STUDENT,
      new Set([
        'view:own-grades',
        'view:own-attendance',
        'view:own-payments',
        'view:own-assignments',
        'submit:assignments',
        'view:own-timetable',
      ])
    );

    // Teacher permissions
    this.permissions.set(
      UserRole.TEACHER,
      new Set([
        'view:student-grades',
        'create:grades',
        'update:grades',
        'view:student-attendance',
        'create:attendance',
        'create:assignments',
        'view:assignments',
        'view:class-timetable',
      ])
    );

    // School Head permissions
    this.permissions.set(
      UserRole.SCHOOL_HEAD,
      new Set([
        'view:all-grades',
        'view:all-attendance',
        'view:all-payments',
        'view:all-assignments',
        'create:timetable',
        'update:timetable',
        'view:all-timetables',
        'manage:teachers',
        'manage:students',
        'view:reports',
      ])
    );

    // Parent permissions
    this.permissions.set(
      UserRole.PARENT,
      new Set([
        'view:child-grades',
        'view:child-attendance',
        'view:child-payments',
        'make:payments',
        'view:child-assignments',
        'view:child-timetable',
      ])
    );

    // System Admin permissions
    this.permissions.set(
      UserRole.SYSTEM_ADMIN,
      new Set([
        'manage:schools',
        'manage:users',
        'view:audit-logs',
        'manage:system-config',
      ])
    );
  }

  /**
   * Checks if a user has permission to perform an action
   */
  checkPermission(context: RBACContext): boolean {
    const rolePermissions = this.permissions.get(context.userRole);
    if (!rolePermissions) {
      return false;
    }

    const requiredPermission = `${context.requestedAction}:${context.requestedResource}`;
    return rolePermissions.has(requiredPermission);
  }

  /**
   * Prevents cross-school access
   */
  checkSchoolAccess(userSchoolId: string, resourceSchoolId: string): boolean {
    return userSchoolId === resourceSchoolId;
  }

  /**
   * Middleware function for web frameworks
   * In production: Integrate with Express, Fastify, etc.
   */
  authorize(requiredPermission: string) {
    return (context: RBACContext): boolean => {
      const [action, resource] = requiredPermission.split(':');
      return this.checkPermission({
        ...context,
        requestedAction: action,
        requestedResource: resource,
      });
    };
  }
}
