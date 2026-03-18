# Design Document: School Management System

## Overview

The School Management System is a multi-tenant web application that provides role-based access to educational data across multiple schools. The system serves four primary user roles: students, teachers, school heads, and parents, each with tailored views and permissions.

The architecture follows a layered approach with clear separation between authentication, authorization, business logic, and data persistence. The system emphasizes data isolation between schools, real-time updates for critical information, and comprehensive audit logging for compliance.

Key design principles:
- Role-based access control (RBAC) enforced at multiple layers
- Multi-tenancy with strict data isolation per school instance
- Event-driven notifications for timely information delivery
- Audit logging for all sensitive data access
- Scalable architecture supporting multiple schools and thousands of users

## Architecture

### System Architecture

The system follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (Web UI - Role-specific views: Student, Teacher,       │
│   School Head, Parent)                                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Service │  │ User Service │  │ School       │  │
│  │              │  │              │  │ Service      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Academic     │  │ Payment      │  │ Notification │  │
│  │ Service      │  │ Service      │  │ Service      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Assignment   │  │ Timetable    │                    │
│  │ Service      │  │ Service      │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Relational   │  │ Audit Log    │  │ File Storage │  │
│  │ Database     │  │ Store        │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Authentication Service**: Manages user login, session management, password validation, and multi-factor authentication. Issues JWT tokens containing user role and school association.

**User Service**: Handles user profile management, role assignment, and school association. Enforces role-based access control.

**School Service**: Manages school instances, configurations, branding, academic calendars, and grading scales.

**Academic Service**: Tracks grades, attendance, performance metrics, and academic history. Calculates averages and identifies at-risk students.

**Payment Service**: Records financial transactions, calculates balances, generates payment reminders, and produces financial reports.

**Assignment Service**: Manages assignment creation, submission tracking, and deadline monitoring.

**Timetable Service**: Creates and validates schedules, detects conflicts, and manages class periods.

**Notification Service**: Delivers notifications via email and in-app channels based on user preferences and system events.

## Components and Interfaces

### Authentication Service

```typescript
interface AuthenticationService {
  // Authenticate user and create session
  login(credentials: Credentials): Promise<AuthResult>;
  
  // Verify MFA token for school heads
  verifyMFA(userId: string, token: string): Promise<boolean>;
  
  // Terminate user session
  logout(sessionId: string): Promise<void>;
  
  // Validate session and return user context
  validateSession(sessionId: string): Promise<UserContext>;
  
  // Check password complexity requirements
  validatePassword(password: string): ValidationResult;
}

interface Credentials {
  username: string;
  password: string;
  schoolId: string;
}

interface AuthResult {
  success: boolean;
  sessionToken?: string;
  requiresMFA?: boolean;
  error?: string;
}

interface UserContext {
  userId: string;
  role: UserRole;
  schoolId: string;
  permissions: Permission[];
}
```

### User Service

```typescript
interface UserService {
  // Get user profile by ID
  getUserProfile(userId: string, requestorContext: UserContext): Promise<UserProfile>;
  
  // Get student profile with all related data
  getStudentProfile(studentId: string, requestorContext: UserContext): Promise<StudentProfile>;
  
  // Get teacher view with assigned students
  getTeacherView(teacherId: string, filters: TeacherFilters): Promise<TeacherView>;
  
  // Get school head view with all school data
  getSchoolHeadView(schoolId: string, filters: AdminFilters): Promise<SchoolHeadView>;
  
  // Get parent view with children's data
  getParentView(parentId: string): Promise<ParentView>;
  
  // Link parent to student
  linkParentToStudent(parentId: string, studentId: string): Promise<void>;
}
```

### Academic Service

```typescript
interface AcademicService {
  // Record a grade for a student
  recordGrade(grade: GradeEntry, teacherContext: UserContext): Promise<void>;
  
  // Get academic progress for a student
  getAcademicProgress(studentId: string, requestorContext: UserContext): Promise<AcademicProgress>;
  
  // Record attendance
  recordAttendance(attendance: AttendanceEntry): Promise<void>;
  
  // Calculate cumulative averages
  calculateAverages(studentId: string, subjectId?: string): Promise<GradeAverages>;
  
  // Get students flagged for intervention
  getAtRiskStudents(schoolId: string, threshold: number): Promise<Student[]>;
  
  // Get academic history with audit trail
  getAcademicHistory(studentId: string): Promise<AcademicHistoryEntry[]>;
}
```

### Payment Service

```typescript
interface PaymentService {
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
```

### Assignment Service

```typescript
interface AssignmentService {
  // Create new assignment
  createAssignment(assignment: AssignmentCreate, teacherContext: UserContext): Promise<Assignment>;
  
  // Get pending work for a student
  getPendingWork(studentId: string): Promise<Assignment[]>;
  
  // Submit assignment
  submitAssignment(submission: AssignmentSubmission): Promise<void>;
  
  // Get submission status for a class
  getSubmissionStatus(assignmentId: string): Promise<SubmissionStatus[]>;
  
  // Mark overdue assignments
  markOverdueAssignments(): Promise<void>;
}
```

### Timetable Service

```typescript
interface TimetableService {
  // Create or update timetable
  saveTimetable(timetable: Timetable, adminContext: UserContext): Promise<void>;
  
  // Get timetable for a student
  getStudentTimetable(studentId: string): Promise<Timetable>;
  
  // Get timetable for a teacher
  getTeacherTimetable(teacherId: string): Promise<Timetable>;
  
  // Validate timetable for conflicts
  validateTimetable(timetable: Timetable): Promise<ValidationResult>;
  
  // Get all affected users when timetable changes
  getAffectedUsers(timetableId: string): Promise<User[]>;
}
```

### Notification Service

```typescript
interface NotificationService {
  // Send notification to users
  sendNotification(notification: Notification): Promise<void>;
  
  // Get notification history for a user
  getNotificationHistory(userId: string): Promise<Notification[]>;
  
  // Update notification preferences
  updatePreferences(userId: string, preferences: NotificationPreferences): Promise<void>;
  
  // Schedule recurring notifications
  scheduleRecurringNotification(schedule: NotificationSchedule): Promise<void>;
}
```

## Data Models

### User and Role Models

```typescript
enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  SCHOOL_HEAD = 'SCHOOL_HEAD',
  PARENT = 'PARENT',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN'
}

interface User {
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

interface Student extends User {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  enrollmentDate: Date;
  gradeLevel: string;
  parentIds: string[];
}

interface Teacher extends User {
  firstName: string;
  lastName: string;
  subjects: string[];
  assignedClasses: string[];
}

interface Parent extends User {
  firstName: string;
  lastName: string;
  childrenIds: string[];
}
```

### Academic Models

```typescript
interface GradeEntry {
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

interface AttendanceEntry {
  id: string;
  studentId: string;
  date: Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  recordedBy: string;
  recordedAt: Date;
  notes?: string;
}

interface AcademicProgress {
  studentId: string;
  grades: GradeEntry[];
  attendance: AttendanceEntry[];
  averages: GradeAverages;
  flaggedForIntervention: boolean;
  teacherComments: Comment[];
}

interface GradeAverages {
  overall: number;
  bySubject: Map<string, number>;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}
```

### Payment Models

```typescript
interface PaymentRecord {
  id: string;
  studentId: string;
  amount: number;
  date: Date;
  paymentMethod: 'CASH' | 'CHECK' | 'CARD' | 'ONLINE' | 'BANK_TRANSFER';
  purpose: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  recordedBy: string;
  recordedAt: Date;
}

interface PaymentBalance {
  studentId: string;
  totalCharged: number;
  totalPaid: number;
  balance: number;
  lastPaymentDate?: Date;
  overdueAmount: number;
}
```

### Assignment Models

```typescript
interface Assignment {
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

interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: Date;
  status: 'PENDING' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';
  fileUrls: string[];
  grade?: number;
  feedback?: string;
}
```

### Timetable Models

```typescript
interface Timetable {
  id: string;
  schoolId: string;
  name: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  periods: ClassPeriod[];
}

interface ClassPeriod {
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
```

### School Models

```typescript
interface School {
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

interface AcademicCalendar {
  schoolId: string;
  academicYearStart: Date;
  academicYearEnd: Date;
  terms: Term[];
  holidays: Holiday[];
}

interface GradingScale {
  schoolId: string;
  name: string;
  ranges: GradeRange[];
}

interface GradeRange {
  minScore: number;
  maxScore: number;
  letterGrade: string;
  gpaValue: number;
}
```

### Notification Models

```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  channels: ('EMAIL' | 'IN_APP')[];
  sentAt: Date;
  readAt?: Date;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

enum NotificationType {
  GRADE_UPDATE = 'GRADE_UPDATE',
  ASSIGNMENT_CREATED = 'ASSIGNMENT_CREATED',
  ASSIGNMENT_DUE_SOON = 'ASSIGNMENT_DUE_SOON',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  TIMETABLE_CHANGE = 'TIMETABLE_CHANGE',
  ATTENDANCE_ALERT = 'ATTENDANCE_ALERT'
}

interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  notificationTypes: Map<NotificationType, boolean>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}
```

### Audit Models

```typescript
interface AuditLog {
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
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid Credentials Create Sessions

*For any* valid user credentials, authenticating with those credentials should create a session token and grant access to the role-appropriate view.

**Validates: Requirements 1.1**

### Property 2: Invalid Credentials Deny Access

*For any* invalid credentials (wrong password, non-existent user, or wrong school), authentication attempts should be denied and return an error.

**Validates: Requirements 1.2**

### Property 3: Password Complexity Validation

*For any* password string, it should be accepted if and only if it contains at least 8 characters with mixed case letters and numbers.

**Validates: Requirements 1.3**

### Property 4: Session Timeout Enforcement

*For any* user session, if the session remains inactive for 30 minutes, it should be automatically terminated and subsequent requests should be rejected.

**Validates: Requirements 1.4**

### Property 5: MFA Required for School Heads

*For any* school head account, authentication should require multi-factor authentication verification, while other roles should not require MFA.

**Validates: Requirements 1.5**

### Property 6: Student Profile Completeness

*For any* student profile view, it should contain all required components: academic progress, payment records, status, pending work, and timetable.

**Validates: Requirements 2.1**

### Property 7: Pending Work Chronological Sorting

*For any* list of pending work items, they should be sorted in chronological order by due date (earliest first).

**Validates: Requirements 2.3**

### Property 8: Timetable Display Completeness

*For any* timetable display, each class period should include class time, subject, and room location.

**Validates: Requirements 2.4**

### Property 9: Teacher Access Limited to Assigned Students

*For any* teacher view, it should contain information only for students assigned to that teacher, and should not include students from other teachers' classes.

**Validates: Requirements 3.1**

### Property 10: Teacher View Data Completeness

*For any* student in a teacher view, the displayed information should include academic progress with grades and attendance records.

**Validates: Requirements 3.2**

### Property 11: Student Filtering Functionality

*For any* teacher view with student filters applied (by class, subject, or performance level), all returned students should match the filter criteria and no matching students should be excluded.

**Validates: Requirements 3.3**

### Property 12: Grade Update Round Trip

*For any* grade update by a teacher, saving the grade should result in the grade being retrievable from the affected student's profile with the same value.

**Validates: Requirements 3.4**

### Property 13: School Head Access Scope

*For any* school head view, it should contain data for all students and teachers in that school instance, but should not contain data from other school instances.

**Validates: Requirements 4.1**

### Property 14: Academic Progress Aggregation Correctness

*For any* set of student grades, aggregating by class, grade level, or subject should produce statistics that accurately reflect the underlying grade data (correct averages, counts, and distributions).

**Validates: Requirements 4.2**

### Property 15: Payment Record Filtering

*For any* payment record filter (by status, date range, or amount), all returned records should match the filter criteria and no matching records should be excluded.

**Validates: Requirements 4.3**

### Property 16: School Head Timetable Permissions

*For any* school head account, the system should allow creation and modification of timetables for all classes in their school instance.

**Validates: Requirements 4.4**

### Property 17: Attendance Statistics Calculation

*For any* set of attendance records, calculated statistics (attendance rate, absence count, late count) should accurately reflect the underlying attendance data.

**Validates: Requirements 4.5**

### Property 18: Parent Access Limited to Linked Children

*For any* parent view, it should contain information only for children linked to that parent, and should not include information for other students.

**Validates: Requirements 5.1, 12.4**

### Property 19: Parent View Data Completeness

*For any* child in a parent view, the displayed information should include academic progress (grades, attendance, teacher comments), payment records, pending work, and timetable.

**Validates: Requirements 5.2, 5.3, 5.4, 5.5**

### Property 20: School Data Isolation

*For any* two different school instances, data from one school should not be accessible when operating in the context of the other school.

**Validates: Requirements 6.1, 6.3**

### Property 21: User School Association Routing

*For any* user login, the system should direct the user to their associated school instance and not to any other school instance.

**Validates: Requirements 6.2**

### Property 22: Custom Branding Application

*For any* school instance with custom branding configured (logo and color scheme), the system should display that branding when accessed by users from that school.

**Validates: Requirements 6.4**

### Property 23: Independent School Configuration

*For any* two different school instances, each should be able to have different academic calendars and grading scales without affecting the other.

**Validates: Requirements 6.5**

### Property 24: Grade Validation Against Scale

*For any* grade entry, it should be accepted if and only if the score falls within the configured grading scale's valid range.

**Validates: Requirements 7.1**

### Property 25: Cumulative Average Calculation

*For any* student with multiple grades, the calculated cumulative average should equal the arithmetic mean of all grade scores.

**Validates: Requirements 7.2**

### Property 26: Attendance Record Completeness

*For any* attendance record, it should contain date, time, status (present/absent/late/excused), and the user who recorded it.

**Validates: Requirements 7.3**

### Property 27: At-Risk Student Flagging

*For any* student, they should be flagged for intervention if and only if their academic progress falls below the configured threshold.

**Validates: Requirements 7.4**

### Property 28: Academic History Audit Trail

*For any* academic progress change (grade entry, grade modification, attendance record), the system should create an audit log entry with timestamp and user attribution.

**Validates: Requirements 7.5, 12.3**

### Property 29: Payment Record Completeness

*For any* payment record, it should contain amount, date, payment method, purpose, and the user who recorded it.

**Validates: Requirements 8.1**

### Property 30: Payment Reminder Generation

*For any* outstanding balance, a payment reminder should be generated if and only if the balance has been outstanding for more than 30 days.

**Validates: Requirements 8.3**

### Property 31: Payment Report Filtering

*For any* payment report filter (by date range, student, or status), all returned records should match the filter criteria and no matching records should be excluded.

**Validates: Requirements 8.4**

### Property 32: Online Payment Recording

*For any* successful online payment transaction, the system should create a payment record with the transaction details and update the student's balance accordingly.

**Validates: Requirements 8.5**

### Property 33: Assignment Distribution to Students

*For any* assignment created by a teacher, it should appear in the pending work list for all students assigned to that class.

**Validates: Requirements 9.1**

### Property 34: Assignment Required Fields Validation

*For any* assignment creation attempt, it should be accepted if and only if it includes title, description, due date, and point value.

**Validates: Requirements 9.2**

### Property 35: Assignment Submission State Transition

*For any* assignment submission by a student, the assignment status should change from pending to submitted and a submission timestamp should be recorded.

**Validates: Requirements 9.3**

### Property 36: Assignment Creation Notification

*For any* new assignment created, notifications should be sent to all students assigned to that class.

**Validates: Requirements 9.4**

### Property 37: Overdue Assignment Marking

*For any* assignment, if the current date is past the due date and the assignment is unsubmitted, it should be marked as overdue.

**Validates: Requirements 9.5**

### Property 38: Timetable Completeness

*For any* timetable, each class period should include subject, teacher, room assignment, start time, and end time.

**Validates: Requirements 10.1**

### Property 39: Timetable Conflict Detection

*For any* timetable, it should be rejected if it creates scheduling conflicts (same teacher or room assigned to multiple classes at overlapping times), and accepted if no conflicts exist.

**Validates: Requirements 10.3**

### Property 40: Recurring Schedule Support

*For any* timetable with recurring class periods, the system should correctly generate class instances for each specified day of the week with the appropriate schedule.

**Validates: Requirements 10.4**

### Property 41: Variable-Length Period Support

*For any* timetable, the system should support class periods of different durations (block scheduling) without requiring all periods to be the same length.

**Validates: Requirements 10.5**

### Property 42: Academic Progress Update Notifications

*For any* academic progress update (grade entry or modification), notifications should be sent to the affected student and all linked parents.

**Validates: Requirements 11.1**

### Property 43: Assignment Due Date Notifications

*For any* assignment approaching its due date (within configured threshold), a notification should be sent to the assigned student.

**Validates: Requirements 11.2**

### Property 44: Weekly Payment Reminder Notifications

*For any* outstanding payment balance, weekly reminder notifications should be sent to the linked parents.

**Validates: Requirements 11.3**

### Property 45: Notification Preference Enforcement

*For any* notification, it should be delivered only through channels (email, in-app) that the user has enabled in their notification preferences.

**Validates: Requirements 11.4**

### Property 46: Notification History Persistence

*For any* notification sent to a user, it should be stored in the notification history and be retrievable from the user's profile.

**Validates: Requirements 11.5**

### Property 47: Sensitive Data Encryption

*For any* sensitive data (grades, payment information, personal details), it should be encrypted when stored in the database and when transmitted over the network.

**Validates: Requirements 12.1**

### Property 48: Role-Based Access Control Enforcement

*For any* data access attempt, it should be allowed if and only if the requesting user's role has permission to access that specific data type and instance.

**Validates: Requirements 12.2**

### Property 49: Data Export Completeness

*For any* user data export request, the exported data should contain all data associated with that user and be in a portable format.

**Validates: Requirements 12.5**

## Error Handling

### Authentication Errors

- Invalid credentials: Return 401 Unauthorized with generic error message (avoid revealing whether username or password was incorrect)
- Expired session: Return 401 Unauthorized and require re-authentication
- MFA failure: Return 401 Unauthorized and allow retry with rate limiting
- Account locked: Return 403 Forbidden with lockout duration

### Authorization Errors

- Insufficient permissions: Return 403 Forbidden with clear message about required role
- Cross-school access attempt: Return 403 Forbidden and log security event
- Parent accessing non-linked child: Return 403 Forbidden

### Validation Errors

- Invalid grade value: Return 400 Bad Request with details about valid range
- Missing required fields: Return 400 Bad Request listing missing fields
- Timetable conflict: Return 409 Conflict with details about conflicting periods
- Password complexity failure: Return 400 Bad Request with specific requirements

### Data Errors

- Student not found: Return 404 Not Found
- Assignment not found: Return 404 Not Found
- School instance not found: Return 404 Not Found
- Duplicate record: Return 409 Conflict

### System Errors

- Database connection failure: Return 503 Service Unavailable and retry with exponential backoff
- Payment gateway timeout: Return 504 Gateway Timeout and mark payment as pending
- Notification delivery failure: Log error and retry up to 3 times
- File storage failure: Return 500 Internal Server Error and rollback transaction

### Error Logging

All errors should be logged with:
- Timestamp
- User ID (if authenticated)
- Request details (endpoint, parameters)
- Error type and message
- Stack trace (for system errors)
- Correlation ID for request tracing

Critical errors (security violations, data corruption) should trigger immediate alerts to system administrators.

## Testing Strategy

### Dual Testing Approach

The system will employ both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples demonstrating correct behavior
- Edge cases (empty lists, boundary values, special characters)
- Error conditions and exception handling
- Integration points between components
- Mock external dependencies (payment gateways, email services)

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Invariants that must be maintained across operations
- Round-trip properties (serialize/deserialize, encode/decode)

Together, unit tests catch concrete bugs while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Framework Selection:**
- For TypeScript/JavaScript: Use `fast-check` library
- For Python: Use `hypothesis` library
- For Java: Use `jqwik` library

**Test Configuration:**
- Each property test must run minimum 100 iterations
- Use seed-based randomization for reproducibility
- Configure appropriate generators for domain types (dates, grades, user roles)
- Set reasonable bounds (e.g., grade values 0-100, class sizes 1-50)

**Property Test Tagging:**
Each property-based test must include a comment tag referencing the design document property:

```typescript
// Feature: school-management-system, Property 1: Valid Credentials Create Sessions
test('valid credentials create sessions', () => {
  fc.assert(fc.property(
    validCredentialsGenerator(),
    (credentials) => {
      const result = authService.login(credentials);
      expect(result.success).toBe(true);
      expect(result.sessionToken).toBeDefined();
    }
  ), { numRuns: 100 });
});
```

### Test Coverage Requirements

- Minimum 80% code coverage for all services
- 100% coverage for authentication and authorization logic
- 100% coverage for data validation functions
- All 49 correctness properties must have corresponding property-based tests
- Critical paths (login, grade entry, payment processing) must have both unit and property tests

### Integration Testing

- Test complete user workflows (student views grades, teacher enters grades, parent receives notification)
- Test cross-service interactions (assignment creation triggers notifications)
- Test multi-school isolation with concurrent operations
- Test session management and timeout behavior
- Test payment gateway integration with test accounts

### Security Testing

- Penetration testing for authentication bypass attempts
- SQL injection testing on all input fields
- Cross-site scripting (XSS) testing on user-generated content
- Cross-school data access attempts
- Session hijacking and CSRF protection testing
- Encryption verification for data at rest and in transit

### Performance Testing

- Load testing with 1000+ concurrent users
- Database query optimization verification
- Notification delivery latency testing
- Payment processing throughput testing
- Timetable conflict detection performance with large datasets

### Test Data Management

- Use factories to generate test data with realistic relationships
- Maintain separate test databases for each school instance
- Reset test data between test runs
- Use anonymized production data for performance testing (with proper consent)
- Generate edge cases: students with no grades, teachers with no classes, empty timetables

