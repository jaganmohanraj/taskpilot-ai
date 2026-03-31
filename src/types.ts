export type ProjectStatus = 'draft' | 'planned' | 'in_progress' | 'blocked' | 'awaiting_verification' | 'verified' | 'done' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type MemoryKind = 'decision' | 'assumption' | 'blocker' | 'note';
export type DriftCheckType = 'scope_drift' | 'goal_mismatch' | 'incomplete_criteria' | 'abandoned_task' | 'unresolved_blocker';
export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: string;
  title: string;
  objective: string;
  acceptanceCriteria: string;
  status: ProjectStatus;
  healthScore?: number;
  completenessScore?: number;
  driftScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  details: string;
  status: TaskStatus;
  priority: number;
  dependsOn?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface MemoryEntry {
  id: string;
  projectId: string;
  kind: MemoryKind;
  content: string;
  isResolved: number;
  resolvedAt?: string;
  createdAt: string;
}

export interface EvidenceEntry {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface StateHistoryEntry {
  id: string;
  entityType: 'project' | 'task';
  entityId: string;
  oldStatus?: string;
  newStatus: string;
  reason?: string;
  changedAt: string;
}

export interface AuditTrailEntry {
  id: string;
  projectId: string;
  auditType: string;
  pass: number;
  score: number;
  reasons?: string;
  executedAt: string;
}

export interface DriftCheck {
  id: string;
  projectId: string;
  checkType: DriftCheckType;
  severity: DriftSeverity;
  description: string;
  detectedAt: string;
  resolved: number;
}

export interface ProjectMetric {
  id: string;
  projectId: string;
  metricName: string;
  metricValue: number;
  recordedAt: string;
}

export interface AuditResult {
  pass: boolean;
  score: number;
  reasons: string[];
  driftChecks?: DriftCheck[];
  completenessBreakdown?: {
    taskCompletion: number;
    evidenceProvided: boolean;
    blockersResolved: boolean;
    criteriaSet: boolean;
  };
}

export interface NextAction {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  taskId?: string;
  memoryId?: string;
}
