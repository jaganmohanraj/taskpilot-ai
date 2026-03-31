import { describe, it, expect, beforeEach } from '@jest/globals';
import { Verifier } from './verifier.js';
import { initDb, db } from './lib/db.js';
import { TaskEngine } from './taskEngine.js';

describe('Verifier', () => {
  let verifier: Verifier;
  let engine: TaskEngine;

  beforeEach(() => {
    // Use in-memory database for tests
    initDb();
    db.exec('DELETE FROM projects');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM memory_entries');
    db.exec('DELETE FROM evidence_entries');
    db.exec('DELETE FROM drift_checks');
    db.exec('DELETE FROM audit_trail');

    verifier = new Verifier();
    engine = new TaskEngine();
  });

  describe('runCompletionAudit', () => {
    it('should fail audit when project not found', () => {
      const result = verifier.runCompletionAudit('nonexistent');
      expect(result.pass).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reasons).toContain('Project not found');
    });

    it('should fail audit when acceptance criteria missing', () => {
      const project = engine.createProject('Test', 'Objective', '');
      const result = verifier.runCompletionAudit(project.id);
      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('Missing acceptance criteria');
    });

    it('should fail audit when tasks are incomplete', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria 1\nCriteria 2');
      engine.createTask(project.id, 'Task 1', 'Details', 100);
      const result = verifier.runCompletionAudit(project.id);
      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('1 open tasks remain');
    });

    it('should fail audit when no evidence logged', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria 1');
      const result = verifier.runCompletionAudit(project.id);
      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('No evidence logged');
    });

    it('should fail audit when blockers unresolved', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria 1');
      engine.logMemory(project.id, 'blocker', 'API is down');
      const result = verifier.runCompletionAudit(project.id);
      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('1 unresolved blockers remain');
    });

    it('should fail audit when unverified assumptions exist', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria 1');
      engine.logMemory(project.id, 'assumption', 'User has permissions');
      const result = verifier.runCompletionAudit(project.id);
      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('1 unverified assumptions remain');
    });

    it('should pass audit when all criteria met', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria 1');
      const task = engine.createTask(project.id, 'Task 1', 'Details', 100);
      engine.updateTaskStatus(task.id, 'in_progress');
      engine.updateTaskStatus(task.id, 'done');
      engine.logEvidence(project.id, 'Deployment Proof', 'Successfully deployed commit abc123 with screenshot showing 15 tests passed and production monitoring at 99% uptime.');

      const result = verifier.runCompletionAudit(project.id);
      expect(result.pass).toBe(true);
      expect(result.score).toBe(100);
      expect(result.reasons).toHaveLength(0);
    });

    it('should include drift checks in audit', () => {
      const project = engine.createProject('Test', 'O', ''); // Vague objective
      const result = verifier.runCompletionAudit(project.id);
      expect(result.driftChecks).toBeDefined();
      expect(result.driftChecks!.length).toBeGreaterThan(0);
    });

    it('should save audit trail', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      verifier.runCompletionAudit(project.id);
      const history = verifier.getAuditHistory(project.id);
      expect(history.length).toBe(1);
      expect(history[0].auditType).toBe('completion');
    });
  });

  describe('whyNotDone', () => {
    it('should return empty array when project complete', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task = engine.createTask(project.id, 'Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'in_progress');
      engine.updateTaskStatus(task.id, 'done');
      engine.logEvidence(project.id, 'Test Proof', 'All 30 integration tests passed successfully with commit SHA def456. Deployed to staging with 100% health check pass rate.');

      const reasons = verifier.whyNotDone(project.id);
      expect(reasons).toHaveLength(0);
    });

    it('should list all blockers to completion', () => {
      const project = engine.createProject('Test', 'Objective', '');
      engine.createTask(project.id, 'Task', 'Details', 100);
      engine.logMemory(project.id, 'blocker', 'Blocker 1');

      const reasons = verifier.whyNotDone(project.id);
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons).toContain('Missing acceptance criteria');
      expect(reasons).toContain('1 open tasks remain');
      expect(reasons).toContain('1 unresolved blockers remain');
      expect(reasons).toContain('No evidence logged');
    });
  });

  describe('canClose', () => {
    it('should return false when audit fails', () => {
      const project = engine.createProject('Test', 'Objective', '');
      const result = verifier.canClose(project.id);
      expect(result.canClose).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should return true when audit passes', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task = engine.createTask(project.id, 'Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'in_progress');
      engine.updateTaskStatus(task.id, 'done');
      engine.logEvidence(project.id, 'Performance Metrics', 'Benchmark results show 99th percentile latency under 200ms with 50 concurrent users. Load test passed with commit ghi789. All acceptance criteria verified.');

      const result = verifier.canClose(project.id);
      expect(result.canClose).toBe(true);
    });
  });
});
