import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './helpers/createTestDb.js';

// Module-level ref swapped per test so the getter always returns the current DB.
let testDb: Database.Database;

vi.mock('../src/lib/db.js', () => ({
  get db() {
    return testDb;
  },
  initDb: vi.fn(),
}));

import { Verifier } from '../src/verifier.js';

describe('Verifier', () => {
  let verifier: Verifier;

  beforeEach(() => {
    testDb = createTestDb();
    verifier = new Verifier();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('runCompletionAudit', () => {
    it('should pass audit for a complete project', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', 'Feature X works as expected', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at, completed_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'done', 1, '2024-01-01', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO evidence_entries (id, project_id, title, content, created_at)
        VALUES ('ev_1', 'proj_1', 'Proof of completion', 'Screenshot attached', '2024-01-01')`
        )
        .run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(true);
      expect(result.score).toBe(100);
      expect(result.reasons).toHaveLength(0);
    });

    it('should fail audit when acceptance criteria are missing', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', '', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('Missing acceptance criteria');
      expect(result.score).toBeLessThan(100);
    });

    it('should fail audit when tasks are not complete', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'todo', 1, '2024-01-01', '2024-01-01')`
        )
        .run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('1 open tasks remain');
    });

    it('should fail audit when blockers are unresolved', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO memory_entries (id, project_id, kind, content, is_resolved, created_at)
        VALUES ('mem_1', 'proj_1', 'blocker', 'Cannot proceed due to API issue', 0, '2024-01-01')`
        )
        .run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('1 unresolved blockers remain');
    });

    it('should fail audit when no evidence is logged', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at, completed_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'done', 1, '2024-01-01', '2024-01-01', '2024-01-01')`
        )
        .run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('No evidence logged');
    });

    it('should save audit trail', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      verifier.runCompletionAudit('proj_1');

      const auditTrail = testDb
        .prepare(`SELECT * FROM audit_trail WHERE project_id = 'proj_1'`)
        .all() as Array<Record<string, unknown>>;
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].audit_type).toBe('completion');
    });
  });

  describe('whyNotDone', () => {
    it('should return empty array for complete project', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at, completed_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'done', 1, '2024-01-01', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO evidence_entries (id, project_id, title, content, created_at)
        VALUES ('ev_1', 'proj_1', 'Proof', 'Done', '2024-01-01')`
        )
        .run();

      const reasons = verifier.whyNotDone('proj_1');
      expect(reasons).toHaveLength(0);
    });

    it('should list all blocking reasons', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', '', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'todo', 1, '2024-01-01', '2024-01-01')`
        )
        .run();

      const reasons = verifier.whyNotDone('proj_1');
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons).toContain('Missing acceptance criteria');
      expect(reasons).toContain('1 open tasks remain');
      expect(reasons).toContain('No evidence logged');
    });
  });

  describe('canClose', () => {
    it('should return canClose=true when audit passes', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', 'Feature X works as expected', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at, completed_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'done', 1, '2024-01-01', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO evidence_entries (id, project_id, title, content, created_at)
        VALUES ('ev_1', 'proj_1', 'Proof', 'Done', '2024-01-01')`
        )
        .run();

      const result = verifier.canClose('proj_1');
      expect(result.canClose).toBe(true);
    });

    it('should return canClose=false with reason when audit fails', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', '', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      const result = verifier.canClose('proj_1');
      expect(result.canClose).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history for project', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Implement feature X end-to-end', 'Criteria', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      verifier.runCompletionAudit('proj_1');
      verifier.runCompletionAudit('proj_1');

      const history = verifier.getAuditHistory('proj_1');
      expect(history).toHaveLength(2);
      expect(history[0].projectId).toBe('proj_1');
      expect(history[0].auditType).toBe('completion');
    });
  });
});
