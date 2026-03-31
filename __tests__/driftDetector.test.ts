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

import { DriftDetector } from '../src/driftDetector.js';

describe('DriftDetector', () => {
  let detector: DriftDetector;

  beforeEach(() => {
    testDb = createTestDb();
    detector = new DriftDetector();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('detectDrift', () => {
    it('should detect scope drift when too many tasks', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test', 'Build amazing feature X', 'Works', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      // Create 25 tasks (threshold is 20)
      for (let i = 0; i < 25; i++) {
        testDb
          .prepare(
            `INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at)
          VALUES (?, 'proj_1', 'Task ${i}', 'Details', 'todo', ${i}, '2024-01-01', '2024-01-01')`
          )
          .run(`task_${i}`);
      }

      const checks = detector.detectDrift('proj_1');

      const scopeDrift = checks.find(c => c.checkType === 'scope_drift');
      expect(scopeDrift).toBeDefined();
      expect(scopeDrift?.severity).toBe('high');
    });

    it('should detect vague objectives', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test', 'Build', 'Criteria', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      const checks = detector.detectDrift('proj_1');

      const goalMismatch = checks.find(c => c.checkType === 'goal_mismatch');
      expect(goalMismatch).toBeDefined();
      expect(goalMismatch?.severity).toBe('critical');
    });

    it('should detect missing acceptance criteria', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test', 'Build amazing feature X', '', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      const checks = detector.detectDrift('proj_1');

      const incompleteCriteria = checks.find(c => c.checkType === 'incomplete_criteria');
      expect(incompleteCriteria).toBeDefined();
      expect(incompleteCriteria?.severity).toBe('critical');
    });

    it('should detect abandoned tasks', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test', 'Build amazing feature X', 'Works', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at)
        VALUES ('task_1', 'proj_1', 'Abandoned Task', 'Details', 'in_progress', 1, ?, ?)`
        )
        .run(twoDaysAgo, twoDaysAgo);

      const checks = detector.detectDrift('proj_1');

      const abandonedTask = checks.find(c => c.checkType === 'abandoned_task');
      expect(abandonedTask).toBeDefined();
      expect(abandonedTask?.description).toContain('Abandoned Task');
    });

    it('should detect unresolved blockers in done projects', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test', 'Build amazing feature X', 'Works', 'done', '2024-01-01', '2024-01-01')`
        )
        .run();

      testDb
        .prepare(
          `INSERT INTO memory_entries (id, project_id, kind, content, is_resolved, created_at)
        VALUES ('mem_1', 'proj_1', 'blocker', 'Cannot deploy', 0, '2024-01-01')`
        )
        .run();

      const checks = detector.detectDrift('proj_1');

      const unresolvedBlocker = checks.find(c => c.checkType === 'unresolved_blocker');
      expect(unresolvedBlocker).toBeDefined();
      expect(unresolvedBlocker?.severity).toBe('critical');
    });

    it('should persist drift checks', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test', 'Build', 'Criteria', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      detector.detectDrift('proj_1');

      const saved = testDb
        .prepare('SELECT * FROM drift_checks WHERE project_id = ?')
        .all('proj_1');
      expect(saved.length).toBeGreaterThan(0);
    });
  });

  describe('resolveDriftCheck', () => {
    it('should mark drift check as resolved', () => {
      testDb
        .prepare(
          `INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test', 'Build', 'Criteria', 'in_progress', '2024-01-01', '2024-01-01')`
        )
        .run();

      const checks = detector.detectDrift('proj_1');
      const checkId = checks[0].id;

      detector.resolveDriftCheck(checkId);

      const resolved = testDb
        .prepare('SELECT resolved FROM drift_checks WHERE id = ?')
        .get(checkId) as Record<string, unknown> | undefined;
      expect(resolved!.resolved).toBe(1);
    });
  });

  describe('getDriftChecks', () => {
    it('should return unresolved checks by default', () => {
      testDb
        .prepare(
          `INSERT INTO drift_checks (id, project_id, check_type, severity, description, detected_at, resolved)
        VALUES ('check_1', 'proj_1', 'scope_drift', 'high', 'Too many tasks', '2024-01-01', 0),
               ('check_2', 'proj_1', 'goal_mismatch', 'critical', 'Vague objective', '2024-01-01', 1)`
        )
        .run();

      const checks = detector.getDriftChecks('proj_1', false);

      expect(checks).toHaveLength(1);
      expect(checks[0].id).toBe('check_1');
    });

    it('should return all checks when includeResolved is true', () => {
      testDb
        .prepare(
          `INSERT INTO drift_checks (id, project_id, check_type, severity, description, detected_at, resolved)
        VALUES ('check_1', 'proj_1', 'scope_drift', 'high', 'Too many tasks', '2024-01-01', 0),
               ('check_2', 'proj_1', 'goal_mismatch', 'critical', 'Vague objective', '2024-01-01', 1)`
        )
        .run();

      const checks = detector.getDriftChecks('proj_1', true);

      expect(checks).toHaveLength(2);
    });
  });
});
