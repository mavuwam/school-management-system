import * as fc from 'fast-check';
import { AssignmentService } from './assignment.service';
import { AssignmentStatus } from '../models';

describe('AssignmentService - Property-Based Tests', () => {
  let service: AssignmentService;

  beforeEach(() => {
    service = new AssignmentService();
  });

  describe('Property 33: Assignment Distribution to Students', () => {
    it('should distribute assignments to all assigned students', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
          fc.date({ min: new Date() }),
          fc.integer({ min: 1, max: 100 }),
          (title, description, studentIds, dueDate, pointValue) => {
            service.clear();

            const uniqueStudents = Array.from(new Set(studentIds));
            if (uniqueStudents.length === 0) return true;

            const assignment = service.createAssignment({
              title,
              description,
              teacherId: 'teacher-1',
              subjectId: 'subject-1',
              classId: 'class-1',
              dueDate,
              pointValue,
              assignedStudents: uniqueStudents,
            });

            // Property: Every assigned student should have the assignment
            for (const studentId of uniqueStudents) {
              const submission = service.getSubmission(assignment.id, studentId);
              expect(submission).toBeDefined();
              expect(submission!.assignmentId).toBe(assignment.id);
              expect(submission!.studentId).toBe(studentId);
              expect(submission!.status).toBe(AssignmentStatus.PENDING);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 34: Assignment Required Fields Validation', () => {
    it('should reject assignments with missing required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.option(fc.string(), { nil: '' }),
            description: fc.option(fc.string(), { nil: '' }),
            teacherId: fc.option(fc.string(), { nil: '' }),
            subjectId: fc.option(fc.string(), { nil: '' }),
            classId: fc.option(fc.string(), { nil: '' }),
            dueDate: fc.option(fc.date(), { nil: undefined as any }),
            pointValue: fc.option(fc.integer({ min: 1 }), { nil: 0 }),
            assignedStudents: fc.option(fc.array(fc.string({ minLength: 1 })), {
              nil: [],
            }),
          }),
          (input) => {
            service.clear();

            const hasAllRequiredFields =
              input.title &&
              input.title.trim() !== '' &&
              input.description &&
              input.description.trim() !== '' &&
              input.teacherId &&
              input.subjectId &&
              input.classId &&
              input.dueDate &&
              input.pointValue > 0 &&
              input.assignedStudents &&
              input.assignedStudents.length > 0;

            if (hasAllRequiredFields) {
              // Should succeed
              const assignment = service.createAssignment(input as any);
              expect(assignment).toBeDefined();
              expect(assignment.title).toBe(input.title);
            } else {
              // Should throw error
              expect(() => service.createAssignment(input as any)).toThrow();
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 35: Assignment Submission State Transition', () => {
    it('should only allow valid state transitions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          (studentId, fileUrls) => {
            service.clear();

            const assignment = service.createAssignment({
              title: 'Test Assignment',
              description: 'Description',
              teacherId: 'teacher-1',
              subjectId: 'subject-1',
              classId: 'class-1',
              dueDate: new Date('2099-12-31'),
              pointValue: 100,
              assignedStudents: [studentId],
            });

            // Initial state should be PENDING
            const initialSubmission = service.getSubmission(assignment.id, studentId);
            expect(initialSubmission!.status).toBe(AssignmentStatus.PENDING);

            // PENDING -> SUBMITTED should succeed
            const submission = service.submitAssignment(
              assignment.id,
              studentId,
              fileUrls
            );
            expect(submission.status).toBe(AssignmentStatus.SUBMITTED);

            // SUBMITTED -> SUBMITTED should fail
            expect(() =>
              service.submitAssignment(assignment.id, studentId, fileUrls)
            ).toThrow('Assignment already submitted');

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should allow OVERDUE -> SUBMITTED transition', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          (studentId, fileUrls) => {
            service.clear();

            const assignment = service.createAssignment({
              title: 'Test Assignment',
              description: 'Description',
              teacherId: 'teacher-1',
              subjectId: 'subject-1',
              classId: 'class-1',
              dueDate: new Date('2020-01-01'),
              pointValue: 100,
              assignedStudents: [studentId],
            });

            // Mark as overdue
            service.markOverdueAssignments();
            const overdueSubmission = service.getSubmission(assignment.id, studentId);
            expect(overdueSubmission!.status).toBe(AssignmentStatus.OVERDUE);

            // OVERDUE -> SUBMITTED should succeed
            const submission = service.submitAssignment(
              assignment.id,
              studentId,
              fileUrls
            );
            expect(submission.status).toBe(AssignmentStatus.SUBMITTED);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 37: Overdue Assignment Marking', () => {
    it('should mark all pending assignments past due date as overdue', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              dueDate: fc.date({ min: new Date('2000-01-01'), max: new Date() }),
              studentIds: fc.array(fc.string({ minLength: 1 }), {
                minLength: 1,
                maxLength: 5,
              }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (assignments) => {
            service.clear();

            let expectedOverdueCount = 0;

            // Create assignments with past due dates
            for (const assignmentData of assignments) {
              const uniqueStudents = Array.from(new Set(assignmentData.studentIds));
              service.createAssignment({
                title: 'Test Assignment',
                description: 'Description',
                teacherId: 'teacher-1',
                subjectId: 'subject-1',
                classId: 'class-1',
                dueDate: assignmentData.dueDate,
                pointValue: 100,
                assignedStudents: uniqueStudents,
              });
              expectedOverdueCount += uniqueStudents.length;
            }

            // Mark overdue
            const markedCount = service.markOverdueAssignments();

            // Property: All pending assignments past due date should be marked
            expect(markedCount).toBe(expectedOverdueCount);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should not mark future assignments as overdue', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              dueDate: fc.date({ min: new Date(Date.now() + 86400000), max: new Date('2099-12-31') }), // At least 1 day in future
              studentIds: fc.array(fc.string({ minLength: 1 }), {
                minLength: 1,
                maxLength: 5,
              }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (assignments) => {
            service.clear();

            // Create assignments with future due dates
            for (const assignmentData of assignments) {
              const uniqueStudents = Array.from(new Set(assignmentData.studentIds));
              service.createAssignment({
                title: 'Test Assignment',
                description: 'Description',
                teacherId: 'teacher-1',
                subjectId: 'subject-1',
                classId: 'class-1',
                dueDate: assignmentData.dueDate,
                pointValue: 100,
                assignedStudents: uniqueStudents,
              });
            }

            // Mark overdue
            const markedCount = service.markOverdueAssignments();

            // Property: No future assignments should be marked
            expect(markedCount).toBe(0);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 7: Pending Work Chronological Sorting', () => {
    it('should return pending work sorted by due date (earliest first)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.array(fc.date({ min: new Date('2024-01-01'), max: new Date('2099-12-31') }), {
            minLength: 2,
            maxLength: 10,
          }),
          (studentId, dueDates) => {
            service.clear();

            // Create assignments with different due dates
            for (let i = 0; i < dueDates.length; i++) {
              service.createAssignment({
                title: `Assignment ${i}`,
                description: 'Description',
                teacherId: 'teacher-1',
                subjectId: 'subject-1',
                classId: 'class-1',
                dueDate: dueDates[i],
                pointValue: 100,
                assignedStudents: [studentId],
              });
            }

            const pendingWork = service.getPendingWork(studentId);

            // Property: Pending work should be sorted by due date (earliest first)
            for (let i = 1; i < pendingWork.length; i++) {
              expect(pendingWork[i - 1].dueDate.getTime()).toBeLessThanOrEqual(
                pendingWork[i].dueDate.getTime()
              );
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should only include pending and overdue assignments', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 2, max: 10 }),
          (studentId, numAssignments) => {
            service.clear();

            const assignmentIds: string[] = [];

            // Create multiple assignments
            for (let i = 0; i < numAssignments; i++) {
              const assignment = service.createAssignment({
                title: `Assignment ${i}`,
                description: 'Description',
                teacherId: 'teacher-1',
                subjectId: 'subject-1',
                classId: 'class-1',
                dueDate: new Date('2099-12-31'),
                pointValue: 100,
                assignedStudents: [studentId],
              });
              assignmentIds.push(assignment.id);
            }

            // Submit half of them
            const halfIndex = Math.floor(numAssignments / 2);
            for (let i = 0; i < halfIndex; i++) {
              service.submitAssignment(assignmentIds[i], studentId, ['file.pdf']);
            }

            const pendingWork = service.getPendingWork(studentId);

            // Property: Only pending/overdue assignments should be returned
            expect(pendingWork.length).toBe(numAssignments - halfIndex);

            for (const assignment of pendingWork) {
              const submission = service.getSubmission(assignment.id, studentId);
              expect(
                submission!.status === AssignmentStatus.PENDING ||
                  submission!.status === AssignmentStatus.OVERDUE
              ).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
