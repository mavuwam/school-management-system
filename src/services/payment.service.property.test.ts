// Payment Service Property-Based Tests
import * as fc from 'fast-check';
import { PaymentService } from './payment.service';
import { Student, UserRole, PaymentMethod, PaymentStatus } from '../models';
import { PaymentEntry, PaymentFilters, OnlinePaymentRequest, ReportFilters } from '../interfaces/payment.interface';

describe('PaymentService Property-Based Tests', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService();
    service.clearAll();
  });

  afterEach(() => {
    service.clearAll();
  });

  // Generators for property-based testing

  const schoolIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `school_${s}`);
  const userIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `user_${s}`);

  const studentArb = (schoolId: string, studentId: string): fc.Arbitrary<Student> =>
    fc.record({
      id: fc.constant(studentId),
      username: fc.constant(studentId),
      passwordHash: fc.constant('hash'),
      email: fc.emailAddress(),
      role: fc.constant(UserRole.STUDENT),
      schoolId: fc.constant(schoolId),
      mfaEnabled: fc.constant(false),
      createdAt: fc.date(),
      firstName: fc.string({ minLength: 1, maxLength: 20 }),
      lastName: fc.string({ minLength: 1, maxLength: 20 }),
      dateOfBirth: fc.date({ min: new Date('2005-01-01'), max: new Date('2015-12-31') }),
      enrollmentDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
      gradeLevel: fc.constantFrom('6', '7', '8', '9', '10', '11', '12'),
      parentIds: fc.constant([]),
    });

  const paymentMethodArb = fc.constantFrom(
    PaymentMethod.CASH,
    PaymentMethod.CHECK,
    PaymentMethod.CARD,
    PaymentMethod.ONLINE,
    PaymentMethod.BANK_TRANSFER
  );

  const paymentStatusArb = fc.constantFrom(
    PaymentStatus.PENDING,
    PaymentStatus.COMPLETED,
    PaymentStatus.FAILED,
    PaymentStatus.REFUNDED
  );

  const paymentEntryArb = (studentId: string, recordedBy: string): fc.Arbitrary<PaymentEntry> =>
    fc.record({
      studentId: fc.constant(studentId),
      amount: fc.integer({ min: 1, max: 10000 }),
      date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
      paymentMethod: paymentMethodArb,
      purpose: fc.constantFrom('Tuition', 'Books', 'Lab Fees', 'Sports', 'Transport'),
      status: paymentStatusArb,
      transactionId: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: undefined }),
      recordedBy: fc.constant(recordedBy),
    });

  // Property 29: Payment Record Completeness
  // **Validates: Requirements 8.1**
  test('Property 29: Payment Record Completeness - payment record should contain all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        userIdArb,
        studentArb('school1', 'student1'),
        paymentEntryArb('student1', 'admin1'),
        async (schoolId, studentId, adminId, student, paymentEntry) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const actualStudent = {
            ...student,
            id: studentId,
            schoolId: schoolId,
          };
          service.addStudent(actualStudent);

          const actualPayment = {
            ...paymentEntry,
            studentId: studentId,
            recordedBy: adminId,
          };

          // Record payment
          await service.recordPayment(actualPayment);

          // Retrieve payment records
          const records = await service.getPaymentRecords(studentId, {});

          // Verify completeness
          expect(records).toHaveLength(1);
          const record = records[0];

          // Check all required fields are present
          expect(record.id).toBeDefined();
          expect(record.studentId).toBe(studentId);
          expect(record.amount).toBe(actualPayment.amount);
          expect(record.date).toEqual(actualPayment.date);
          expect(record.paymentMethod).toBe(actualPayment.paymentMethod);
          expect(record.purpose).toBe(actualPayment.purpose);
          expect(record.status).toBe(actualPayment.status);
          expect(record.recordedBy).toBe(adminId);
          expect(record.recordedAt).toBeInstanceOf(Date);

          // Verify the user who recorded it is tracked
          expect(record.recordedBy).toBe(adminId);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 30: Payment Reminder Generation
  // **Validates: Requirements 8.3**
  test('Property 30: Payment Reminder Generation - reminders generated iff balance outstanding > 30 days', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        studentArb('school1', 'student1'),
        fc.integer({ min: 100, max: 10000 }), // charges
        fc.integer({ min: 0, max: 5000 }), // payment amount
        fc.integer({ min: 0, max: 60 }), // days since last payment
        async (schoolId, studentId, student, charges, paymentAmount, daysSincePayment) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const actualStudent = {
            ...student,
            id: studentId,
            schoolId: schoolId,
          };
          service.addStudent(actualStudent);
          service.setCharges(studentId, charges);

          // Calculate balance
          const balance = charges - paymentAmount;

          // Record payment if amount > 0
          if (paymentAmount > 0) {
            const paymentDate = new Date();
            paymentDate.setDate(paymentDate.getDate() - daysSincePayment);

            await service.recordPayment({
              studentId: studentId,
              amount: paymentAmount,
              date: paymentDate,
              paymentMethod: PaymentMethod.CASH,
              purpose: 'Tuition',
              status: PaymentStatus.COMPLETED,
              recordedBy: 'admin1',
            });
          }

          // Generate reminders
          const reminders = await service.generateReminders(schoolId);

          // Verify reminder generation logic
          const shouldHaveReminder = balance > 0 && daysSincePayment > 30;
          const hasReminder = reminders.some((r) => r.studentId === studentId);

          if (shouldHaveReminder) {
            expect(hasReminder).toBe(true);
            const reminder = reminders.find((r) => r.studentId === studentId);
            expect(reminder?.balance).toBe(balance);
            expect(reminder?.daysPastDue).toBeGreaterThan(30);
          } else {
            // If balance is 0 or negative, or within 30 days, no reminder
            if (balance <= 0 || daysSincePayment <= 30) {
              expect(hasReminder).toBe(false);
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 31: Payment Report Filtering
  // **Validates: Requirements 8.4**
  test('Property 31: Payment Report Filtering - all returned records match filter criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        fc.array(userIdArb, { minLength: 1, maxLength: 5 }),
        fc.option(paymentStatusArb, { nil: undefined }),
        async (schoolId, studentIds, filterStatus) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup students
          for (const studentId of studentIds) {
            const student: Student = {
              id: studentId,
              username: studentId,
              passwordHash: 'hash',
              email: `${studentId}@example.com`,
              role: UserRole.STUDENT,
              schoolId: schoolId,
              mfaEnabled: false,
              createdAt: new Date(),
              firstName: 'Test',
              lastName: 'Student',
              dateOfBirth: new Date('2005-01-01'),
              enrollmentDate: new Date('2020-09-01'),
              gradeLevel: '10',
              parentIds: [],
            };
            service.addStudent(student);

            // Add 2-3 payments per student with random statuses
            const numPayments = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < numPayments; i++) {
              await service.recordPayment({
                studentId: studentId,
                amount: Math.floor(Math.random() * 1000) + 100,
                date: new Date(),
                paymentMethod: PaymentMethod.CASH,
                purpose: 'Tuition',
                status: i % 2 === 0 ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
                recordedBy: 'admin1',
              });
            }
          }

          // Generate report with filter
          const filters: ReportFilters = filterStatus ? { status: filterStatus } : {};
          const report = await service.generatePaymentReport(schoolId, filters);

          // Verify all records match filter
          if (filterStatus) {
            expect(report.records.every((r) => r.status === filterStatus)).toBe(true);
          }

          // Verify no matching records are excluded
          // All records should belong to students in this school
          expect(report.records.every((r) => studentIds.includes(r.studentId))).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 32: Online Payment Recording
  // **Validates: Requirements 8.5**
  test('Property 32: Online Payment Recording - successful online payment creates record and updates balance', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        studentArb('school1', 'student1'),
        fc.integer({ min: 100, max: 10000 }), // charges
        fc.integer({ min: 50, max: 5000 }), // payment amount
        async (schoolId, studentId, student, charges, paymentAmount) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const actualStudent = {
            ...student,
            id: studentId,
            schoolId: schoolId,
          };
          service.addStudent(actualStudent);
          service.setCharges(studentId, charges);

          const initialBalance = await service.getBalance(studentId);

          // Process online payment with valid token
          const request: OnlinePaymentRequest = {
            studentId: studentId,
            amount: paymentAmount,
            purpose: 'Tuition',
            gatewayToken: 'valid_token_123',
            schoolId: schoolId,
          };

          const result = await service.processOnlinePayment(request);

          // Verify success
          expect(result.success).toBe(true);
          expect(result.transactionId).toBeDefined();
          expect(result.paymentRecordId).toBeDefined();

          // Verify payment record was created
          const records = await service.getPaymentRecords(studentId, {});
          const onlinePayment = records.find((r) => r.id === result.paymentRecordId);
          expect(onlinePayment).toBeDefined();
          expect(onlinePayment?.amount).toBe(paymentAmount);
          expect(onlinePayment?.paymentMethod).toBe(PaymentMethod.ONLINE);
          expect(onlinePayment?.status).toBe(PaymentStatus.COMPLETED);
          expect(onlinePayment?.transactionId).toBe(result.transactionId);

          // Verify balance was updated
          const newBalance = await service.getBalance(studentId);
          expect(newBalance).toBe(initialBalance - paymentAmount);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Property 15: Payment Record Filtering
  // **Validates: Requirements 4.3**
  test('Property 15: Payment Record Filtering - all returned records match filter and no matching records excluded', async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolIdArb,
        userIdArb,
        studentArb('school1', 'student1'),
        fc.array(paymentEntryArb('student1', 'admin1'), { minLength: 5, maxLength: 10 }),
        fc.option(paymentStatusArb, { nil: undefined }),
        fc.option(paymentMethodArb, { nil: undefined }),
        async (schoolId, studentId, student, payments, filterStatus, filterMethod) => {
          // Clear service for each iteration
          service.clearAll();

          // Setup
          const actualStudent = {
            ...student,
            id: studentId,
            schoolId: schoolId,
          };
          service.addStudent(actualStudent);

          // Record all payments
          for (const payment of payments) {
            await service.recordPayment({
              ...payment,
              studentId: studentId,
            });
          }

          // Apply filters
          const filters: PaymentFilters = {};
          if (filterStatus) {
            filters.status = filterStatus;
          }
          if (filterMethod) {
            filters.paymentMethod = filterMethod;
          }

          // Get filtered records
          const filteredRecords = await service.getPaymentRecords(studentId, filters);

          // Verify all returned records match filter criteria
          if (filterStatus) {
            expect(filteredRecords.every((r) => r.status === filterStatus)).toBe(true);
          }
          if (filterMethod) {
            expect(filteredRecords.every((r) => r.paymentMethod === filterMethod)).toBe(true);
          }

          // Verify no matching records are excluded
          // Get all records and manually filter
          const allRecords = await service.getPaymentRecords(studentId, {});
          const expectedRecords = allRecords.filter((r) => {
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterMethod && r.paymentMethod !== filterMethod) return false;
            return true;
          });

          expect(filteredRecords.length).toBe(expectedRecords.length);
        }
      ),
      { numRuns: 10 }
    );
  });
});
