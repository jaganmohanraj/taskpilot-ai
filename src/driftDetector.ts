import { db } from './lib/db.js';
import { newId } from './lib/id.js';
import type { DriftCheck, DriftCheckType, DriftSeverity, Project, Task, MemoryEntry } from './types.js';

function now(): string {
  return new Date().toISOString();
}

export class DriftDetector {
  /**
   * Run comprehensive drift detection on a project
   */
  detectDrift(projectId: string): DriftCheck[] {
    const checks: DriftCheck[] = [];

    // Get project and related data
    const project = this.getProject(projectId);
    if (!project) return checks;

    const tasks = this.getTasks(projectId);
    const memory = this.getMemory(projectId);

    // Check for scope drift
    checks.push(...this.checkScopeDrift(project, tasks));

    // Check for goal mismatch
    checks.push(...this.checkGoalAlignment(project, tasks));

    // Check for incomplete criteria
    checks.push(...this.checkCriteria(project));

    // Check for abandoned tasks
    checks.push(...this.checkAbandonedTasks(project, tasks));

    // Check for unresolved blockers
    checks.push(...this.checkUnresolvedBlockers(project, memory));

    // De-duplicate and persist drift checks
    const seenKeys = new Set<string>();
    const uniqueChecks: DriftCheck[] = [];
    for (const check of checks) {
      const key = `${check.projectId}:${check.checkType}:${check.description}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      uniqueChecks.push(check);
      this.saveDriftCheck(check);
    }

    return uniqueChecks;
  }

  private checkScopeDrift(project: Project, tasks: Task[]): DriftCheck[] {
    const checks: DriftCheck[] = [];

    // Detect if tasks significantly exceed original plan
    const taskCount = tasks.length;
    if (taskCount > 20) {
      checks.push({
        id: newId('drift'),
        projectId: project.id,
        checkType: 'scope_drift',
        severity: 'high',
        description: `Project has ${taskCount} tasks, which may indicate scope creep`,
        detectedAt: now(),
        resolved: 0,
      });
    }

    return checks;
  }

  private checkGoalAlignment(project: Project, tasks: Task[]): DriftCheck[] {
    const checks: DriftCheck[] = [];

    // Check if objective is too vague
    if (project.objective.trim().length < 20) {
      checks.push({
        id: newId('drift'),
        projectId: project.id,
        checkType: 'goal_mismatch',
        severity: 'critical',
        description: 'Project objective is too vague or undefined',
        detectedAt: now(),
        resolved: 0,
      });
    }

    return checks;
  }

  private checkCriteria(project: Project): DriftCheck[] {
    const checks: DriftCheck[] = [];

    if (!project.acceptanceCriteria || project.acceptanceCriteria.trim().length === 0) {
      checks.push({
        id: newId('drift'),
        projectId: project.id,
        checkType: 'incomplete_criteria',
        severity: 'critical',
        description: 'No acceptance criteria defined',
        detectedAt: now(),
        resolved: 0,
      });
    }

    return checks;
  }

  private checkAbandonedTasks(project: Project, tasks: Task[]): DriftCheck[] {
    const checks: DriftCheck[] = [];

    // Check for tasks stuck in in_progress for too long
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const nowTimestamp = Date.now();
    const oneDayAgo = nowTimestamp - 24 * 60 * 60 * 1000;

    for (const task of inProgressTasks) {
      const updatedTime = new Date(task.updatedAt).getTime();
      if (updatedTime < oneDayAgo) {
        checks.push({
          id: newId('drift'),
          projectId: project.id,
          checkType: 'abandoned_task',
          severity: 'medium',
          description: `Task "${task.title}" has been in progress for over 24 hours without updates`,
          detectedAt: now(),
          resolved: 0,
        });
      }
    }

    return checks;
  }

  private checkUnresolvedBlockers(project: Project, memory: MemoryEntry[]): DriftCheck[] {
    const checks: DriftCheck[] = [];

    const unresolvedBlockers = memory.filter(m => m.kind === 'blocker' && m.isResolved === 0);

    if (unresolvedBlockers.length > 0 && project.status === 'done') {
      checks.push({
        id: newId('drift'),
        projectId: project.id,
        checkType: 'unresolved_blocker',
        severity: 'critical',
        description: `Project marked done but has ${unresolvedBlockers.length} unresolved blockers`,
        detectedAt: now(),
        resolved: 0,
      });
    }

    return checks;
  }

  private getProject(projectId: string): Project | undefined {
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

  private getTasks(projectId: string): Task[] {
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

  private getMemory(projectId: string): MemoryEntry[] {
    return db.prepare(`
      SELECT id, project_id, kind, content, is_resolved, resolved_at, created_at
      FROM memory_entries WHERE project_id = ? ORDER BY created_at
    `).all(projectId).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      kind: row.kind,
      content: row.content,
      isResolved: row.is_resolved,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
    }));
  }

  private saveDriftCheck(check: DriftCheck): void {
    db.prepare(`
      INSERT INTO drift_checks (id, project_id, check_type, severity, description, detected_at, resolved)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(check.id, check.projectId, check.checkType, check.severity, check.description, check.detectedAt, check.resolved);
  }

  resolveDriftCheck(checkId: string): void {
    db.prepare(`UPDATE drift_checks SET resolved = 1 WHERE id = ?`).run(checkId);
  }

  getDriftChecks(projectId: string, includeResolved: boolean = false): DriftCheck[] {
    const query = includeResolved
      ? `SELECT * FROM drift_checks WHERE project_id = ? ORDER BY detected_at DESC`
      : `SELECT * FROM drift_checks WHERE project_id = ? AND resolved = 0 ORDER BY detected_at DESC`;

    return db.prepare(query).all(projectId).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      checkType: row.check_type,
      severity: row.severity,
      description: row.description,
      detectedAt: row.detected_at,
      resolved: row.resolved,
    }));
  }
}
