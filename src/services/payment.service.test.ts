// Payment Service Unit Tests
import { PaymentService } from './payment.service';
import { PaymentMethod, PaymentStatus, UserRole, Student } from '../models';
import { PaymentEntry, PaymentFilters, OnlinePaymentRequest } from '../interfaces/payment.interface';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let testStudent: Student;

  beforeEach(() => {
    paymentService = new PaymentService();

    testStudent = {
      id: 'student1',
      username: 'john.doe',
      passwordHash: 'hash',
      email: 'john@example.com',
      role: UserRole.STUDENT,
      schoolId: 'school1',
      mfaEnabled: false,
      createdAt: new Date(),
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('2005-01-01'),
      enrollmentDate: new Date('2020-09-01'),
      gradeLevel: '10',
      parentIds: [],
    };

    paymentService.addStudent(testStudent);
  });

  describe('recordPayment', () => {
    it('should record a valid payment', async () => {
      const payment: PaymentEntry = {
        studentId: 'student1',
        amount: 100,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      };

      await paymentService.recordPayment(payment);

      const records = await paymentService.getPaymentRecords('student1', {});
      expect(records).toHaveLength(1);
      expect(records[0].amount).toBe(100);
      expect(records[0].purpose).toBe('Tuition');
    });

    it('should reject payment for non-existent student', async () => {
      const payment: PaymentEntry = {
        studentId: 'nonexistent',
        amount: 100,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      };

      await expect(paymentService.recordPayment(payment)).rejects.toThrow('Student not found');
    });

    it('should reject negative payment amount', async () => {
      const payment: PaymentEntry = {
        studentId: 'student1',
        amount: -50,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      };

      await expect(paymentService.recordPayment(payment)).rejects.toThrow(
        'Payment amount must be positive'
      );
    });

    it('should reject zero payment amount', async () => {
      const payment: PaymentEntry = {
        studentId: 'student1',
        amount: 0,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      };

      await expect(paymentService.recordPayment(payment)).rejects.toThrow(
        'Payment amount must be positive'
      );
    });
  });

  describe('getPaymentRecords', () => {
    beforeEach(async () => {
      // Add multiple payments
      const payments: PaymentEntry[] = [
        {
          studentId: 'student1',
          amount: 100,
          date: new Date('2024-01-15'),
          paymentMethod: PaymentMethod.CASH,
          purpose: 'Tuition',
          status: PaymentStatus.COMPLETED,
          recordedBy: 'admin1',
        },
        {
          studentId: 'student1',
          amount: 50,
          date: new Date('2024-02-15'),
          paymentMethod: PaymentMethod.CARD,
          purpose: 'Books',
          status: PaymentStatus.PENDING,
          recordedBy: 'admin1',
        },
        {
          studentId: 'student1',
          amount: 200,
          date: new Date('2024-03-15'),
          paymentMethod: PaymentMethod.ONLINE,
          purpose: 'Lab Fees',
          status: PaymentStatus.COMPLETED,
          recordedBy: 'admin1',
        },
      ];

      for (const payment of payments) {
        await paymentService.recordPayment(payment);
      }
    });

    it('should return all payments without filters', async () => {
      const records = await paymentService.getPaymentRecords('student1', {});
      expect(records).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const filters: PaymentFilters = { status: PaymentStatus.COMPLETED };
      const records = await paymentService.getPaymentRecords('student1', filters);
      expect(records).toHaveLength(2);
      expect(records.every((r) => r.status === PaymentStatus.COMPLETED)).toBe(true);
    });

    it('should filter by date range', async () => {
      const filters: PaymentFilters = {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-28'),
      };
      const records = await paymentService.getPaymentRecords('student1', filters);
      expect(records).toHaveLength(1);
      expect(records[0].amount).toBe(50);
    });

    it('should filter by amount range', async () => {
      const filters: PaymentFilters = {
        minAmount: 75,
        maxAmount: 150,
      };
      const records = await paymentService.getPaymentRecords('student1', filters);
      expect(records).toHaveLength(1);
      expect(records[0].amount).toBe(100);
    });

    it('should filter by payment method', async () => {
      const filters: PaymentFilters = { paymentMethod: PaymentMethod.ONLINE };
      const records = await paymentService.getPaymentRecords('student1', filters);
      expect(records).toHaveLength(1);
      expect(records[0].paymentMethod).toBe(PaymentMethod.ONLINE);
    });

    it('should apply multiple filters', async () => {
      const filters: PaymentFilters = {
        status: PaymentStatus.COMPLETED,
        minAmount: 150,
      };
      const records = await paymentService.getPaymentRecords('student1', filters);
      expect(records).toHaveLength(1);
      expect(records[0].amount).toBe(200);
    });
  });

  describe('getBalance', () => {
    it('should calculate balance correctly', async () => {
      paymentService.setCharges('student1', 500);

      await paymentService.recordPayment({
        studentId: 'student1',
        amount: 200,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      });

      const balance = await paymentService.getBalance('student1');
      expect(balance).toBe(300); // 500 - 200
    });

    it('should only count completed payments', async () => {
      paymentService.setCharges('student1', 500);

      await paymentService.recordPayment({
        studentId: 'student1',
        amount: 200,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      });

      await paymentService.recordPayment({
        studentId: 'student1',
        amount: 100,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Books',
        status: PaymentStatus.PENDING,
        recordedBy: 'admin1',
      });

      const balance = await paymentService.getBalance('student1');
      expect(balance).toBe(300); // 500 - 200 (pending not counted)
    });

    it('should return zero balance when no charges or payments', async () => {
      const balance = await paymentService.getBalance('student1');
      expect(balance).toBe(0);
    });

    it('should handle negative balance (credit)', async () => {
      paymentService.setCharges('student1', 100);

      await paymentService.recordPayment({
        studentId: 'student1',
        amount: 150,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      });

      const balance = await paymentService.getBalance('student1');
      expect(balance).toBe(-50); // 100 - 150
    });
  });

  describe('generateReminders', () => {
    it('should generate reminders for overdue balances', async () => {
      paymentService.setCharges('student1', 500);

      // Add payment more than 30 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      await paymentService.recordPayment({
        studentId: 'student1',
        amount: 100,
        date: oldDate,
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      });

      const reminders = await paymentService.generateReminders('school1');
      expect(reminders).toHaveLength(1);
      expect(reminders[0].studentId).toBe('student1');
      expect(reminders[0].balance).toBe(400);
      expect(reminders[0].daysPastDue).toBeGreaterThan(30);
    });

    it('should not generate reminders for balances within 30 days', async () => {
      paymentService.setCharges('student1', 500);

      // Add recent payment
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 15);

      await paymentService.recordPayment({
        studentId: 'student1',
        amount: 100,
        date: recentDate,
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      });

      const reminders = await paymentService.generateReminders('school1');
      expect(reminders).toHaveLength(0);
    });

    it('should not generate reminders for zero or negative balances', async () => {
      paymentService.setCharges('student1', 100);

      await paymentService.recordPayment({
        studentId: 'student1',
        amount: 100,
        date: new Date(),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      });

      const reminders = await paymentService.generateReminders('school1');
      expect(reminders).toHaveLength(0);
    });
  });

  describe('processOnlinePayment', () => {
    it('should process valid online payment', async () => {
      paymentService.setCharges('student1', 500);

      const request: OnlinePaymentRequest = {
        studentId: 'student1',
        amount: 200,
        purpose: 'Tuition',
        gatewayToken: 'valid_token_123',
        schoolId: 'school1',
      };

      const result = await paymentService.processOnlinePayment(request);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.paymentRecordId).toBeDefined();

      const balance = await paymentService.getBalance('student1');
      expect(balance).toBe(300);
    });

    it('should reject payment with invalid gateway token', async () => {
      const request: OnlinePaymentRequest = {
        studentId: 'student1',
        amount: 200,
        purpose: 'Tuition',
        gatewayToken: 'invalid_token_123',
        schoolId: 'school1',
      };

      const result = await paymentService.processOnlinePayment(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment gateway declined the transaction');
    });

    it('should reject payment for non-existent student', async () => {
      const request: OnlinePaymentRequest = {
        studentId: 'nonexistent',
        amount: 200,
        purpose: 'Tuition',
        gatewayToken: 'valid_token_123',
        schoolId: 'school1',
      };

      const result = await paymentService.processOnlinePayment(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Student not found');
    });

    it('should reject payment for wrong school', async () => {
      const request: OnlinePaymentRequest = {
        studentId: 'student1',
        amount: 200,
        purpose: 'Tuition',
        gatewayToken: 'valid_token_123',
        schoolId: 'school2',
      };

      const result = await paymentService.processOnlinePayment(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Student does not belong to this school');
    });
  });

  describe('generatePaymentReport', () => {
    beforeEach(async () => {
      // Add test student 2
      const student2: Student = {
        ...testStudent,
        id: 'student2',
        username: 'jane.doe',
        email: 'jane@example.com',
      };
      paymentService.addStudent(student2);

      // Add payments for both students
      await paymentService.recordPayment({
        studentId: 'student1',
        amount: 100,
        date: new Date('2024-01-15'),
        paymentMethod: PaymentMethod.CASH,
        purpose: 'Tuition',
        status: PaymentStatus.COMPLETED,
        recordedBy: 'admin1',
      });

      await paymentService.recordPayment({
        studentId: 'student2',
        amount: 200,
        date: new Date('2024-02-15'),
        paymentMethod: PaymentMethod.CARD,
        purpose: 'Books',
        status: PaymentStatus.PENDING,
        recordedBy: 'admin1',
      });
    });

    it('should generate report for all payments in school', async () => {
      const report = await paymentService.generatePaymentReport('school1', {});

      expect(report.schoolId).toBe('school1');
      expect(report.totalPayments).toBe(2);
      expect(report.totalAmount).toBe(300);
      expect(report.records).toHaveLength(2);
    });

    it('should filter report by student', async () => {
      const report = await paymentService.generatePaymentReport('school1', {
        studentId: 'student1',
      });

      expect(report.totalPayments).toBe(1);
      expect(report.totalAmount).toBe(100);
      expect(report.records[0].studentId).toBe('student1');
    });

    it('should filter report by date range', async () => {
      const report = await paymentService.generatePaymentReport('school1', {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-28'),
      });

      expect(report.totalPayments).toBe(1);
      expect(report.records[0].amount).toBe(200);
    });

    it('should filter report by status', async () => {
      const report = await paymentService.generatePaymentReport('school1', {
        status: PaymentStatus.COMPLETED,
      });

      expect(report.totalPayments).toBe(1);
      expect(report.records[0].status).toBe(PaymentStatus.COMPLETED);
    });

    it('should include summary statistics', async () => {
      const report = await paymentService.generatePaymentReport('school1', {});

      expect(report.summary.byStatus.get(PaymentStatus.COMPLETED)).toBe(1);
      expect(report.summary.byStatus.get(PaymentStatus.PENDING)).toBe(1);
      expect(report.summary.byMethod.get(PaymentMethod.CASH)).toBe(1);
      expect(report.summary.byMethod.get(PaymentMethod.CARD)).toBe(1);
    });
  });
});
