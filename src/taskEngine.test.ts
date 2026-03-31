import { describe, it, expect, beforeEach } from '@jest/globals';
import { TaskEngine } from './taskEngine.js';
import { initDb, db } from './lib/db.js';

describe('TaskEngine', () => {
  let engine: TaskEngine;

  beforeEach(() => {
    initDb();
    db.exec('DELETE FROM projects');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM memory_entries');
    db.exec('DELETE FROM evidence_entries');
    db.exec('DELETE FROM state_history');

    engine = new TaskEngine();
  });

  describe('createProject', () => {
    it('should create project with correct initial state', () => {
      const project = engine.createProject('Test Project', 'Build something', 'Criteria 1');
      expect(project.id).toBeDefined();
      expect(project.title).toBe('Test Project');
      expect(project.status).toBe('draft');
      expect(project.healthScore).toBe(50);
      expect(project.completenessScore).toBe(0);
    });

    it('should record state change on creation', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const timeline = engine.getProjectTimeline(project.id);
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0].newStatus).toBe('draft');
    });
  });

  describe('generateWorkBreakdown', () => {
    it('should generate tasks from acceptance criteria', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria 1\nCriteria 2\nCriteria 3');
      const tasks = engine.generateWorkBreakdown(project.id);
      expect(tasks.length).toBeGreaterThan(3); // At least criteria + clarification + audit
    });

    it('should update project status to planned', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      engine.generateWorkBreakdown(project.id);
      const updated = engine.getProject(project.id);
      expect(updated!.status).toBe('planned');
    });

    it('should create standard workflow tasks when no criteria', () => {
      const project = engine.createProject('Test', 'Objective', '');
      const tasks = engine.generateWorkBreakdown(project.id);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.some(t => t.title.includes('acceptance criteria'))).toBe(true);
    });
  });

  describe('task management', () => {
    it('should create task with dependencies', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task1 = engine.createTask(project.id, 'Task 1', 'Details', 100);
      const task2 = engine.createTask(project.id, 'Task 2', 'Details', 200, task1.id);
      expect(task2.dependsOn).toBe(task1.id);
    });

    it('should update task status and record state change', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task = engine.createTask(project.id, 'Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'in_progress', 'Starting work');

      const updated = engine.getTask(task.id);
      expect(updated!.status).toBe('in_progress');

      const timeline = engine.getProjectTimeline(project.id);
      expect(timeline.some(e => e.entityId === task.id && e.newStatus === 'in_progress')).toBe(true);
    });

    it('should set completedAt when task marked done', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task = engine.createTask(project.id, 'Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'in_progress');
      engine.updateTaskStatus(task.id, 'done');

      const updated = engine.getTask(task.id);
      expect(updated!.completedAt).toBeDefined();
    });

    it('should update project health after task changes', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const initialHealth = project.healthScore || 0;

      const task = engine.createTask(project.id, 'Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'in_progress');
      engine.updateTaskStatus(task.id, 'done');

      const updated = engine.getProject(project.id);
      expect(updated!.healthScore || 0).not.toBe(initialHealth);
    });
  });

  describe('memory management', () => {
    it('should log memory entries', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const id = engine.logMemory(project.id, 'decision', 'Use PostgreSQL');
      expect(id).toBeDefined();

      const memory = engine.listMemory(project.id);
      expect(memory.length).toBe(1);
      expect(memory[0].kind).toBe('decision');
    });

    it('should resolve memory entries', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const id = engine.logMemory(project.id, 'assumption', 'User has email');
      engine.resolveMemory(id, 'Verified');

      const memory = engine.listMemory(project.id);
      expect(memory[0].is_resolved).toBe(1);
      expect(memory[0].resolved_at).toBeDefined();
    });
  });

  describe('evidence management', () => {
    it('should log evidence', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const id = engine.logEvidence(project.id, 'Test Passed', 'All 10 tests passed');
      expect(id).toBeDefined();

      const evidence = engine.listEvidence(project.id);
      expect(evidence.length).toBe(1);
      expect(evidence[0].title).toBe('Test Passed');
    });

    it('should update project health when evidence logged', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const initialHealth = project.healthScore || 0;

      engine.logEvidence(project.id, 'Proof', 'Screenshot');

      const updated = engine.getProject(project.id);
      expect(updated!.healthScore || 0).toBeGreaterThan(initialHealth);
    });
  });

  describe('suggestNextBestAction', () => {
    it('should prioritize blockers', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      engine.createTask(project.id, 'Task', 'Details', 100);
      engine.logMemory(project.id, 'blocker', 'API is down');

      const action = engine.suggestNextBestAction(project.id);
      expect(action.priority).toBe('critical');
      expect(action.action).toContain('Resolve blocker');
    });

    it('should respect task dependencies', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task1 = engine.createTask(project.id, 'Task 1', 'Details', 100);
      const task2 = engine.createTask(project.id, 'Task 2', 'Details', 200, task1.id);

      const action = engine.suggestNextBestAction(project.id);
      expect(action.taskId).toBe(task1.id);
    });

    it('should suggest closure when complete', () => {
      const project = engine.createProject('Test', 'Objective', 'User can login\nAll tests pass\nCode is deployed');
      const tasks = engine.generateWorkBreakdown(project.id);
      // Mark all tasks as done
      tasks.forEach(task => {
        engine.updateTaskStatus(task.id, 'in_progress');
        engine.updateTaskStatus(task.id, 'done');
      });
      engine.logEvidence(project.id, 'Test Results Proof', 'All 25 integration tests passed successfully with 100% code coverage. Screenshot attached showing green checkmarks across all test suites.');

      const action = engine.suggestNextBestAction(project.id);
      expect(action.action).toContain('Close project');
    });
  });

  describe('closeProjectIfVerified', () => {
    it('should close project when audit passes', () => {
      const project = engine.createProject('Test', 'Objective', 'User can login\nAll tests pass\nCode is deployed');
      const tasks = engine.generateWorkBreakdown(project.id);
      // Mark all tasks as done
      tasks.forEach(task => {
        engine.updateTaskStatus(task.id, 'in_progress');
        engine.updateTaskStatus(task.id, 'done');
      });
      engine.logEvidence(project.id, 'Deployment Proof', 'Successfully deployed to production with commit SHA abc123. All 50 integration tests passed. Monitoring dashboard shows 99.9% uptime over 24 hours.');

      const result = engine.closeProjectIfVerified(project.id);
      expect(result.closed).toBe(true);

      const updated = engine.getProject(project.id);
      expect(updated!.status).toBe('done');
    });

    it('should not close project when audit fails', () => {
      const project = engine.createProject('Test', 'Objective', '');
      const result = engine.closeProjectIfVerified(project.id);
      expect(result.closed).toBe(false);

      const updated = engine.getProject(project.id);
      expect(updated!.status).not.toBe('done');
    });
  });
});
