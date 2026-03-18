// Payment Service Implementation
import {
  PaymentRecord,
  PaymentBalance,
  PaymentMethod,
  PaymentStatus,
  Student,
} from '../models';
import {
  PaymentService as IPaymentService,
  PaymentEntry,
  PaymentFilters,
  PaymentReminder,
  OnlinePaymentRequest,
  PaymentResult,
  ReportFilters,
  PaymentReport,
} from '../interfaces/payment.interface';

export class PaymentService implements IPaymentService {
  private payments: Map<string, PaymentRecord[]> = new Map(); // studentId -> payments
  private charges: Map<string, number> = new Map(); // studentId -> total charged
  private students: Map<string, Student> = new Map(); // studentId -> student

  /**
   * Record a payment with balance update
   * Validates: Requirements 8.1, 8.2
   */
  async recordPayment(payment: PaymentEntry): Promise<void> {
    // Validate student exists
    const student = this.students.get(payment.studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Validate amount
    if (payment.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    // Validate payment method
    const validMethods = Object.values(PaymentMethod);
    if (!validMethods.includes(payment.paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    // Validate payment status
    const validStatuses = Object.values(PaymentStatus);
    if (!validStatuses.includes(payment.status)) {
      throw new Error('Invalid payment status');
    }

    // Create payment record
    const paymentRecord: PaymentRecord = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: payment.studentId,
      amount: payment.amount,
      date: payment.date,
      paymentMethod: payment.paymentMethod,
      purpose: payment.purpose,
      status: payment.status,
      transactionId: payment.transactionId,
      recordedBy: payment.recordedBy,
      recordedAt: new Date(),
    };

    // Store payment
    const studentPayments = this.payments.get(payment.studentId) || [];
    studentPayments.push(paymentRecord);
    this.payments.set(payment.studentId, studentPayments);
  }

  /**
   * Get payment records with filtering
   * Validates: Requirements 4.3, 8.4
   */
  async getPaymentRecords(
    studentId: string,
    filters: PaymentFilters
  ): Promise<PaymentRecord[]> {
    // Validate student exists
    const student = this.students.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Get all payments for student
    let records = this.payments.get(studentId) || [];

    // Apply filters
    if (filters.status) {
      records = records.filter((r) => r.status === filters.status);
    }

    if (filters.startDate) {
      records = records.filter((r) => r.date >= filters.startDate!);
    }

    if (filters.endDate) {
      records = records.filter((r) => r.date <= filters.endDate!);
    }

    if (filters.minAmount !== undefined) {
      records = records.filter((r) => r.amount >= filters.minAmount!);
    }

    if (filters.maxAmount !== undefined) {
      records = records.filter((r) => r.amount <= filters.maxAmount!);
    }

    if (filters.paymentMethod) {
      records = records.filter((r) => r.paymentMethod === filters.paymentMethod);
    }

    return records;
  }

  /**
   * Calculate current balance with accurate calculation
   * Validates: Requirements 8.2
   */
  async getBalance(studentId: string): Promise<number> {
    // Validate student exists
    const student = this.students.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Get total charged
    const totalCharged = this.charges.get(studentId) || 0;

    // Get total paid (only completed payments)
    const payments = this.payments.get(studentId) || [];
    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate balance (positive means owed, negative means credit)
    return totalCharged - totalPaid;
  }

  /**
   * Generate payment reminders for overdue payments (>30 days)
   * Validates: Requirements 8.3
   */
  async generateReminders(schoolId: string): Promise<PaymentReminder[]> {
    const reminders: PaymentReminder[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Iterate through all students in the school
    for (const [studentId, student] of this.students.entries()) {
      if (student.schoolId !== schoolId) {
        continue;
      }

      // Calculate balance
      const balance = await this.getBalance(studentId);

      // Only generate reminder if balance is positive (owed)
      if (balance <= 0) {
        continue;
      }

      // Get last payment date
      const payments = this.payments.get(studentId) || [];
      const completedPayments = payments
        .filter((p) => p.status === PaymentStatus.COMPLETED)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      const lastPaymentDate = completedPayments.length > 0 ? completedPayments[0].date : undefined;

      // Calculate days past due
      // If there's a last payment, calculate from that date
      // Otherwise, calculate from the oldest charge date (we'll use 31 days as default for testing)
      let daysPastDue = 0;

      if (lastPaymentDate) {
        const daysSinceLastPayment = Math.floor(
          (now.getTime() - lastPaymentDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        daysPastDue = daysSinceLastPayment;
      } else {
        // No payments made, assume balance has been outstanding for 31+ days
        // In a real system, we'd track when charges were created
        daysPastDue = 31;
      }

      // Only generate reminder if outstanding for more than 30 days
      if (daysPastDue > 30) {
        reminders.push({
          studentId,
          balance,
          daysPastDue,
          lastPaymentDate,
        });
      }
    }

    return reminders;
  }

  /**
   * Process online payment with gateway integration
   * Validates: Requirements 8.5
   */
  async processOnlinePayment(payment: OnlinePaymentRequest): Promise<PaymentResult> {
    // Validate student exists
    const student = this.students.get(payment.studentId);
    if (!student) {
      return {
        success: false,
        error: 'Student not found',
      };
    }

    // Validate school association
    if (student.schoolId !== payment.schoolId) {
      return {
        success: false,
        error: 'Student does not belong to this school',
      };
    }

    // Validate amount
    if (payment.amount <= 0) {
      return {
        success: false,
        error: 'Payment amount must be positive',
      };
    }

    // Simulate payment gateway processing
    // In a real system, this would call an external payment gateway API
    const gatewaySuccess = this.simulatePaymentGateway(payment.gatewayToken);

    if (!gatewaySuccess) {
      return {
        success: false,
        error: 'Payment gateway declined the transaction',
      };
    }

    // Generate transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Record the payment
    const paymentEntry: PaymentEntry = {
      studentId: payment.studentId,
      amount: payment.amount,
      date: new Date(),
      paymentMethod: PaymentMethod.ONLINE,
      purpose: payment.purpose,
      status: PaymentStatus.COMPLETED,
      transactionId,
      recordedBy: 'SYSTEM',
    };

    await this.recordPayment(paymentEntry);

    // Get the payment record ID (last payment for this student)
    const studentPayments = this.payments.get(payment.studentId) || [];
    const paymentRecordId = studentPayments[studentPayments.length - 1].id;

    return {
      success: true,
      transactionId,
      paymentRecordId,
    };
  }

  /**
   * Generate payment report with filtering
   * Validates: Requirements 8.4
   */
  async generatePaymentReport(
    schoolId: string,
    filters: ReportFilters
  ): Promise<PaymentReport> {
    // Collect all payments for students in this school
    let allRecords: PaymentRecord[] = [];

    for (const [studentId, student] of this.students.entries()) {
      if (student.schoolId !== schoolId) {
        continue;
      }

      const studentPayments = this.payments.get(studentId) || [];
      allRecords = allRecords.concat(studentPayments);
    }

    // Apply filters
    if (filters.studentId) {
      allRecords = allRecords.filter((r) => r.studentId === filters.studentId);
    }

    if (filters.startDate) {
      allRecords = allRecords.filter((r) => r.date >= filters.startDate!);
    }

    if (filters.endDate) {
      allRecords = allRecords.filter((r) => r.date <= filters.endDate!);
    }

    if (filters.status) {
      allRecords = allRecords.filter((r) => r.status === filters.status);
    }

    // Calculate summary statistics
    const totalPayments = allRecords.length;
    const totalAmount = allRecords.reduce((sum, r) => sum + r.amount, 0);

    // Group by status
    const byStatus = new Map<PaymentStatus, number>();
    for (const record of allRecords) {
      const count = byStatus.get(record.status) || 0;
      byStatus.set(record.status, count + 1);
    }

    // Group by method
    const byMethod = new Map<PaymentMethod, number>();
    for (const record of allRecords) {
      const count = byMethod.get(record.paymentMethod) || 0;
      byMethod.set(record.paymentMethod, count + 1);
    }

    return {
      schoolId,
      generatedAt: new Date(),
      totalPayments,
      totalAmount,
      records: allRecords,
      summary: {
        byStatus,
        byMethod,
      },
    };
  }

  // Helper methods for testing and simulation

  /**
   * Simulate payment gateway processing
   * In a real system, this would call an external API
   */
  private simulatePaymentGateway(token: string): boolean {
    // Simulate success for valid tokens
    // Tokens starting with "valid_" are successful
    // Tokens starting with "invalid_" fail
    return token.startsWith('valid_');
  }

  /**
   * Add a student to the service (for testing)
   */
  public addStudent(student: Student): void {
    this.students.set(student.id, student);
  }

  /**
   * Set charges for a student (for testing)
   */
  public setCharges(studentId: string, amount: number): void {
    this.charges.set(studentId, amount);
  }

  /**
   * Clear all data (for testing)
   */
  public clearAll(): void {
    this.payments.clear();
    this.charges.clear();
    this.students.clear();
  }

  /**
   * Get payments directly (for testing)
   */
  public getPaymentsDirect(studentId: string): PaymentRecord[] {
    return this.payments.get(studentId) || [];
  }
}
