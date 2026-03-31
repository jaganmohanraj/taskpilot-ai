import { describe, it, expect } from '@jest/globals';
import {
  validateEvidence,
  parseAcceptanceCriteria,
  validateProjectTransition,
  validateTaskTransition,
} from './validators.js';

describe('validators', () => {
  describe('validateEvidence', () => {
    it('should validate high-quality evidence', () => {
      const result = validateEvidence(
        'Test Results',
        'Deployed commit abc123 with screenshot showing 50 tests passed. Performance metrics show 99% uptime.'
      );

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject evidence that is too short', () => {
      const result = validateEvidence('Title', 'Done');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Evidence too short (4 chars, minimum 20)');
      expect(result.score).toBeLessThan(60);
    });

    it('should detect placeholder text', () => {
      const result = validateEvidence('Title', 'done');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Evidence appears to be placeholder or minimal text');
      expect(result.score).toBeLessThan(60);
    });

    it('should detect "ok" placeholder', () => {
      const result = validateEvidence('Title', 'ok');

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('placeholder'))).toBe(true);
    });

    it('should detect "yes" placeholder', () => {
      const result = validateEvidence('Title', 'yes');

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('placeholder'))).toBe(true);
    });

    it('should detect "complete" placeholder', () => {
      const result = validateEvidence('Title', 'complete');

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('placeholder'))).toBe(true);
    });

    it('should detect "finished" placeholder', () => {
      const result = validateEvidence('Title', 'finished');

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('placeholder'))).toBe(true);
    });

    it('should give bonus for screenshot references', () => {
      const withScreenshot = validateEvidence(
        'Evidence',
        'Completed the feature with screenshot showing the UI working perfectly'
      );
      const withoutScreenshot = validateEvidence(
        'Evidence',
        'Completed the feature with the UI working perfectly as expected'
      );

      expect(withScreenshot.score).toBeGreaterThan(withoutScreenshot.score);
    });

    it('should give bonus for test results', () => {
      const result = validateEvidence(
        'Evidence',
        'All tests passed successfully with 100% coverage'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should give bonus for commit references', () => {
      const result = validateEvidence(
        'Evidence',
        'Deployed commit sha256:abc123def456 to production'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should give bonus for quantified test results', () => {
      const result = validateEvidence(
        'Evidence',
        'Successfully ran 50 test cases with all passing'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should give bonus for verification language', () => {
      const result = validateEvidence(
        'Evidence',
        'Verified and confirmed that all features work as expected'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should give bonus for deployment references', () => {
      const result = validateEvidence(
        'Evidence',
        'Successfully deployed to production and released version 1.0'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should give bonus for percentage metrics', () => {
      const result = validateEvidence(
        'Evidence',
        'Achieved 95% code coverage with comprehensive test suite'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should give bonus for performance metrics', () => {
      const result = validateEvidence(
        'Evidence',
        'Performance benchmark shows 200ms response time, meeting requirements'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should give bonus for logs and output', () => {
      const result = validateEvidence(
        'Evidence',
        'Server logs show successful deployment with no errors in output'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should penalize short titles', () => {
      const result = validateEvidence('Hi', 'This is a very detailed evidence description with lots of information');

      expect(result.issues).toContain('Evidence title too short');
      expect(result.score).toBeLessThan(70);
    });

    it('should reward good titles', () => {
      const result = validateEvidence(
        'Comprehensive Test Results',
        'All 50 tests passed with screenshot showing green checkmarks'
      );

      expect(result.score).toBeGreaterThan(60);
    });

    it('should provide suggestions when score is low', () => {
      const result = validateEvidence('Title', 'Basic info here');

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should cap score at 100', () => {
      const result = validateEvidence(
        'Comprehensive Evidence',
        'Deployed commit abc123 with screenshot showing 100 tests passed. Verified performance metrics at 99% uptime. Benchmark results confirm latency under 200ms. Released to production with detailed logs showing successful output.'
      );

      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should floor score at 0', () => {
      const result = validateEvidence('', '');

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('parseAcceptanceCriteria', () => {
    it('should parse valid acceptance criteria', () => {
      const result = parseAcceptanceCriteria(
        'User must be able to login\nAPI should return data within 200ms\nAll tests must pass'
      );

      expect(result.valid).toBe(true);
      expect(result.criteria).toHaveLength(3);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail when criteria is empty', () => {
      const result = parseAcceptanceCriteria('');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No acceptance criteria provided');
    });

    it('should fail when criteria is whitespace only', () => {
      const result = parseAcceptanceCriteria('   \n  \n  ');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No acceptance criteria provided');
    });

    it('should filter out empty lines', () => {
      const result = parseAcceptanceCriteria(
        'Valid criterion one\n\n\nValid criterion two\n\n'
      );

      expect(result.criteria).toHaveLength(2);
    });

    it('should reject criteria that are too short', () => {
      const result = parseAcceptanceCriteria('Short\nAnother short one');

      expect(result.issues.some(i => i.includes('too vague'))).toBe(true);
    });

    it('should reject criteria without meaningful text', () => {
      const result = parseAcceptanceCriteria('123 456 789');

      expect(result.issues.some(i => i.includes("doesn't contain meaningful text"))).toBe(true);
    });

    it('should detect testable language with "must"', () => {
      const result = parseAcceptanceCriteria(
        'User must login successfully\nAPI must return results'
      );

      expect(result.valid).toBe(true);
    });

    it('should detect testable language with "should"', () => {
      const result = parseAcceptanceCriteria(
        'Application should handle errors\nData should persist'
      );

      expect(result.valid).toBe(true);
    });

    it('should detect testable language with numbers', () => {
      const result = parseAcceptanceCriteria(
        'Response time under 200ms\nProcess 1000 requests per second'
      );

      expect(result.valid).toBe(true);
    });

    it('should detect testable language with action verbs', () => {
      const result = parseAcceptanceCriteria(
        'Complete the registration flow\nImplement user authentication'
      );

      expect(result.valid).toBe(true);
    });

    it('should warn about non-testable criteria', () => {
      const result = parseAcceptanceCriteria(
        'Something vague happens here\nAnother unclear thing occurs'
      );

      expect(result.issues.some(i => i.includes('not clearly testable'))).toBe(true);
    });

    it('should provide suggestions for improvement', () => {
      const result = parseAcceptanceCriteria('X');

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle mixed valid and invalid criteria', () => {
      const result = parseAcceptanceCriteria(
        'User must be able to login\nX\nAPI should return 200'
      );

      expect(result.criteria.length).toBeGreaterThan(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('validateProjectTransition', () => {
    it('should allow valid draft to planned transition', () => {
      const result = validateProjectTransition('draft', 'planned');

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow draft to archived transition', () => {
      const result = validateProjectTransition('draft', 'archived');

      expect(result.valid).toBe(true);
    });

    it('should allow planned to in_progress transition', () => {
      const result = validateProjectTransition('planned', 'in_progress');

      expect(result.valid).toBe(true);
    });

    it('should allow planned to blocked transition', () => {
      const result = validateProjectTransition('planned', 'blocked');

      expect(result.valid).toBe(true);
    });

    it('should allow in_progress to awaiting_verification transition', () => {
      const result = validateProjectTransition('in_progress', 'awaiting_verification');

      expect(result.valid).toBe(true);
    });

    it('should allow awaiting_verification to verified transition', () => {
      const result = validateProjectTransition('awaiting_verification', 'verified');

      expect(result.valid).toBe(true);
    });

    it('should allow verified to done transition', () => {
      const result = validateProjectTransition('verified', 'done');

      expect(result.valid).toBe(true);
    });

    it('should allow done to archived transition', () => {
      const result = validateProjectTransition('done', 'archived');

      expect(result.valid).toBe(true);
    });

    it('should reject transition to same state', () => {
      const result = validateProjectTransition('draft', 'draft');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Cannot transition to same state');
    });

    it('should reject invalid from state', () => {
      const result = validateProjectTransition('invalid_state', 'planned');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Unknown state: invalid_state');
    });

    it('should reject invalid transition from draft to done', () => {
      const result = validateProjectTransition('draft', 'done');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });

    it('should reject transition from archived', () => {
      const result = validateProjectTransition('archived', 'draft');

      expect(result.valid).toBe(false);
    });

    it('should provide helpful error messages', () => {
      const result = validateProjectTransition('draft', 'done');

      expect(result.reason).toContain('draft');
      expect(result.reason).toContain('done');
      expect(result.reason).toContain('Allowed:');
    });
  });

  describe('validateTaskTransition', () => {
    it('should allow valid todo to in_progress transition', () => {
      const result = validateTaskTransition('todo', 'in_progress');

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow todo to blocked transition', () => {
      const result = validateTaskTransition('todo', 'blocked');

      expect(result.valid).toBe(true);
    });

    it('should allow in_progress to done transition', () => {
      const result = validateTaskTransition('in_progress', 'done');

      expect(result.valid).toBe(true);
    });

    it('should allow in_progress to blocked transition', () => {
      const result = validateTaskTransition('in_progress', 'blocked');

      expect(result.valid).toBe(true);
    });

    it('should allow blocked to in_progress transition', () => {
      const result = validateTaskTransition('blocked', 'in_progress');

      expect(result.valid).toBe(true);
    });

    it('should allow done to in_progress transition (reopening)', () => {
      const result = validateTaskTransition('done', 'in_progress');

      expect(result.valid).toBe(true);
    });

    it('should reject transition to same state', () => {
      const result = validateTaskTransition('todo', 'todo');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Cannot transition to same state');
    });

    it('should reject invalid from state', () => {
      const result = validateTaskTransition('invalid_state', 'in_progress');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Unknown state: invalid_state');
    });

    it('should reject invalid transition from todo to done', () => {
      const result = validateTaskTransition('todo', 'done');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });

    it('should provide helpful error messages', () => {
      const result = validateTaskTransition('todo', 'done');

      expect(result.reason).toContain('todo');
      expect(result.reason).toContain('done');
      expect(result.reason).toContain('Allowed:');
    });
  });
});
