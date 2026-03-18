import { EncryptionService } from './encryption.service';
import { RBACMiddleware } from '../middleware/rbac.middleware';
import { ExportService } from './export.service';
import { UserRole } from '../models';

describe('Security Services', () => {
  describe('EncryptionService', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService();
    });

    it('should encrypt and decrypt data', () => {
      const originalData = 'sensitive information';
      const encrypted = service.encrypt(originalData);
      const decrypted = service.decrypt(encrypted);

      expect(encrypted).not.toBe(originalData);
      expect(decrypted).toBe(originalData);
    });

    it('should hash and verify passwords', () => {
      const password = 'mySecurePassword123';
      const hash = service.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(service.verifyPassword(password, hash)).toBe(true);
      expect(service.verifyPassword('wrongPassword', hash)).toBe(false);
    });
  });

  describe('RBACMiddleware', () => {
    let middleware: RBACMiddleware;

    beforeEach(() => {
      middleware = new RBACMiddleware();
    });

    it('should allow students to view their own grades', () => {
      const hasPermission = middleware.checkPermission({
        userId: 'student-1',
        userRole: UserRole.STUDENT,
        schoolId: 'school-1',
        requestedResource: 'own-grades',
        requestedAction: 'view',
      });

      expect(hasPermission).toBe(true);
    });

    it('should not allow students to create grades', () => {
      const hasPermission = middleware.checkPermission({
        userId: 'student-1',
        userRole: UserRole.STUDENT,
        schoolId: 'school-1',
        requestedResource: 'grades',
        requestedAction: 'create',
      });

      expect(hasPermission).toBe(false);
    });

    it('should allow teachers to create grades', () => {
      const hasPermission = middleware.checkPermission({
        userId: 'teacher-1',
        userRole: UserRole.TEACHER,
        schoolId: 'school-1',
        requestedResource: 'grades',
        requestedAction: 'create',
      });

      expect(hasPermission).toBe(true);
    });

    it('should allow school heads to view all grades', () => {
      const hasPermission = middleware.checkPermission({
        userId: 'head-1',
        userRole: UserRole.SCHOOL_HEAD,
        schoolId: 'school-1',
        requestedResource: 'all-grades',
        requestedAction: 'view',
      });

      expect(hasPermission).toBe(true);
    });

    it('should prevent cross-school access', () => {
      const hasAccess = middleware.checkSchoolAccess('school-1', 'school-2');
      expect(hasAccess).toBe(false);
    });

    it('should allow same-school access', () => {
      const hasAccess = middleware.checkSchoolAccess('school-1', 'school-1');
      expect(hasAccess).toBe(true);
    });
  });

  describe('ExportService', () => {
    let service: ExportService;

    beforeEach(() => {
      service = new ExportService();
    });

    it('should export user data in JSON format', () => {
      const exported = service.exportUserData('user-1', {
        format: 'json',
        includeGrades: true,
        includeAttendance: true,
      });

      const data = JSON.parse(exported);
      expect(data.userId).toBe('user-1');
      expect(data.data.grades).toBeDefined();
      expect(data.data.attendance).toBeDefined();
    });

    it('should export user data in CSV format', () => {
      const exported = service.exportUserData('user-1', {
        format: 'csv',
        includeGrades: true,
      });

      expect(exported).toContain('Section,Data');
      expect(exported).toContain('grades');
    });

    it('should validate export requests', () => {
      expect(service.validateExportRequest('user-1', 'user-1')).toBe(true);
      expect(service.validateExportRequest('user-1', 'user-2')).toBe(false);
    });

    it('should throw error for unsupported format', () => {
      expect(() =>
        service.exportUserData('user-1', {
          format: 'xml' as any,
        })
      ).toThrow('Unsupported export format');
    });
  });
});
