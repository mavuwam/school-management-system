import * as fc from 'fast-check';
import { validatePassword, validateGrade, validateAssignment } from './validation';

describe('Password Validation', () => {
  // Feature: school-management-system, Property 3: Password Complexity Validation
  // **Validates: Requirements 1.3**
  describe('Property 3: Password Complexity Validation', () => {
    test('valid passwords with 8+ chars, mixed case, and numbers are accepted', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s)),
          (password) => {
            const result = validatePassword(password);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('passwords without lowercase letters are rejected', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((s) => !/[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s)),
          (password) => {
            const result = validatePassword(password);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('lowercase'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('passwords without uppercase letters are rejected', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((s) => /[a-z]/.test(s) && !/[A-Z]/.test(s) && /[0-9]/.test(s)),
          (password) => {
            const result = validatePassword(password);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('passwords without numbers are rejected', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 8, maxLength: 50 })
            .filter((s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && !/[0-9]/.test(s)),
          (password) => {
            const result = validatePassword(password);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('number'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('passwords shorter than 8 characters are rejected', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 7 })
            .filter((s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s)),
          (password) => {
            const result = validatePassword(password);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('8 characters'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('empty passwords are rejected', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('specific valid examples are accepted', () => {
      const validPasswords = ['Password1', 'Test1234', 'Abc12345', 'MyPass99'];
      validPasswords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      });
    });

    test('specific invalid examples are rejected', () => {
      const invalidPasswords = [
        'short1A', // too short
        'password1', // no uppercase
        'PASSWORD1', // no lowercase
        'PasswordABC', // no number
        'Pass1', // too short
      ];
      invalidPasswords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
      });
    });
  });
});

describe('Grade Validation', () => {
  // Feature: school-management-system, Property 24: Grade Validation Against Scale
  // **Validates: Requirements 7.1**
  describe('Property 24: Grade Validation Against Scale', () => {
    const standardGradingScale = {
      ranges: [
        { minScore: 90, maxScore: 100, letterGrade: 'A', gpaValue: 4.0 },
        { minScore: 80, maxScore: 90, letterGrade: 'B', gpaValue: 3.0 },
        { minScore: 70, maxScore: 80, letterGrade: 'C', gpaValue: 2.0 },
        { minScore: 60, maxScore: 70, letterGrade: 'D', gpaValue: 1.0 },
        { minScore: 0, maxScore: 60, letterGrade: 'F', gpaValue: 0.0 },
      ],
    };

    test('valid scores within grading scale are accepted', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // score
          fc.integer({ min: 1, max: 100 }), // maxScore
          (score, maxScore) => {
            // Ensure score doesn't exceed maxScore
            const validScore = Math.min(score, maxScore);
            const result = validateGrade(validScore, maxScore, standardGradingScale);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('negative scores are rejected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: -1 }), // negative score
          fc.integer({ min: 1, max: 100 }), // maxScore
          (score, maxScore) => {
            const result = validateGrade(score, maxScore, standardGradingScale);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('negative'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('scores exceeding maxScore are rejected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // maxScore
          fc.integer({ min: 1, max: 50 }), // excess amount
          (maxScore, excess) => {
            const score = maxScore + excess;
            const result = validateGrade(score, maxScore, standardGradingScale);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('exceed'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('specific valid examples are accepted', () => {
      const validExamples = [
        { score: 95, maxScore: 100 }, // A grade
        { score: 85, maxScore: 100 }, // B grade
        { score: 75, maxScore: 100 }, // C grade
        { score: 65, maxScore: 100 }, // D grade
        { score: 50, maxScore: 100 }, // F grade
        { score: 45, maxScore: 50 }, // 90% - A grade
        { score: 40, maxScore: 50 }, // 80% - B grade
      ];

      validExamples.forEach(({ score, maxScore }) => {
        const result = validateGrade(score, maxScore, standardGradingScale);
        expect(result.valid).toBe(true);
      });
    });

    test('specific invalid examples are rejected', () => {
      const invalidExamples = [
        { score: -10, maxScore: 100 }, // negative
        { score: 110, maxScore: 100 }, // exceeds max
        { score: 60, maxScore: 50 }, // exceeds max
      ];

      invalidExamples.forEach(({ score, maxScore }) => {
        const result = validateGrade(score, maxScore, standardGradingScale);
        expect(result.valid).toBe(false);
      });
    });

    test('edge case: zero score is valid', () => {
      const result = validateGrade(0, 100, standardGradingScale);
      expect(result.valid).toBe(true);
    });

    test('edge case: perfect score is valid', () => {
      const result = validateGrade(100, 100, standardGradingScale);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Assignment Validation', () => {
  // Feature: school-management-system, Property 34: Assignment Required Fields Validation
  // **Validates: Requirements 9.2**
  describe('Property 34: Assignment Required Fields Validation', () => {
    test('assignments with all required fields are accepted', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0), // title
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0), // description
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), // dueDate
          fc.integer({ min: 0, max: 1000 }), // pointValue
          (title, description, dueDate, pointValue) => {
            const assignment = { title, description, dueDate, pointValue };
            const result = validateAssignment(assignment);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('assignments without title are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0), // description
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), // dueDate
          fc.integer({ min: 0, max: 1000 }), // pointValue
          (description, dueDate, pointValue) => {
            const assignment = { description, dueDate, pointValue };
            const result = validateAssignment(assignment);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('title'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('assignments with empty title are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0), // description
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), // dueDate
          fc.integer({ min: 0, max: 1000 }), // pointValue
          (description, dueDate, pointValue) => {
            const assignment = { title: '   ', description, dueDate, pointValue };
            const result = validateAssignment(assignment);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('title'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('assignments without description are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0), // title
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), // dueDate
          fc.integer({ min: 0, max: 1000 }), // pointValue
          (title, dueDate, pointValue) => {
            const assignment = { title, dueDate, pointValue };
            const result = validateAssignment(assignment);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('description'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('assignments without due date are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0), // title
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0), // description
          fc.integer({ min: 0, max: 1000 }), // pointValue
          (title, description, pointValue) => {
            const assignment = { title, description, pointValue };
            const result = validateAssignment(assignment);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('due date'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('assignments without point value are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0), // title
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0), // description
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), // dueDate
          (title, description, dueDate) => {
            const assignment = { title, description, dueDate };
            const result = validateAssignment(assignment);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('point value'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('assignments with negative point value are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0), // title
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0), // description
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), // dueDate
          fc.integer({ min: -1000, max: -1 }), // negative pointValue
          (title, description, dueDate, pointValue) => {
            const assignment = { title, description, dueDate, pointValue };
            const result = validateAssignment(assignment);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('negative'))).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('specific valid examples are accepted', () => {
      const validExamples = [
        {
          title: 'Math Homework',
          description: 'Complete exercises 1-10',
          dueDate: new Date('2024-12-31'),
          pointValue: 100,
        },
        {
          title: 'Essay',
          description: 'Write a 500-word essay',
          dueDate: new Date('2024-06-15'),
          pointValue: 50,
        },
        {
          title: 'Quiz',
          description: 'Chapter 5 quiz',
          dueDate: new Date('2024-03-20'),
          pointValue: 0, // Zero points is valid
        },
      ];

      validExamples.forEach((assignment) => {
        const result = validateAssignment(assignment);
        expect(result.valid).toBe(true);
      });
    });

    test('specific invalid examples are rejected', () => {
      const invalidExamples = [
        { description: 'No title', dueDate: new Date(), pointValue: 100 },
        { title: 'No description', dueDate: new Date(), pointValue: 100 },
        { title: 'No due date', description: 'Test', pointValue: 100 },
        { title: 'No point value', description: 'Test', dueDate: new Date() },
        { title: '', description: 'Empty title', dueDate: new Date(), pointValue: 100 },
        {
          title: 'Negative points',
          description: 'Test',
          dueDate: new Date(),
          pointValue: -10,
        },
      ];

      invalidExamples.forEach((assignment) => {
        const result = validateAssignment(assignment);
        expect(result.valid).toBe(false);
      });
    });
  });
});
