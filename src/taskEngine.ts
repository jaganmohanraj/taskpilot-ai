import { db } from './lib/db.js';
import { newId } from './lib/id.js';
import type { MemoryKind, NextAction, Project, ProjectStatus, Task, TaskStatus } from './types.js';
import { Verifier } from './verifier.js';
import { DriftDetector } from './driftDetector.js';
import { StateTracker } from './stateTracker.js';
import { WorkBreakdownGenerator } from './workBreakdownGenerator.js';
import {
  validateEvidence,
  parseAcceptanceCriteria,
  validateProjectTransition,
  validateTaskTransition,
} from './validators.js';

function now(): string {
  return new Date().toISOString();
}

export class TaskEngine {
  private verifier = new Verifier();
  private driftDetector = new DriftDetector();
  private stateTracker = new StateTracker();
  private workBreakdownGenerator = new WorkBreakdownGenerator();

  createProject(title: string, objective: string, acceptanceCriteria: string): Project {
    const item: Project = {
      id: newId('proj'),
      title,
      objective,
      acceptanceCriteria,
      status: 'draft',
      healthScore: 50,
      completenessScore: 0,
      driftScore: 0,
      createdAt: now(),
      updatedAt: now(),
    };

    db.prepare(`
      INSERT INTO projects (id, title, objective, acceptance_criteria, status, health_score, completeness_score, drift_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(item.id, item.title, item.objective, item.acceptanceCriteria, item.status, item.healthScore, item.completenessScore, item.driftScore, item.createdAt, item.updatedAt);

    // Record state
    this.stateTracker.recordStateChange('project', item.id, undefined, item.status, 'Project created');

    return item;
  }

  generateWorkBreakdown(projectId: string): Task[] {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const breakdown = this.workBreakdownGenerator.generateBreakdown(project);
    const tasks = breakdown.map(t => this.createTask(projectId, t.title, t.details, t.priority));

    // Update project status to planned
    if (project.status === 'draft') {
      this.updateProjectStatus(projectId, 'planned');
    }

    return tasks;
  }

  createTask(projectId: string, title: string, details: string, priority = 100, dependsOn?: string): Task {
    const item: Task = {
      id: newId('task'),
      projectId,
      title,
      details,
      status: 'todo',
      priority,
      dependsOn,
      createdAt: now(),
      updatedAt: now(),
    };

    db.prepare(`
      INSERT INTO tasks (id, project_id, title, details, status, priority, depends_on, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(item.id, item.projectId, item.title, item.details, item.status, item.priority, item.dependsOn || null, item.createdAt, item.updatedAt);

    // Record state
    this.stateTracker.recordStateChange('task', item.id, undefined, item.status, 'Task created');

    return item;
  }

  updateTaskStatus(taskId: string, status: TaskStatus, reason?: string): void {
    const task = this.getTask(taskId);
    if (!task) throw new Error('Task not found');

    const oldStatus = task.status;

    // Validate state transition
    const transitionValidation = validateTaskTransition(oldStatus, status);
    if (!transitionValidation.valid) {
      throw new Error(`Invalid task state transition: ${transitionValidation.reason}`);
    }

    const completedAt = status === 'done' ? now() : null;

    db.prepare(`UPDATE tasks SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?`).run(status, now(), completedAt, taskId);

    // Record state change
    this.stateTracker.recordStateChange('task', taskId, oldStatus, status, reason);

    // Update project health score
    this.updateProjectHealth(task.projectId);
  }

  updateProjectStatus(projectId: string, status: ProjectStatus, reason?: string): void {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const oldStatus = project.status;

    // Validate state transition
    const transitionValidation = validateProjectTransition(oldStatus, status);
    if (!transitionValidation.valid) {
      throw new Error(`Invalid project state transition: ${transitionValidation.reason}`);
    }

    // ENFORCEMENT: Cannot mark as 'done' without passing audit
    if (status === 'done') {
      const audit = this.verifier.runCompletionAudit(projectId);
      if (!audit.pass) {
        throw new Error(
          `Cannot mark project as done: audit failed with score ${audit.score}/100. ` +
            `Reasons: ${audit.reasons.join(', ')}`
        );
      }
    }

    db.prepare(`UPDATE projects SET status = ?, updated_at = ? WHERE id = ?`).run(status, now(), projectId);

    // Record state change
    this.stateTracker.recordStateChange('project', projectId, oldStatus, status, reason);
  }

  logMemory(projectId: string, kind: MemoryKind, content: string): string {
    const id = newId('mem');
    db.prepare(`
      INSERT INTO memory_entries (id, project_id, kind, content, is_resolved, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, projectId, kind, content, now());
    return id;
  }

  resolveMemory(memoryId: string, reason?: string): void {
    db.prepare(`UPDATE memory_entries SET is_resolved = 1, resolved_at = ? WHERE id = ?`).run(now(), memoryId);

    // Get project ID to update health
    const memory = db.prepare(`SELECT project_id FROM memory_entries WHERE id = ?`).get(memoryId) as any;
    if (memory) {
      this.updateProjectHealth(memory.project_id);
    }
  }

  logEvidence(projectId: string, title: string, content: string): string {
    // Validate evidence quality
    const validation = validateEvidence(title, content);
    if (!validation.valid) {
      console.warn(
        `Evidence quality is low (score: ${validation.score}/100).`,
        `Issues: ${validation.issues.join(', ')}.`,
        `Suggestions: ${validation.suggestions.join(', ')}`
      );
      // Log as note about low-quality evidence
      this.logMemory(
        projectId,
        'note',
        `Low-quality evidence detected: "${title}". Score: ${validation.score}/100. Issues: ${validation.issues.join('; ')}`
      );
    }

    const id = newId('ev');
    db.prepare(`
      INSERT INTO evidence_entries (id, project_id, title, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, projectId, title, content, now());

    // Update project completeness
    this.updateProjectHealth(projectId);

    return id;
  }

  getProject(projectId: string): Project | undefined {
    const row = db.prepare(`
      SELECT id, title, objective, acceptance_criteria, status, health_score, completeness_score, drift_score, created_at, updated_at
      FROM projects WHERE id = ?
    `).get(projectId) as any;

    if (!row) return undefined;

    return {
      id: row.id,
      title: row.title,
      objective: row.objective,
      acceptanceCriteria: row.acceptance_criteria,
      status: row.status,
      healthScore: row.health_score,
      completenessScore: row.completeness_score,
      driftScore: row.drift_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getTask(taskId: string): Task | undefined {
    const row = db.prepare(`
      SELECT id, project_id, title, details, status, priority, depends_on, created_at, updated_at, completed_at
      FROM tasks WHERE id = ?
    `).get(taskId) as any;

    if (!row) return undefined;

    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      details: row.details,
      status: row.status,
      priority: row.priority,
      dependsOn: row.depends_on,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }

  listTasks(projectId: string): Task[] {
    return db.prepare(`
      SELECT id, project_id, title, details, status, priority, depends_on, created_at, updated_at, completed_at
      FROM tasks WHERE project_id = ? ORDER BY priority, created_at
    `).all(projectId).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      details: row.details,
      status: row.status,
      priority: row.priority,
      dependsOn: row.depends_on,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    }));
  }

  listMemory(projectId: string): any[] {
    return db.prepare(`SELECT * FROM memory_entries WHERE project_id = ? ORDER BY created_at`).all(projectId);
  }

  listEvidence(projectId: string): any[] {
    return db.prepare(`SELECT * FROM evidence_entries WHERE project_id = ? ORDER BY created_at`).all(projectId);
  }

  runCompletionAudit(projectId: string) {
    const result = this.verifier.runCompletionAudit(projectId);

    // Update project scores
    db.prepare(`
      UPDATE projects
      SET completeness_score = ?, drift_score = ?, updated_at = ?
      WHERE id = ?
    `).run(result.score, result.driftChecks?.length || 0, now(), projectId);

    return result;
  }

  runDriftDetection(projectId: string) {
    return this.driftDetector.detectDrift(projectId);
  }

  suggestNextBestAction(projectId: string): NextAction {
    // Check for critical blockers first
    const blockers = this.listMemory(projectId).filter(m => m.kind === 'blocker' && m.is_resolved === 0);
    if (blockers.length > 0) {
      return {
        priority: 'critical',
        action: `Resolve blocker: ${blockers[0].content}`,
        reason: 'Unresolved blocker is preventing progress',
        memoryId: blockers[0].id,
      };
    }

    // Check for tasks respecting dependencies
    const tasks = this.listTasks(projectId);
    const todoTasks = tasks.filter(t => t.status === 'todo');

    for (const task of todoTasks) {
      if (task.dependsOn) {
        const dependency = tasks.find(t => t.id === task.dependsOn);
        if (dependency && dependency.status !== 'done') {
          continue; // Skip this task if dependency not done
        }
      }

      return {
        priority: 'high',
        action: `Work on task: ${task.title}`,
        reason: 'Next available task in priority order',
        taskId: task.id,
      };
    }

    // Check if project is complete
    const audit = this.runCompletionAudit(projectId);
    if (audit.pass) {
      return {
        priority: 'medium',
        action: 'Close project',
        reason: 'All completion criteria met',
      };
    }

    return {
      priority: 'low',
      action: 'Review project status and add missing tasks or evidence',
      reason: 'No clear next action',
    };
  }

  closeProjectIfVerified(projectId: string) {
    const audit = this.runCompletionAudit(projectId);
    if (!audit.pass) {
      return { closed: false, ...audit };
    }

    this.updateProjectStatus(projectId, 'done', 'Completion audit passed');
    return { closed: true, ...audit };
  }

  getWhyNotDone(projectId: string): string[] {
    return this.verifier.whyNotDone(projectId);
  }

  getProjectTimeline(projectId: string) {
    return this.stateTracker.getProjectTimeline(projectId);
  }

  getAuditHistory(projectId: string) {
    return this.verifier.getAuditHistory(projectId);
  }

  getDriftChecks(projectId: string) {
    return this.driftDetector.getDriftChecks(projectId);
  }

  resolveDriftCheck(checkId: string): void {
    this.driftDetector.resolveDriftCheck(checkId);
  }

  listProjects(): Project[] {
    return db.prepare(`
      SELECT id, title, objective, acceptance_criteria, status, health_score, completeness_score, drift_score, created_at, updated_at
      FROM projects ORDER BY created_at DESC
    `).all().map((row: any) => ({
      id: row.id,
      title: row.title,
      objective: row.objective,
      acceptanceCriteria: row.acceptance_criteria,
      status: row.status,
      healthScore: row.health_score,
      completenessScore: row.completeness_score,
      driftScore: row.drift_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private updateProjectHealth(projectId: string): void {
    const tasks = this.listTasks(projectId);
    const memory = this.listMemory(projectId);
    const evidence = this.listEvidence(projectId);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

    const unresolvedBlockers = memory.filter(m => m.kind === 'blocker' && m.is_resolved === 0).length;

    let healthScore = 100;

    // Reduce health for incomplete tasks
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks;
      if (completionRate < 0.5) healthScore -= 20;
      else if (completionRate < 0.8) healthScore -= 10;
    }

    // Reduce health for blockers
    healthScore -= unresolvedBlockers * 15;
    healthScore -= blockedTasks * 10;

    // Boost health for evidence
    if (evidence.length > 0) healthScore += 10;

    healthScore = Math.max(0, Math.min(100, healthScore));

    db.prepare(`UPDATE projects SET health_score = ? WHERE id = ?`).run(healthScore, projectId);
  }
}
