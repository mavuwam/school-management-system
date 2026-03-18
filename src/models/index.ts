// Base enums and types for the School Management System

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  SCHOOL_HEAD = 'SCHOOL_HEAD',
  PARENT = 'PARENT',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export enum NotificationType {
  GRADE_UPDATE = 'GRADE_UPDATE',
  ASSIGNMENT_CREATED = 'ASSIGNMENT_CREATED',
  ASSIGNMENT_DUE_SOON = 'ASSIGNMENT_DUE_SOON',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  TIMETABLE_CHANGE = 'TIMETABLE_CHANGE',
  ATTENDANCE_ALERT = 'ATTENDANCE_ALERT',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  OVERDUE = 'OVERDUE',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export enum GradeTrend {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DECLINING = 'DECLINING',
}

// Base User interface
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  email: string;
  role: UserRole;
  schoolId: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: Date;
  lastLogin?: Date;
}

// Permission type for authorization
export type Permission = string;

// Extended User Models

export interface Student extends User {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  enrollmentDate: Date;
  gradeLevel: string;
  parentIds: string[];
}

export interface Teacher extends User {
  firstName: string;
  lastName: string;
  subjects: string[];
  assignedClasses: string[];
}

export interface Parent extends User {
  firstName: string;
  lastName: string;
  childrenIds: string[];
}

// Academic Models

export interface GradeEntry {
  id: string;
  studentId: string;
  teacherId: string;
  subjectId: string;
  assignmentId?: string;
  score: number;
  maxScore: number;
  gradingScale: string;
  enteredAt: Date;
  enteredBy: string;
}

export interface AttendanceEntry {
  id: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  recordedBy: string;
  recordedAt: Date;
  notes?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface GradeAverages {
  overall: number;
  bySubject: Map<string, number>;
  trend: GradeTrend;
}

export interface AcademicProgress {
  studentId: string;
  grades: GradeEntry[];
  attendance: AttendanceEntry[];
  averages: GradeAverages;
  flaggedForIntervention: boolean;
  teacherComments: Comment[];
}

// Payment Models

export interface PaymentRecord {
  id: string;
  studentId: string;
  amount: number;
  date: Date;
  paymentMethod: PaymentMethod;
  purpose: string;
  status: PaymentStatus;
  transactionId?: string;
  recordedBy: string;
  recordedAt: Date;
}

export interface PaymentBalance {
  studentId: string;
  totalCharged: number;
  totalPaid: number;
  balance: number;
  lastPaymentDate?: Date;
  overdueAmount: number;
}

// Assignment Models

export interface Assignment {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  dueDate: Date;
  pointValue: number;
  createdAt: Date;
  assignedStudents: string[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: Date;
  status: AssignmentStatus;
  fileUrls: string[];
  grade?: number;
  feedback?: string;
}

// Timetable Models

export interface ClassPeriod {
  id: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM format
  endTime: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  classId: string;
  recurring: boolean;
}

export interface Timetable {
  id: string;
  schoolId: string;
  name: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  periods: ClassPeriod[];
}

// School Models

export interface Term {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface Holiday {
  id: string;
  name: string;
  date: Date;
}

export interface AcademicCalendar {
  schoolId: string;
  academicYearStart: Date;
  academicYearEnd: Date;
  terms: Term[];
  holidays: Holiday[];
}

export interface GradeRange {
  minScore: number;
  maxScore: number;
  letterGrade: string;
  gpaValue: number;
}

export interface GradingScale {
  schoolId: string;
  name: string;
  ranges: GradeRange[];
}

export interface School {
  id: string;
  name: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  academicCalendar: AcademicCalendar;
  gradingScale: GradingScale;
  createdAt: Date;
}

// Notification Models

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  notificationTypes: Map<NotificationType, boolean>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  sentAt: Date;
  readAt?: Date;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

// Audit Models

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  changes?: Record<string, any>;
}
