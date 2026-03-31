export type ProjectStatus = 'planned' | 'in_progress' | 'blocked' | 'needs_review' | 'done';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type MemoryKind = 'decision' | 'assumption' | 'blocker' | 'note';

export interface Project {
  id: string;
  title: string;
  objective: string;
  acceptanceCriteria: string;
  status: ProjectStatus;
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
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntry {
  id: string;
  projectId: string;
  kind: MemoryKind;
  content: string;
  isResolved: number;
  createdAt: string;
}

export interface EvidenceEntry {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
}
