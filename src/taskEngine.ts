import { db } from './lib/db.js';
import { newId } from './lib/id.js';
import type { MemoryKind, Project, ProjectStatus, Task, TaskStatus } from './types.js';

function now(): string {
  return new Date().toISOString();
}

export class TaskEngine {
  createProject(title: string, objective: string, acceptanceCriteria: string): Project {
    const item: Project = {
      id: newId('proj'),
      title,
      objective,
      acceptanceCriteria,
      status: 'planned',
      createdAt: now(),
      updatedAt: now()
    };

    db.prepare(`
      INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
      VALUES (@id, @title, @objective, @acceptanceCriteria, @status, @createdAt, @updatedAt)
    `).run(item);

    return item;
  }

  generateWorkBreakdown(projectId: string): Task[] {
    const tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
      { projectId, title: 'Clarify target outcome', details: 'Define the exact expected output and constraints.', status: 'todo', priority: 1 },
      { projectId, title: 'Break task into executable steps', details: 'Create atomic, trackable subtasks.', status: 'todo', priority: 2 },
      { projectId, title: 'Execute and capture evidence', details: 'Do the work and save proof.', status: 'todo', priority: 3 },
      { projectId, title: 'Run completion audit', details: 'Verify all acceptance criteria are satisfied.', status: 'todo', priority: 4 }
    ];

    return tasks.map(t => this.createTask(projectId, t.title, t.details, t.priority));
  }

  createTask(projectId: string, title: string, details: string, priority = 100): Task {
    const item: Task = {
      id: newId('task'),
      projectId,
      title,
      details,
      status: 'todo',
      priority,
      createdAt: now(),
      updatedAt: now()
    };

    db.prepare(`
      INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at)
      VALUES (@id, @projectId, @title, @details, @status, @priority, @createdAt, @updatedAt)
    `).run(item);

    return item;
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    db.prepare(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`).run(status, now(), taskId);
  }

  updateProjectStatus(projectId: string, status: ProjectStatus): void {
    db.prepare(`UPDATE projects SET status = ?, updated_at = ? WHERE id = ?`).run(status, now(), projectId);
  }

  logMemory(projectId: string, kind: MemoryKind, content: string): string {
    const id = newId('mem');
    db.prepare(`
      INSERT INTO memory_entries (id, project_id, kind, content, is_resolved, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, projectId, kind, content, now());
    return id;
  }

  resolveMemory(memoryId: string): void {
    db.prepare(`UPDATE memory_entries SET is_resolved = 1 WHERE id = ?`).run(memoryId);
  }

  logEvidence(projectId: string, title: string, content: string): string {
    const id = newId('ev');
    db.prepare(`
      INSERT INTO evidence_entries (id, project_id, title, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, projectId, title, content, now());
    return id;
  }

  getProject(projectId: string): Project | undefined {
    const row = db.prepare(`SELECT id, title, objective, acceptance_criteria, status, created_at, updated_at FROM projects WHERE id = ?`).get(projectId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      objective: row.objective,
      acceptanceCriteria: row.acceptance_criteria,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  listTasks(projectId: string): Task[] {
    return db.prepare(`SELECT id, project_id, title, details, status, priority, created_at, updated_at FROM tasks WHERE project_id = ? ORDER BY priority, created_at`).all(projectId).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      details: row.details,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  listMemory(projectId: string): any[] {
    return db.prepare(`SELECT * FROM memory_entries WHERE project_id = ? ORDER BY created_at`).all(projectId);
  }

  listEvidence(projectId: string): any[] {
    return db.prepare(`SELECT * FROM evidence_entries WHERE project_id = ? ORDER BY created_at`).all(projectId);
  }

  runCompletionAudit(projectId: string) {
    const project = this.getProject(projectId);
    if (!project) {
      return { pass: false, score: 0, reasons: ['Project not found'] };
    }

    const tasks = this.listTasks(projectId);
    const memory = this.listMemory(projectId);
    const evidence = this.listEvidence(projectId);

    const reasons: string[] = [];
    const openTasks = tasks.filter(t => t.status !== 'done');
    const unresolvedBlockers = memory.filter(m => m.kind === 'blocker' && m.is_resolved === 0);

    if (!project.acceptanceCriteria.trim()) reasons.push('Missing acceptance criteria');
    if (openTasks.length > 0) reasons.push(`Open tasks remain: ${openTasks.length}`);
    if (unresolvedBlockers.length > 0) reasons.push(`Unresolved blockers remain: ${unresolvedBlockers.length}`);
    if (evidence.length === 0) reasons.push('No evidence logged');

    const score = Math.max(0, 100 - reasons.length * 25);
    return { pass: reasons.length === 0, score, reasons };
  }

  suggestNextBestAction(projectId: string): string {
    const blockers = this.listMemory(projectId).filter(m => m.kind === 'blocker' && m.is_resolved === 0);
    if (blockers.length > 0) {
      return `Resolve blocker: ${blockers[0].content}`;
    }

    const nextTask = this.listTasks(projectId).find(t => t.status !== 'done');
    if (nextTask) {
      return `Work next on task: ${nextTask.title}`;
    }

    return 'Run completion audit and close project if verified.';
  }

  closeProjectIfVerified(projectId: string) {
    const audit = this.runCompletionAudit(projectId);
    if (!audit.pass) {
      return { closed: false, ...audit };
    }
    this.updateProjectStatus(projectId, 'done');
    return { closed: true, ...audit };
  }

  listProjects(): Project[] {
    return db.prepare(`SELECT id, title, objective, acceptance_criteria, status, created_at, updated_at FROM projects ORDER BY created_at DESC`).all().map((row: any) => ({
      id: row.id,
      title: row.title,
      objective: row.objective,
      acceptanceCriteria: row.acceptance_criteria,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}
