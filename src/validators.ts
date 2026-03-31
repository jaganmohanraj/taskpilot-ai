import { z } from 'zod';

/**
 * Evidence Validation System
 * Ensures evidence meets minimum standards before being accepted
 */

export interface EvidenceValidationResult {
  valid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

const MIN_EVIDENCE_LENGTH = 20;
const MIN_EVIDENCE_SCORE = 60;

// Suspicious patterns that indicate fake or low-quality evidence
const SUSPICIOUS_PATTERNS = [
  /^done$/i,
  /^lol$/i,
  /^ok$/i,
  /^yes$/i,
  /^complete$/i,
  /^finished$/i,
  /^👍$/,
  /^✓$/,
  /^good$/i,
];

// Positive indicators of quality evidence
const QUALITY_INDICATORS = [
  { pattern: /screenshot|image|photo/i, weight: 15, description: 'References visual proof' },
  { pattern: /test.*pass/i, weight: 20, description: 'References passing tests' },
  { pattern: /commit|sha|hash/i, weight: 15, description: 'References code commits' },
  { pattern: /\d+\s+(test|spec|case)/i, weight: 15, description: 'Quantifies test results' },
  { pattern: /verified|confirmed|validated/i, weight: 10, description: 'Explicit verification' },
  { pattern: /deployed|released|published/i, weight: 12, description: 'References deployment' },
  { pattern: /\d+%/i, weight: 8, description: 'Includes percentage metrics' },
  { pattern: /benchmark|performance|metric/i, weight: 10, description: 'Includes metrics' },
  { pattern: /log|output|result/i, weight: 8, description: 'References logs or output' },
];

/**
 * Validate evidence quality
 */
export function validateEvidence(title: string, content: string): EvidenceValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 50; // Base score

  // Check minimum length
  if (content.length < MIN_EVIDENCE_LENGTH) {
    issues.push(`Evidence too short (${content.length} chars, minimum ${MIN_EVIDENCE_LENGTH})`);
    score -= 30;
  } else {
    score += 10;
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      issues.push('Evidence appears to be placeholder or minimal text');
      score -= 40;
      suggestions.push('Provide specific details about what was completed and how it was verified');
      break;
    }
  }

  // Check for quality indicators
  let qualityBonus = 0;
  const foundIndicators: string[] = [];
  for (const indicator of QUALITY_INDICATORS) {
    if (indicator.pattern.test(content)) {
      qualityBonus += indicator.weight;
      foundIndicators.push(indicator.description);
    }
  }
  score += Math.min(qualityBonus, 40); // Cap quality bonus at 40 points

  // Check title quality
  if (title.length < 5) {
    issues.push('Evidence title too short');
    score -= 10;
  } else {
    score += 5;
  }

  // Generate suggestions if score is low
  if (score < MIN_EVIDENCE_SCORE) {
    if (foundIndicators.length === 0) {
      suggestions.push('Include references to: screenshots, test results, commits, or deployment status');
    }
    suggestions.push('Be specific about what was done and how it meets acceptance criteria');
    suggestions.push('Include quantifiable metrics or verifiable artifacts');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    valid: score >= MIN_EVIDENCE_SCORE,
    score,
    issues,
    suggestions,
  };
}

/**
 * Acceptance Criteria Parser
 * Validates and parses acceptance criteria to ensure they're testable
 */

export interface ParsedCriteria {
  valid: boolean;
  criteria: string[];
  issues: string[];
  suggestions: string[];
}

export function parseAcceptanceCriteria(acceptanceCriteria: string): ParsedCriteria {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const criteria: string[] = [];

  if (!acceptanceCriteria || acceptanceCriteria.trim().length === 0) {
    issues.push('No acceptance criteria provided');
    suggestions.push('Define specific, measurable, testable criteria');
    return { valid: false, criteria: [], issues, suggestions };
  }

  // Split by newlines and filter out empty lines
  const lines = acceptanceCriteria
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    issues.push('Acceptance criteria is empty');
    return { valid: false, criteria: [], issues, suggestions };
  }

  // Check each criterion
  for (const line of lines) {
    if (line.length < 10) {
      issues.push(`Criterion too vague: "${line}"`);
      suggestions.push('Each criterion should be specific and measurable');
    } else if (!/[a-zA-Z]{3,}/.test(line)) {
      issues.push(`Criterion doesn't contain meaningful text: "${line}"`);
    } else {
      criteria.push(line);
    }
  }

  // Check for testable language
  const testablePatterns = [
    /must|should|will|shall|can|able to/i,
    /\d+|all|every|each|any/i,
    /complete|finish|implement|create|add|remove|fix|update/i,
  ];

  let testableCount = 0;
  for (const criterion of criteria) {
    if (testablePatterns.some(p => p.test(criterion))) {
      testableCount++;
    }
  }

  if (testableCount < criteria.length * 0.5) {
    issues.push('Many criteria are not clearly testable');
    suggestions.push('Use specific action verbs and measurable outcomes');
    suggestions.push('Examples: "User can log in", "API returns within 200ms", "All 10 tests pass"');
  }

  return {
    valid: criteria.length > 0 && issues.length === 0,
    criteria,
    issues,
    suggestions,
  };
}

/**
 * State Transition Validator
 * Ensures state transitions are legal
 */

const VALID_PROJECT_TRANSITIONS: Record<string, string[]> = {
  draft: ['planned', 'archived'],
  planned: ['in_progress', 'blocked', 'archived'],
  in_progress: ['blocked', 'awaiting_verification', 'archived'],
  blocked: ['in_progress', 'archived'],
  awaiting_verification: ['verified', 'in_progress', 'archived'],
  verified: ['done', 'in_progress'],
  done: ['archived'],
  archived: [],
};

const VALID_TASK_TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress', 'blocked'],
  in_progress: ['blocked', 'done', 'todo'],
  blocked: ['in_progress', 'todo'],
  done: ['in_progress'], // Allow reopening
};

export function validateProjectTransition(from: string, to: string): { valid: boolean; reason?: string } {
  if (from === to) {
    return { valid: false, reason: 'Cannot transition to same state' };
  }

  const allowedTransitions = VALID_PROJECT_TRANSITIONS[from];
  if (!allowedTransitions) {
    return { valid: false, reason: `Unknown state: ${from}` };
  }

  if (!allowedTransitions.includes(to)) {
    return {
      valid: false,
      reason: `Invalid transition from ${from} to ${to}. Allowed: ${allowedTransitions.join(', ')}`,
    };
  }

  return { valid: true };
}

export function validateTaskTransition(from: string, to: string): { valid: boolean; reason?: string } {
  if (from === to) {
    return { valid: false, reason: 'Cannot transition to same state' };
  }

  const allowedTransitions = VALID_TASK_TRANSITIONS[from];
  if (!allowedTransitions) {
    return { valid: false, reason: `Unknown state: ${from}` };
  }

  if (!allowedTransitions.includes(to)) {
    return {
      valid: false,
      reason: `Invalid transition from ${from} to ${to}. Allowed: ${allowedTransitions.join(', ')}`,
    };
  }

  return { valid: true };
}
