import {
  Assignment,
  AssignmentSubmission,
  AssignmentStatus,
} from '../models';

export interface CreateAssignmentInput {
  title: string;
  description: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  dueDate: Date;
  pointValue: number;
  assignedStudents: string[];
}

export interface SubmissionStatusOverview {
  assignmentId: string;
  totalStudents: number;
  submitted: number;
  pending: number;
  overdue: number;
  graded: number;
}

export class AssignmentService {
  private assignments: Map<string, Assignment> = new Map();
  private submissions: Map<string, AssignmentSubmission> = new Map();
  private studentAssignments: Map<string, string[]> = new Map(); // studentId -> assignmentIds[]

  /**
   * Creates a new assignment and distributes it to assigned students
   */
  createAssignment(input: CreateAssignmentInput): Assignment {
    // Validate required fields
    if (!input.title || input.title.trim() === '') {
      throw new Error('Assignment title is required');
    }
    if (!input.description || input.description.trim() === '') {
      throw new Error('Assignment description is required');
    }
    if (!input.teacherId) {
      throw new Error('Teacher ID is required');
    }
    if (!input.subjectId) {
      throw new Error('Subject ID is required');
    }
    if (!input.classId) {
      throw new Error('Class ID is required');
    }
    if (!input.dueDate) {
      throw new Error('Due date is required');
    }
    if (input.pointValue === undefined || input.pointValue <= 0) {
      throw new Error('Point value must be greater than 0');
    }
    if (!input.assignedStudents || input.assignedStudents.length === 0) {
      throw new Error('At least one student must be assigned');
    }

    const assignment: Assignment = {
      id: `assignment-${Date.now()}-${Math.random()}`,
      title: input.title,
      description: input.description,
      teacherId: input.teacherId,
      subjectId: input.subjectId,
      classId: input.classId,
      dueDate: input.dueDate,
      pointValue: input.pointValue,
      createdAt: new Date(),
      assignedStudents: [...input.assignedStudents],
    };

    this.assignments.set(assignment.id, assignment);

    // Distribute to students
    for (const studentId of assignment.assignedStudents) {
      const studentAssignmentList = this.studentAssignments.get(studentId) || [];
      studentAssignmentList.push(assignment.id);
      this.studentAssignments.set(studentId, studentAssignmentList);

      // Create initial submission record with PENDING status
      const submission: AssignmentSubmission = {
        id: `submission-${assignment.id}-${studentId}`,
        assignmentId: assignment.id,
        studentId,
        submittedAt: new Date(), // Will be updated on actual submission
        status: AssignmentStatus.PENDING,
        fileUrls: [],
      };
      this.submissions.set(submission.id, submission);
    }

    return assignment;
  }

  /**
   * Gets pending work for a student, sorted chronologically by due date
   */
  getPendingWork(studentId: string): Assignment[] {
    const assignmentIds = this.studentAssignments.get(studentId) || [];
    const now = new Date();

    const pendingAssignments: Assignment[] = [];

    for (const assignmentId of assignmentIds) {
      const assignment = this.assignments.get(assignmentId);
      if (!assignment) continue;

      // Find submission for this student
      const submission = this.findSubmission(assignmentId, studentId);
      if (!submission) continue;

      // Include if status is PENDING or OVERDUE
      if (
        submission.status === AssignmentStatus.PENDING ||
        submission.status === AssignmentStatus.OVERDUE
      ) {
        pendingAssignments.push(assignment);
      }
    }

    // Sort chronologically by due date (earliest first)
    pendingAssignments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return pendingAssignments;
  }

  /**
   * Submits an assignment for a student
   */
  submitAssignment(
    assignmentId: string,
    studentId: string,
    fileUrls: string[]
  ): AssignmentSubmission {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (!assignment.assignedStudents.includes(studentId)) {
      throw new Error('Student is not assigned to this assignment');
    }

    const submission = this.findSubmission(assignmentId, studentId);
    if (!submission) {
      throw new Error('Submission record not found');
    }

    // Validate state transition
    if (submission.status === AssignmentStatus.SUBMITTED) {
      throw new Error('Assignment already submitted');
    }
    if (submission.status === AssignmentStatus.GRADED) {
      throw new Error('Cannot resubmit graded assignment');
    }

    // Update submission
    submission.status = AssignmentStatus.SUBMITTED;
    submission.submittedAt = new Date();
    submission.fileUrls = [...fileUrls];

    return submission;
  }

  /**
   * Gets submission status overview for a class
   */
  getSubmissionStatus(assignmentId: string): SubmissionStatusOverview {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const overview: SubmissionStatusOverview = {
      assignmentId,
      totalStudents: assignment.assignedStudents.length,
      submitted: 0,
      pending: 0,
      overdue: 0,
      graded: 0,
    };

    for (const studentId of assignment.assignedStudents) {
      const submission = this.findSubmission(assignmentId, studentId);
      if (!submission) continue;

      switch (submission.status) {
        case AssignmentStatus.SUBMITTED:
          overview.submitted++;
          break;
        case AssignmentStatus.PENDING:
          overview.pending++;
          break;
        case AssignmentStatus.OVERDUE:
          overview.overdue++;
          break;
        case AssignmentStatus.GRADED:
          overview.graded++;
          break;
      }
    }

    return overview;
  }

  /**
   * Marks overdue assignments automatically
   */
  markOverdueAssignments(): number {
    const now = new Date();
    let markedCount = 0;

    for (const submission of this.submissions.values()) {
      if (submission.status !== AssignmentStatus.PENDING) {
        continue;
      }

      const assignment = this.assignments.get(submission.assignmentId);
      if (!assignment) continue;

      // Check if past due date
      if (assignment.dueDate < now) {
        submission.status = AssignmentStatus.OVERDUE;
        markedCount++;
      }
    }

    return markedCount;
  }

  // Helper methods

  private findSubmission(
    assignmentId: string,
    studentId: string
  ): AssignmentSubmission | undefined {
    for (const submission of this.submissions.values()) {
      if (
        submission.assignmentId === assignmentId &&
        submission.studentId === studentId
      ) {
        return submission;
      }
    }
    return undefined;
  }

  getAssignment(assignmentId: string): Assignment | undefined {
    return this.assignments.get(assignmentId);
  }

  getSubmission(assignmentId: string, studentId: string): AssignmentSubmission | undefined {
    return this.findSubmission(assignmentId, studentId);
  }

  getAllSubmissions(assignmentId: string): AssignmentSubmission[] {
    const submissions: AssignmentSubmission[] = [];
    for (const submission of this.submissions.values()) {
      if (submission.assignmentId === assignmentId) {
        submissions.push(submission);
      }
    }
    return submissions;
  }

  // For testing purposes
  clear(): void {
    this.assignments.clear();
    this.submissions.clear();
    this.studentAssignments.clear();
  }
}
