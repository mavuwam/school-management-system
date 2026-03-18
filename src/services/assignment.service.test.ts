import { AssignmentService } from './assignment.service';
import { AssignmentStatus } from '../models';

describe('AssignmentService', () => {
  let service: AssignmentService;

  beforeEach(() => {
    service = new AssignmentService();
  });

  describe('createAssignment', () => {
    it('should create an assignment with valid input', () => {
      const input = {
        title: 'Math Homework',
        description: 'Complete exercises 1-10',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1', 'student-2'],
      };

      const assignment = service.createAssignment(input);

      expect(assignment.id).toBeDefined();
      expect(assignment.title).toBe(input.title);
      expect(assignment.description).toBe(input.description);
      expect(assignment.teacherId).toBe(input.teacherId);
      expect(assignment.subjectId).toBe(input.subjectId);
      expect(assignment.classId).toBe(input.classId);
      expect(assignment.dueDate).toEqual(input.dueDate);
      expect(assignment.pointValue).toBe(input.pointValue);
      expect(assignment.assignedStudents).toEqual(input.assignedStudents);
      expect(assignment.createdAt).toBeInstanceOf(Date);
    });

    it('should distribute assignment to all assigned students', () => {
      const input = {
        title: 'Science Project',
        description: 'Build a volcano',
        teacherId: 'teacher-1',
        subjectId: 'science-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 50,
        assignedStudents: ['student-1', 'student-2', 'student-3'],
      };

      const assignment = service.createAssignment(input);

      // Verify each student has the assignment in their pending work
      for (const studentId of input.assignedStudents) {
        const pendingWork = service.getPendingWork(studentId);
        expect(pendingWork).toContainEqual(assignment);
      }
    });

    it('should create initial submission records with PENDING status', () => {
      const input = {
        title: 'English Essay',
        description: 'Write about summer vacation',
        teacherId: 'teacher-1',
        subjectId: 'english-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1', 'student-2'],
      };

      const assignment = service.createAssignment(input);

      for (const studentId of input.assignedStudents) {
        const submission = service.getSubmission(assignment.id, studentId);
        expect(submission).toBeDefined();
        expect(submission!.status).toBe(AssignmentStatus.PENDING);
        expect(submission!.assignmentId).toBe(assignment.id);
        expect(submission!.studentId).toBe(studentId);
      }
    });

    it('should throw error if title is missing', () => {
      const input = {
        title: '',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      };

      expect(() => service.createAssignment(input)).toThrow('Assignment title is required');
    });

    it('should throw error if description is missing', () => {
      const input = {
        title: 'Title',
        description: '',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      };

      expect(() => service.createAssignment(input)).toThrow(
        'Assignment description is required'
      );
    });

    it('should throw error if point value is zero or negative', () => {
      const input = {
        title: 'Title',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 0,
        assignedStudents: ['student-1'],
      };

      expect(() => service.createAssignment(input)).toThrow(
        'Point value must be greater than 0'
      );
    });

    it('should throw error if no students are assigned', () => {
      const input = {
        title: 'Title',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: [],
      };

      expect(() => service.createAssignment(input)).toThrow(
        'At least one student must be assigned'
      );
    });
  });

  describe('getPendingWork', () => {
    it('should return assignments sorted by due date (earliest first)', () => {
      const assignment1 = service.createAssignment({
        title: 'Assignment 1',
        description: 'Due last',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      const assignment2 = service.createAssignment({
        title: 'Assignment 2',
        description: 'Due first',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-01'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      const assignment3 = service.createAssignment({
        title: 'Assignment 3',
        description: 'Due middle',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-15'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      const pendingWork = service.getPendingWork('student-1');

      expect(pendingWork).toHaveLength(3);
      expect(pendingWork[0].id).toBe(assignment2.id);
      expect(pendingWork[1].id).toBe(assignment3.id);
      expect(pendingWork[2].id).toBe(assignment1.id);
    });

    it('should only return pending and overdue assignments', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      // Submit the assignment
      service.submitAssignment(assignment.id, 'student-1', ['file1.pdf']);

      const pendingWork = service.getPendingWork('student-1');
      expect(pendingWork).toHaveLength(0);
    });

    it('should return empty array for student with no assignments', () => {
      const pendingWork = service.getPendingWork('student-999');
      expect(pendingWork).toEqual([]);
    });

    it('should include overdue assignments in pending work', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2020-01-01'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      // Mark as overdue
      service.markOverdueAssignments();

      const pendingWork = service.getPendingWork('student-1');
      expect(pendingWork).toHaveLength(1);
      expect(pendingWork[0].id).toBe(assignment.id);
    });
  });

  describe('submitAssignment', () => {
    it('should submit assignment successfully', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      const fileUrls = ['file1.pdf', 'file2.pdf'];
      const submission = service.submitAssignment(assignment.id, 'student-1', fileUrls);

      expect(submission.status).toBe(AssignmentStatus.SUBMITTED);
      expect(submission.fileUrls).toEqual(fileUrls);
      expect(submission.submittedAt).toBeInstanceOf(Date);
    });

    it('should transition from PENDING to SUBMITTED', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      const submissionBefore = service.getSubmission(assignment.id, 'student-1');
      expect(submissionBefore!.status).toBe(AssignmentStatus.PENDING);

      service.submitAssignment(assignment.id, 'student-1', ['file.pdf']);

      const submissionAfter = service.getSubmission(assignment.id, 'student-1');
      expect(submissionAfter!.status).toBe(AssignmentStatus.SUBMITTED);
    });

    it('should transition from OVERDUE to SUBMITTED', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2020-01-01'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      service.markOverdueAssignments();
      const submissionBefore = service.getSubmission(assignment.id, 'student-1');
      expect(submissionBefore!.status).toBe(AssignmentStatus.OVERDUE);

      service.submitAssignment(assignment.id, 'student-1', ['file.pdf']);

      const submissionAfter = service.getSubmission(assignment.id, 'student-1');
      expect(submissionAfter!.status).toBe(AssignmentStatus.SUBMITTED);
    });

    it('should throw error if assignment not found', () => {
      expect(() =>
        service.submitAssignment('invalid-id', 'student-1', ['file.pdf'])
      ).toThrow('Assignment not found');
    });

    it('should throw error if student not assigned to assignment', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      expect(() =>
        service.submitAssignment(assignment.id, 'student-999', ['file.pdf'])
      ).toThrow('Student is not assigned to this assignment');
    });

    it('should throw error if already submitted', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      service.submitAssignment(assignment.id, 'student-1', ['file.pdf']);

      expect(() =>
        service.submitAssignment(assignment.id, 'student-1', ['file2.pdf'])
      ).toThrow('Assignment already submitted');
    });
  });

  describe('getSubmissionStatus', () => {
    it('should return correct overview for assignment', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2024-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1', 'student-2', 'student-3', 'student-4'],
      });

      // Submit for one student
      service.submitAssignment(assignment.id, 'student-1', ['file.pdf']);

      const overview = service.getSubmissionStatus(assignment.id);

      expect(overview.assignmentId).toBe(assignment.id);
      expect(overview.totalStudents).toBe(4);
      expect(overview.submitted).toBe(1);
      expect(overview.pending).toBe(3);
      expect(overview.overdue).toBe(0);
      expect(overview.graded).toBe(0);
    });

    it('should count overdue submissions correctly', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2020-01-01'),
        pointValue: 100,
        assignedStudents: ['student-1', 'student-2'],
      });

      service.markOverdueAssignments();

      const overview = service.getSubmissionStatus(assignment.id);

      expect(overview.overdue).toBe(2);
      expect(overview.pending).toBe(0);
    });

    it('should throw error if assignment not found', () => {
      expect(() => service.getSubmissionStatus('invalid-id')).toThrow(
        'Assignment not found'
      );
    });
  });

  describe('markOverdueAssignments', () => {
    it('should mark pending assignments past due date as overdue', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2020-01-01'),
        pointValue: 100,
        assignedStudents: ['student-1', 'student-2'],
      });

      const markedCount = service.markOverdueAssignments();

      expect(markedCount).toBe(2);

      const submission1 = service.getSubmission(assignment.id, 'student-1');
      const submission2 = service.getSubmission(assignment.id, 'student-2');

      expect(submission1!.status).toBe(AssignmentStatus.OVERDUE);
      expect(submission2!.status).toBe(AssignmentStatus.OVERDUE);
    });

    it('should not mark future assignments as overdue', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2099-12-31'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      const markedCount = service.markOverdueAssignments();

      expect(markedCount).toBe(0);

      const submission = service.getSubmission(assignment.id, 'student-1');
      expect(submission!.status).toBe(AssignmentStatus.PENDING);
    });

    it('should not mark submitted assignments as overdue', () => {
      const assignment = service.createAssignment({
        title: 'Assignment',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2020-01-01'),
        pointValue: 100,
        assignedStudents: ['student-1'],
      });

      service.submitAssignment(assignment.id, 'student-1', ['file.pdf']);

      const markedCount = service.markOverdueAssignments();

      expect(markedCount).toBe(0);

      const submission = service.getSubmission(assignment.id, 'student-1');
      expect(submission!.status).toBe(AssignmentStatus.SUBMITTED);
    });

    it('should return count of marked assignments', () => {
      service.createAssignment({
        title: 'Assignment 1',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2020-01-01'),
        pointValue: 100,
        assignedStudents: ['student-1', 'student-2'],
      });

      service.createAssignment({
        title: 'Assignment 2',
        description: 'Description',
        teacherId: 'teacher-1',
        subjectId: 'math-101',
        classId: 'class-a',
        dueDate: new Date('2020-01-01'),
        pointValue: 100,
        assignedStudents: ['student-3'],
      });

      const markedCount = service.markOverdueAssignments();

      expect(markedCount).toBe(3);
    });
  });
});
