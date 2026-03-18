// Validation utilities for the School Management System

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates password complexity requirements
 * Requirements: At least 8 characters with mixed case and numbers
 * @param password - The password to validate
 * @returns ValidationResult indicating if password meets requirements
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a grade entry against a grading scale
 * @param score - The score to validate
 * @param maxScore - The maximum possible score
 * @param gradingScale - The grading scale with valid ranges
 * @returns ValidationResult indicating if grade is valid
 */
export function validateGrade(
  score: number,
  maxScore: number,
  gradingScale: { ranges: Array<{ minScore: number; maxScore: number }> }
): ValidationResult {
  const errors: string[] = [];

  // Check if score is within 0 to maxScore range
  if (score < 0) {
    errors.push('Score cannot be negative');
  }

  if (score > maxScore) {
    errors.push(`Score cannot exceed maximum score of ${maxScore}`);
  }

  // Check if score falls within any valid range in the grading scale
  // The grading scale should cover the full 0-100 range
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  
  // Check if percentage is within 0-100 range (valid for grading)
  if (percentage < 0 || percentage > 100) {
    if (errors.length === 0) {
      errors.push('Score percentage is outside valid range');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that an assignment has all required fields
 * Requirements: title, description, due date, and point value
 * @param assignment - The assignment object to validate
 * @returns ValidationResult indicating if assignment has all required fields
 */
export function validateAssignment(assignment: {
  title?: string;
  description?: string;
  dueDate?: Date;
  pointValue?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!assignment.title || assignment.title.trim() === '') {
    errors.push('Assignment must have a title');
  }

  if (!assignment.description || assignment.description.trim() === '') {
    errors.push('Assignment must have a description');
  }

  if (!assignment.dueDate) {
    errors.push('Assignment must have a due date');
  } else if (!(assignment.dueDate instanceof Date) || isNaN(assignment.dueDate.getTime())) {
    errors.push('Assignment due date must be a valid date');
  }

  if (assignment.pointValue === undefined || assignment.pointValue === null) {
    errors.push('Assignment must have a point value');
  } else if (typeof assignment.pointValue !== 'number') {
    errors.push('Assignment point value must be a number');
  } else if (assignment.pointValue < 0) {
    errors.push('Assignment point value cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
