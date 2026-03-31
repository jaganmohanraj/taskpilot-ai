import { db } from './lib/db.js';
import { newId } from './lib/id.js';
import type { AuditResult, AuditTrailEntry, Project, Task, MemoryEntry, EvidenceEntry } from './types.js';
import { DriftDetector } from './driftDetector.js';

function now(): string {
  return new Date().toISOString();
}

export class Verifier {
  private driftDetector = new DriftDetector();

  /**
   * Run comprehensive completion audit
   */
  runCompletionAudit(projectId: string): AuditResult {
    const project = this.getProject(projectId);
    if (!project) {
      return {
        pass: false,
        score: 0,
        reasons: ['Project not found'],
      };
    }

    const tasks = this.getTasks(projectId);
    const memory = this.getMemory(projectId);
    const evidence = this.getEvidence(projectId);

    const reasons: string[] = [];
    let score = 100;

    // Check acceptance criteria
    if (!project.acceptanceCriteria || project.acceptanceCriteria.trim().length === 0) {
      reasons.push('Missing acceptance criteria');
      score -= 30;
    }

    // Check tasks
    const openTasks = tasks.filter(t => t.status !== 'done');
    const blockedTasks = tasks.filter(t => t.status === 'blocked');

    if (openTasks.length > 0) {
      reasons.push(`${openTasks.length} open tasks remain`);
      score -= 25;
    }

    if (blockedTasks.length > 0) {
      reasons.push(`${blockedTasks.length} tasks are blocked`);
      score -= 15;
    }

    // Check blockers
    const unresolvedBlockers = memory.filter(m => m.kind === 'blocker' && m.isResolved === 0);
    if (unresolvedBlockers.length > 0) {
      reasons.push(`${unresolvedBlockers.length} unresolved blockers remain`);
      score -= 20;
    }

    // Check evidence
    if (evidence.length === 0) {
      reasons.push('No evidence logged');
      score -= 20;
    }

    // Check unresolved assumptions
    const unresolvedAssumptions = memory.filter(m => m.kind === 'assumption' && m.isResolved === 0);
    if (unresolvedAssumptions.length > 0) {
      reasons.push(`${unresolvedAssumptions.length} unverified assumptions remain`);
      score -= 10;
    }

    // Run drift detection
    const driftChecks = this.driftDetector.detectDrift(projectId);
    const unresolvedDrift = driftChecks.filter(d => d.resolved === 0);

    if (unresolvedDrift.length > 0) {
      const criticalDrift = unresolvedDrift.filter(d => d.severity === 'critical');
      if (criticalDrift.length > 0) {
        reasons.push(`${criticalDrift.length} critical drift issues detected`);
        score -= 30;
      } else {
        reasons.push(`${unresolvedDrift.length} drift issues detected`);
        score -= 10;
      }
    }

    score = Math.max(0, Math.min(100, score));
    const pass = score >= 100 && reasons.length === 0;

    // Calculate completeness breakdown
    const taskCompletion = tasks.length > 0 ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 0;

    const result: AuditResult = {
      pass,
      score,
      reasons,
      driftChecks: unresolvedDrift,
      completenessBreakdown: {
        taskCompletion: Math.round(taskCompletion),
        evidenceProvided: evidence.length > 0,
        blockersResolved: unresolvedBlockers.length === 0,
        criteriaSet: Boolean(project.acceptanceCriteria && project.acceptanceCriteria.trim().length > 0),
      },
    };

    // Save audit trail
    this.saveAuditTrail({
      id: newId('audit'),
      projectId,
      auditType: 'completion',
      pass: pass ? 1 : 0,
      score,
      reasons: JSON.stringify(reasons),
      executedAt: now(),
    });

    return result;
  }

  /**
   * Check if project can be closed
   */
  canClose(projectId: string): { canClose: boolean; reason?: string } {
    const audit = this.runCompletionAudit(projectId);

    if (audit.pass) {
      return { canClose: true };
    }

    const topReason = audit.reasons[0] || 'Unknown issue';
    return { canClose: false, reason: topReason };
  }

  /**
   * Get why not done analysis
   */
  whyNotDone(projectId: string): string[] {
    const audit = this.runCompletionAudit(projectId);
    return audit.reasons;
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

  private getEvidence(projectId: string): EvidenceEntry[] {
    return db.prepare(`
      SELECT id, project_id, title, content, created_at
      FROM evidence_entries WHERE project_id = ? ORDER BY created_at
    `).all(projectId).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  private saveAuditTrail(entry: AuditTrailEntry): void {
    db.prepare(`
      INSERT INTO audit_trail (id, project_id, audit_type, pass, score, reasons, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(entry.id, entry.projectId, entry.auditType, entry.pass, entry.score, entry.reasons, entry.executedAt);
  }

  getAuditHistory(projectId: string): AuditTrailEntry[] {
    return db.prepare(`
      SELECT * FROM audit_trail WHERE project_id = ? ORDER BY executed_at DESC
    `).all(projectId).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      auditType: row.audit_type,
      pass: row.pass,
      score: row.score,
      reasons: row.reasons,
      executedAt: row.executed_at,
    }));
  }
}
