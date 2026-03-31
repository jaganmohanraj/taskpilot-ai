import { describe, it, expect, beforeEach } from '@jest/globals';
import { CompositeOperations } from './compositeOperations.js';
import { TaskEngine } from './taskEngine.js';
import { initDb, db } from './lib/db.js';
import type { BatchTaskCreate, BulkStatusUpdate, ProjectTemplate, CloneOptions } from './compositeOperations.js';

describe('CompositeOperations', () => {
  let composite: CompositeOperations;
  let engine: TaskEngine;

  beforeEach(() => {
    initDb();
    db.exec('DELETE FROM projects');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM memory_entries');
    db.exec('DELETE FROM evidence_entries');
    db.exec('DELETE FROM state_history');

    engine = new TaskEngine();
    composite = new CompositeOperations(engine);
  });

  describe('batchCreateTasks', () => {
    it('should create multiple tasks in a single operation', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const taskData: BatchTaskCreate[] = [
        { title: 'Task 1', details: 'Details 1', priority: 100 },
        { title: 'Task 2', details: 'Details 2', priority: 200 },
        { title: 'Task 3', details: 'Details 3', priority: 300 },
      ];

      const tasks = composite.batchCreateTasks(project.id, taskData);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
      expect(tasks[2].title).toBe('Task 3');
    });

    it('should create tasks with dependencies', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task1 = engine.createTask(project.id, 'Base Task', 'Details', 100);
      const taskData: BatchTaskCreate[] = [
        { title: 'Dependent Task', details: 'Details', priority: 200, dependsOn: task1.id },
      ];

      const tasks = composite.batchCreateTasks(project.id, taskData);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].dependsOn).toBe(task1.id);
    });

    it('should use default priority when not provided', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const taskData: BatchTaskCreate[] = [
        { title: 'Task 1', details: 'Details 1' },
      ];

      const tasks = composite.batchCreateTasks(project.id, taskData);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe(100);
    });
  });

  describe('bulkUpdateTaskStatus', () => {
    it('should update status of multiple tasks successfully', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task1 = engine.createTask(project.id, 'Task 1', 'Details', 100);
      const task2 = engine.createTask(project.id, 'Task 2', 'Details', 200);

      const updates: BulkStatusUpdate = {
        taskIds: [task1.id, task2.id],
        status: 'in_progress',
        reason: 'Starting work on both tasks',
      };

      const result = composite.bulkUpdateTaskStatus(updates);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.success).toContain(task1.id);
      expect(result.success).toContain(task2.id);

      const updatedTask1 = engine.getTask(task1.id);
      const updatedTask2 = engine.getTask(task2.id);
      expect(updatedTask1!.status).toBe('in_progress');
      expect(updatedTask2!.status).toBe('in_progress');
    });

    it('should handle failures gracefully', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task1 = engine.createTask(project.id, 'Task 1', 'Details', 100);

      const updates: BulkStatusUpdate = {
        taskIds: [task1.id, 'nonexistent-id'],
        status: 'in_progress',
      };

      const result = composite.bulkUpdateTaskStatus(updates);

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.success).toContain(task1.id);
      expect(result.failed[0].taskId).toBe('nonexistent-id');
      expect(result.failed[0].error).toBeDefined();
    });

    it('should update tasks without reason', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      const task = engine.createTask(project.id, 'Task', 'Details', 100);

      const updates: BulkStatusUpdate = {
        taskIds: [task.id],
        status: 'done',
      };

      const result = composite.bulkUpdateTaskStatus(updates);

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('cloneProject', () => {
    it('should clone project with all tasks', () => {
      const original = engine.createProject('Original', 'Build feature', 'Criteria 1\nCriteria 2');
      engine.createTask(original.id, 'Task 1', 'Details 1', 100);
      engine.createTask(original.id, 'Task 2', 'Details 2', 200);

      const cloned = composite.cloneProject(original.id);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.title).toBe('Original (Copy)');
      expect(cloned.objective).toBe(original.objective);
      expect(cloned.acceptanceCriteria).toBe(original.acceptanceCriteria);

      const clonedTasks = engine.listTasks(cloned.id);
      expect(clonedTasks).toHaveLength(2);
    });

    it('should clone project with custom title', () => {
      const original = engine.createProject('Original', 'Build feature', 'Criteria');
      const options: CloneOptions = { newTitle: 'Custom Clone' };

      const cloned = composite.cloneProject(original.id, options);

      expect(cloned.title).toBe('Custom Clone');
    });

    it('should throw error when cloning non-existent project', () => {
      expect(() => {
        composite.cloneProject('nonexistent-id');
      }).toThrow('Project not found');
    });

    it('should preserve task dependencies', () => {
      const original = engine.createProject('Original', 'Build feature', 'Criteria');
      const task1 = engine.createTask(original.id, 'Task 1', 'Details', 100);
      const task2 = engine.createTask(original.id, 'Task 2', 'Details', 200, task1.id);

      const cloned = composite.cloneProject(original.id);

      const clonedTasks = engine.listTasks(cloned.id);
      expect(clonedTasks).toHaveLength(2);

      const task2Clone = clonedTasks.find(t => t.title === 'Task 2');
      expect(task2Clone).toBeDefined();
      expect(task2Clone!.dependsOn).toBeDefined();
    });

    it('should clone memory when includeMemory is true', () => {
      const original = engine.createProject('Original', 'Build feature', 'Criteria');
      engine.logMemory(original.id, 'decision', 'Using TypeScript');
      engine.logMemory(original.id, 'insight', 'Performance optimization needed');

      const options: CloneOptions = { includeMemory: true };
      const cloned = composite.cloneProject(original.id, options);

      const clonedMemory = engine.listMemory(cloned.id);
      expect(clonedMemory.length).toBeGreaterThan(0);
    });

    it('should not clone resolved blockers', () => {
      const original = engine.createProject('Original', 'Build feature', 'Criteria');
      const blocker = engine.logMemory(original.id, 'blocker', 'API down');
      engine.resolveMemory(blocker.id);

      const options: CloneOptions = { includeMemory: true };
      const cloned = composite.cloneProject(original.id, options);

      const clonedMemory = engine.listMemory(cloned.id);
      const hasResolvedBlocker = clonedMemory.some(m => m.kind === 'blocker' && m.is_resolved);
      expect(hasResolvedBlocker).toBe(false);
    });

    it('should clone evidence when includeEvidence is true', () => {
      const original = engine.createProject('Original', 'Build feature', 'Criteria');
      engine.logEvidence(original.id, 'Test Results', 'All 50 tests passed with screenshot showing green checkmarks');

      const options: CloneOptions = { includeEvidence: true };
      const cloned = composite.cloneProject(original.id, options);

      const clonedEvidence = engine.listEvidence(cloned.id);
      expect(clonedEvidence).toHaveLength(1);
      expect(clonedEvidence[0].title).toBe('Test Results');
    });

    it('should not clone memory or evidence by default', () => {
      const original = engine.createProject('Original', 'Build feature', 'Criteria');
      engine.logMemory(original.id, 'decision', 'Using TypeScript');
      engine.logEvidence(original.id, 'Test Results', 'All 50 tests passed with screenshot showing green checkmarks');

      const cloned = composite.cloneProject(original.id);

      const clonedMemory = engine.listMemory(cloned.id);
      const clonedEvidence = engine.listEvidence(cloned.id);
      expect(clonedMemory).toHaveLength(0);
      expect(clonedEvidence).toHaveLength(0);
    });
  });

  describe('createFromTemplate', () => {
    it('should create project from template', () => {
      const template: ProjectTemplate = {
        title: 'Template Project',
        objective: 'Build feature from template',
        acceptanceCriteria: 'Feature works\nTests pass',
        tasks: [
          { title: 'Task 1', details: 'Details 1', priority: 100 },
          { title: 'Task 2', details: 'Details 2', priority: 200 },
        ],
      };

      const project = composite.createFromTemplate(template);

      expect(project.title).toBe('Template Project');
      expect(project.objective).toBe('Build feature from template');
      expect(project.acceptanceCriteria).toBe('Feature works\nTests pass');

      const tasks = engine.listTasks(project.id);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    it('should handle empty task list in template', () => {
      const template: ProjectTemplate = {
        title: 'Empty Template',
        objective: 'Test objective',
        acceptanceCriteria: 'Test criteria',
        tasks: [],
      };

      const project = composite.createFromTemplate(template);

      expect(project.title).toBe('Empty Template');
      const tasks = engine.listTasks(project.id);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('bulkArchiveProjects', () => {
    it('should archive multiple completed projects', () => {
      const project1 = engine.createProject('Project 1', 'Objective', 'Criteria');
      const project2 = engine.createProject('Project 2', 'Objective', 'Criteria');

      // Complete the projects first
      engine.updateProjectStatus(project1.id, 'done', 'Completed');
      engine.updateProjectStatus(project2.id, 'done', 'Completed');

      const result = composite.bulkArchiveProjects([project1.id, project2.id]);

      expect(result.archived).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);

      const archivedProject1 = engine.getProject(project1.id);
      const archivedProject2 = engine.getProject(project2.id);
      expect(archivedProject1!.status).toBe('archived');
      expect(archivedProject2!.status).toBe('archived');
    });

    it('should skip non-existent projects', () => {
      const project = engine.createProject('Project', 'Objective', 'Criteria');
      engine.updateProjectStatus(project.id, 'done', 'Completed');

      const result = composite.bulkArchiveProjects([project.id, 'nonexistent-id']);

      expect(result.archived).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].projectId).toBe('nonexistent-id');
      expect(result.skipped[0].reason).toBe('Project not found');
    });

    it('should skip incomplete projects', () => {
      const project = engine.createProject('Project', 'Objective', 'Criteria');
      // Don't complete the project

      const result = composite.bulkArchiveProjects([project.id]);

      expect(result.archived).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Project not completed');
    });

    it('should handle mixed results', () => {
      const completed = engine.createProject('Completed', 'Objective', 'Criteria');
      const incomplete = engine.createProject('Incomplete', 'Objective', 'Criteria');

      engine.updateProjectStatus(completed.id, 'done', 'Completed');

      const result = composite.bulkArchiveProjects([completed.id, incomplete.id, 'nonexistent']);

      expect(result.archived).toHaveLength(1);
      expect(result.skipped).toHaveLength(2);
    });
  });

  describe('getAggregatedStats', () => {
    it('should calculate statistics across multiple projects', () => {
      const project1 = engine.createProject('Project 1', 'Objective', 'Criteria');
      const project2 = engine.createProject('Project 2', 'Objective', 'Criteria');

      engine.createTask(project1.id, 'Task 1', 'Details', 100);
      const task2 = engine.createTask(project1.id, 'Task 2', 'Details', 200);
      engine.updateTaskStatus(task2.id, 'done');

      engine.createTask(project2.id, 'Task 3', 'Details', 100);

      const stats = composite.getAggregatedStats([project1.id, project2.id]);

      expect(stats.totalProjects).toBe(2);
      expect(stats.totalTasks).toBe(3);
      expect(stats.completedTasks).toBe(1);
      expect(stats.averageHealth).toBeGreaterThan(0);
      expect(stats.averageCompleteness).toBeGreaterThan(0);
    });

    it('should handle empty project list', () => {
      const stats = composite.getAggregatedStats([]);

      expect(stats.totalProjects).toBe(0);
      expect(stats.totalTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.averageHealth).toBe(0);
      expect(stats.averageCompleteness).toBe(0);
    });

    it('should skip non-existent projects', () => {
      const project = engine.createProject('Project', 'Objective', 'Criteria');
      engine.createTask(project.id, 'Task', 'Details', 100);

      const stats = composite.getAggregatedStats([project.id, 'nonexistent']);

      expect(stats.totalProjects).toBe(2); // Includes both IDs
      expect(stats.totalTasks).toBe(1); // Only existing project's task
    });

    it('should include status breakdown', () => {
      const project1 = engine.createProject('Project 1', 'Objective', 'Criteria');
      const project2 = engine.createProject('Project 2', 'Objective', 'Criteria');
      const project3 = engine.createProject('Project 3', 'Objective', 'Criteria');

      engine.updateProjectStatus(project2.id, 'done', 'Completed');

      const stats = composite.getAggregatedStats([project1.id, project2.id, project3.id]);

      expect(stats.statusBreakdown).toBeDefined();
      expect(stats.statusBreakdown.draft).toBe(2);
      expect(stats.statusBreakdown.done).toBe(1);
    });
  });
});
