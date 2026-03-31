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

import { TaskEngine } from '../src/taskEngine.js';

describe('TaskEngine', () => {
  let engine: TaskEngine;

  beforeEach(() => {
    testDb = createTestDb();
    engine = new TaskEngine();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('createProject', () => {
    it('should create a new project with correct initial state', () => {
      const project = engine.createProject(
        'Test Project',
        'Build amazing feature X',
        'Feature works as expected'
      );

      expect(project.id).toMatch(/^proj_/);
      expect(project.title).toBe('Test Project');
      expect(project.objective).toBe('Build amazing feature X');
      expect(project.acceptanceCriteria).toBe('Feature works as expected');
      expect(project.status).toBe('draft');
      expect(project.healthScore).toBe(50);
      expect(project.completenessScore).toBe(0);
    });

    it('should persist project to database', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');

      const saved = testDb.prepare('SELECT * FROM projects WHERE id = ?').get(project.id) as
        | Record<string, unknown>
        | undefined;
      expect(saved).toBeDefined();
      expect(saved!.title).toBe('Test');
    });

    it('should record state history', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');

      const history = testDb
        .prepare('SELECT * FROM state_history WHERE entity_id = ?')
        .all(project.id) as Array<Record<string, unknown>>;
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].new_status).toBe('draft');
    });
  });

  describe('createTask', () => {
    it('should create task with correct properties', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      const task = engine.createTask(project.id, 'Task 1', 'Details', 100);

      expect(task.id).toMatch(/^task_/);
      expect(task.projectId).toBe(project.id);
      expect(task.title).toBe('Task 1');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe(100);
    });

    it('should support task dependencies', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      const task1 = engine.createTask(project.id, 'Task 1', 'Details', 100);
      const task2 = engine.createTask(project.id, 'Task 2', 'Details', 200, task1.id);

      expect(task2.dependsOn).toBe(task1.id);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      const task = engine.createTask(project.id, 'Task 1', 'Details', 100);

      engine.updateTaskStatus(task.id, 'in_progress');

      const updated = engine.getTask(task.id);
      expect(updated?.status).toBe('in_progress');
    });

    it('should set completedAt when status is done', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      const task = engine.createTask(project.id, 'Task 1', 'Details', 100);

      engine.updateTaskStatus(task.id, 'done');

      const updated = engine.getTask(task.id);
      expect(updated?.completedAt).toBeDefined();
    });

    it('should record state change', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      const task = engine.createTask(project.id, 'Task 1', 'Details', 100);

      engine.updateTaskStatus(task.id, 'in_progress', 'Starting work');

      const history = testDb
        .prepare('SELECT * FROM state_history WHERE entity_id = ?')
        .all(task.id) as Array<Record<string, unknown>>;
      const statusChange = history.find(h => h.new_status === 'in_progress');
      expect(statusChange).toBeDefined();
      expect(statusChange!.reason).toBe('Starting work');
    });

    it('should update project health', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      const task = engine.createTask(project.id, 'Task 1', 'Details', 100);

      const initialHealth = engine.getProject(project.id)?.healthScore;

      engine.updateTaskStatus(task.id, 'done');

      const updatedHealth = engine.getProject(project.id)?.healthScore;
      expect(updatedHealth).not.toBe(initialHealth);
    });
  });

  describe('logMemory', () => {
    it('should log different memory types', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');

      const decisionId = engine.logMemory(project.id, 'decision', 'Use React for UI');
      const assumptionId = engine.logMemory(project.id, 'assumption', 'API is stable');
      const blockerId = engine.logMemory(project.id, 'blocker', 'Missing credentials');

      expect(decisionId).toMatch(/^mem_/);
      expect(assumptionId).toMatch(/^mem_/);
      expect(blockerId).toMatch(/^mem_/);

      const memory = engine.listMemory(project.id);
      expect(memory).toHaveLength(3);
    });
  });

  describe('suggestNextBestAction', () => {
    it('should prioritize unresolved blockers', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      engine.logMemory(project.id, 'blocker', 'Cannot access API');

      const action = engine.suggestNextBestAction(project.id);

      expect(action.priority).toBe('critical');
      expect(action.action).toContain('blocker');
    });

    it('should suggest available tasks when no blockers', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      engine.createTask(project.id, 'Task 1', 'Details', 100);

      const action = engine.suggestNextBestAction(project.id);

      expect(action.priority).toBe('high');
      expect(action.action).toContain('Task 1');
    });

    it('should respect task dependencies', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      const task1 = engine.createTask(project.id, 'Task 1', 'Details', 100);
      engine.createTask(project.id, 'Task 2', 'Details', 200, task1.id);

      const action = engine.suggestNextBestAction(project.id);

      // Should suggest task1, not task2 (which depends on task1)
      expect(action.taskId).toBe(task1.id);
    });
  });

  describe('closeProjectIfVerified', () => {
    it('should close project when audit passes', () => {
      const project = engine.createProject(
        'Test',
        'Implement the core deliverable fully',
        'Criteria'
      );
      const task = engine.createTask(project.id, 'Task 1', 'Details', 100);
      engine.updateTaskStatus(task.id, 'done');
      engine.logEvidence(project.id, 'Proof', 'Screenshot attached');

      const result = engine.closeProjectIfVerified(project.id);

      expect(result.closed).toBe(true);
      expect(result.pass).toBe(true);

      const updated = engine.getProject(project.id);
      expect(updated?.status).toBe('done');
    });

    it('should not close project when audit fails', () => {
      const project = engine.createProject(
        'Test',
        'Implement the core deliverable fully',
        'Criteria'
      );
      engine.createTask(project.id, 'Task 1', 'Details', 100); // Not done

      const result = engine.closeProjectIfVerified(project.id);

      expect(result.closed).toBe(false);

      const updated = engine.getProject(project.id);
      expect(updated?.status).not.toBe('done');
    });
  });

  describe('generateWorkBreakdown', () => {
    it('should generate tasks from acceptance criteria', () => {
      const project = engine.createProject(
        'Test',
        'Build the core objective now',
        'Feature A works\nFeature B works\nFeature C works'
      );

      const tasks = engine.generateWorkBreakdown(project.id);

      expect(tasks.length).toBeGreaterThan(3);
      expect(tasks.some(t => t.title.includes('Feature A'))).toBe(true);
    });

    it('should update project status to planned', () => {
      const project = engine.createProject('Test', 'Build the core objective now', 'Criteria');
      expect(project.status).toBe('draft');

      engine.generateWorkBreakdown(project.id);

      const updated = engine.getProject(project.id);
      expect(updated?.status).toBe('planned');
    });
  });
});
