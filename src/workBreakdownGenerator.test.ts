import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkBreakdownGenerator } from './workBreakdownGenerator.js';
import { TaskEngine } from './taskEngine.js';
import { initDb, db } from './lib/db.js';

describe('WorkBreakdownGenerator', () => {
  let generator: WorkBreakdownGenerator;
  let engine: TaskEngine;

  beforeEach(() => {
    initDb();
    db.exec('DELETE FROM projects');
    db.exec('DELETE FROM tasks');

    generator = new WorkBreakdownGenerator();
    engine = new TaskEngine();
  });

  describe('generateBreakdown', () => {
    it('should generate tasks with goal clarification first', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria 1\nCriteria 2');
      const tasks = generator.generateBreakdown(project);

      expect(tasks[0].title).toContain('Clarify and validate');
      expect(tasks[0].priority).toBe(1);
    });

    it('should generate tasks from acceptance criteria', () => {
      const project = engine.createProject('Test', 'Build feature', 'Implement login\nAdd tests\nDeploy');
      const tasks = generator.generateBreakdown(project);

      const criterionTasks = tasks.filter(t => t.title.startsWith('Implement:'));
      expect(criterionTasks.length).toBeGreaterThan(0);
    });

    it('should truncate long criteria in task titles', () => {
      const longCriterion = 'This is a very long acceptance criterion that should be truncated in the task title because it exceeds fifty characters';
      const project = engine.createProject('Test', 'Build feature', longCriterion);
      const tasks = generator.generateBreakdown(project);

      const criterionTask = tasks.find(t => t.title.startsWith('Implement:'));
      expect(criterionTask).toBeDefined();
      expect(criterionTask!.title.length).toBeLessThan(longCriterion.length + 15);
      expect(criterionTask!.title).toContain('...');
    });

    it('should not truncate short criteria', () => {
      const project = engine.createProject('Test', 'Build feature', 'Short criterion');
      const tasks = generator.generateBreakdown(project);

      const criterionTask = tasks.find(t => t.title.startsWith('Implement:'));
      expect(criterionTask!.title).not.toContain('...');
    });

    it('should assign incremental priorities to criteria tasks', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criterion 1\nCriterion 2\nCriterion 3');
      const tasks = generator.generateBreakdown(project);

      const criterionTasks = tasks.filter(t => t.title.startsWith('Implement:'));
      expect(criterionTasks[0].priority).toBe(10);
      expect(criterionTasks[1].priority).toBe(20);
      expect(criterionTasks[2].priority).toBe(30);
    });

    it('should include full criterion in task details', () => {
      const criterion = 'User must be able to login with email and password';
      const project = engine.createProject('Test', 'Build feature', criterion);
      const tasks = generator.generateBreakdown(project);

      const criterionTask = tasks.find(t => t.title.startsWith('Implement:'));
      expect(criterionTask!.details).toContain(criterion);
    });

    it('should generate standard workflow when no criteria provided', () => {
      const project = engine.createProject('Test', 'Build feature', '');
      const tasks = generator.generateBreakdown(project);

      expect(tasks.some(t => t.title.includes('Define acceptance criteria'))).toBe(true);
      expect(tasks.some(t => t.title.includes('Design solution'))).toBe(true);
      expect(tasks.some(t => t.title.includes('Implement core'))).toBe(true);
      expect(tasks.some(t => t.title.includes('Test and validate'))).toBe(true);
    });

    it('should have correct priorities for standard workflow', () => {
      const project = engine.createProject('Test', 'Build feature', '');
      const tasks = generator.generateBreakdown(project);

      const defineTask = tasks.find(t => t.title.includes('Define acceptance criteria'));
      const designTask = tasks.find(t => t.title.includes('Design solution'));
      const implementTask = tasks.find(t => t.title.includes('Implement core'));
      const testTask = tasks.find(t => t.title.includes('Test and validate'));

      expect(defineTask!.priority).toBe(5);
      expect(designTask!.priority).toBe(20);
      expect(implementTask!.priority).toBe(30);
      expect(testTask!.priority).toBe(40);
    });

    it('should always end with evidence collection', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria');
      const tasks = generator.generateBreakdown(project);

      const evidenceTask = tasks.find(t => t.title.includes('Collect completion evidence'));
      expect(evidenceTask).toBeDefined();
      expect(evidenceTask!.priority).toBe(900);
    });

    it('should always end with completion audit', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria');
      const tasks = generator.generateBreakdown(project);

      const auditTask = tasks.find(t => t.title.includes('Run completion audit'));
      expect(auditTask).toBeDefined();
      expect(auditTask!.priority).toBe(1000);
    });

    it('should set all tasks to todo status', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria 1\nCriteria 2');
      const tasks = generator.generateBreakdown(project);

      expect(tasks.every(t => t.status === 'todo')).toBe(true);
    });

    it('should set correct project ID for all tasks', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria 1\nCriteria 2');
      const tasks = generator.generateBreakdown(project);

      expect(tasks.every(t => t.projectId === project.id)).toBe(true);
    });

    it('should filter out empty lines from criteria', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criterion 1\n\n\nCriterion 2\n\n');
      const tasks = generator.generateBreakdown(project);

      const criterionTasks = tasks.filter(t => t.title.startsWith('Implement:'));
      expect(criterionTasks).toHaveLength(2);
    });
  });

  describe('suggestNextTasks', () => {
    it('should suggest tasks to unblock blocked tasks', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria');
      const task1 = engine.createTask(project.id, 'Task 1', 'Details', 100);
      const task2 = engine.createTask(project.id, 'Task 2', 'Details', 200);

      engine.updateTaskStatus(task1.id, 'blocked', 'API unavailable');
      engine.updateTaskStatus(task2.id, 'blocked', 'Dependencies missing');

      const suggestions = generator.suggestNextTasks(project, engine.listTasks(project.id));

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].title).toContain('Unblock');
      expect(suggestions[0].title).toContain('Task 1');
      expect(suggestions[1].title).toContain('Unblock');
      expect(suggestions[1].title).toContain('Task 2');
    });

    it('should set priority 50 for unblock tasks', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria');
      const task = engine.createTask(project.id, 'Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'blocked', 'Issue');

      const suggestions = generator.suggestNextTasks(project, engine.listTasks(project.id));

      expect(suggestions[0].priority).toBe(50);
    });

    it('should include task details in unblock suggestion', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria');
      const task = engine.createTask(project.id, 'Blocked Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'blocked', 'Issue');

      const suggestions = generator.suggestNextTasks(project, engine.listTasks(project.id));

      expect(suggestions[0].details).toContain('Blocked Task');
    });

    it('should return empty array when no blocked tasks', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria');
      engine.createTask(project.id, 'Task 1', 'Details', 100);
      engine.createTask(project.id, 'Task 2', 'Details', 200);

      const suggestions = generator.suggestNextTasks(project, engine.listTasks(project.id));

      expect(suggestions).toHaveLength(0);
    });

    it('should set correct project ID for suggestions', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria');
      const task = engine.createTask(project.id, 'Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'blocked', 'Issue');

      const suggestions = generator.suggestNextTasks(project, engine.listTasks(project.id));

      expect(suggestions[0].projectId).toBe(project.id);
    });

    it('should set todo status for suggestions', () => {
      const project = engine.createProject('Test', 'Build feature', 'Criteria');
      const task = engine.createTask(project.id, 'Task', 'Details', 100);
      engine.updateTaskStatus(task.id, 'blocked', 'Issue');

      const suggestions = generator.suggestNextTasks(project, engine.listTasks(project.id));

      expect(suggestions[0].status).toBe('todo');
    });
  });
});
