// Payment Service Interfaces
import { PaymentRecord, PaymentBalance, PaymentMethod, PaymentStatus } from '../models';

export interface PaymentService {
  // Record a payment
  recordPayment(payment: PaymentEntry): Promise<void>;

  // Get payment records for a student
  getPaymentRecords(studentId: string, filters: PaymentFilters): Promise<PaymentRecord[]>;

  // Calculate current balance
  getBalance(studentId: string): Promise<number>;

  // Generate payment reminders
  generateReminders(schoolId: string): Promise<PaymentReminder[]>;

  // Process online payment
  processOnlinePayment(payment: OnlinePaymentRequest): Promise<PaymentResult>;

  // Generate payment reports
  generatePaymentReport(schoolId: string, filters: ReportFilters): Promise<PaymentReport>;
}

export interface PaymentEntry {
  studentId: string;
  amount: number;
  date: Date;
  paymentMethod: PaymentMethod;
  purpose: string;
  status: PaymentStatus;
  transactionId?: string;
  recordedBy: string;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
}

export interface PaymentReminder {
  studentId: string;
  balance: number;
  daysPastDue: number;
  lastPaymentDate?: Date;
}

export interface OnlinePaymentRequest {
  studentId: string;
  amount: number;
  purpose: string;
  gatewayToken: string;
  schoolId: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  paymentRecordId?: string;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  studentId?: string;
  status?: PaymentStatus;
}

export interface PaymentReport {
  schoolId: string;
  generatedAt: Date;
  totalPayments: number;
  totalAmount: number;
  records: PaymentRecord[];
  summary: {
    byStatus: Map<PaymentStatus, number>;
    byMethod: Map<PaymentMethod, number>;
  };
}
