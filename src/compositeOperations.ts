/**
 * Composite Operations
 * Batch and bulk operations for efficient multi-entity management
 */

import { TaskEngine } from './taskEngine.js';
import type { Project, Task, TaskStatus, ProjectStatus } from './types.js';

export interface BatchTaskCreate {
  title: string;
  details: string;
  priority?: number;
  dependsOn?: string;
}

export interface BulkStatusUpdate {
  taskIds: string[];
  status: TaskStatus;
  reason?: string;
}

export interface ProjectTemplate {
  title: string;
  objective: string;
  acceptanceCriteria: string;
  tasks: BatchTaskCreate[];
}

export interface CloneOptions {
  newTitle?: string;
  includeMemory?: boolean;
  includeEvidence?: boolean;
}

export class CompositeOperations {
  constructor(private engine: TaskEngine) {}

  /**
   * Create multiple tasks in a single operation
   */
  batchCreateTasks(projectId: string, tasks: BatchTaskCreate[]): Task[] {
    const createdTasks: Task[] = [];

    for (const taskData of tasks) {
      const task = this.engine.createTask(
        projectId,
        taskData.title,
        taskData.details,
        taskData.priority || 100,
        taskData.dependsOn
      );
      createdTasks.push(task);
    }

    return createdTasks;
  }

  /**
   * Update status of multiple tasks at once
   */
  bulkUpdateTaskStatus(updates: BulkStatusUpdate): {
    success: string[];
    failed: Array<{ taskId: string; error: string }>;
  } {
    const success: string[] = [];
    const failed: Array<{ taskId: string; error: string }> = [];

    for (const taskId of updates.taskIds) {
      try {
        this.engine.updateTaskStatus(taskId, updates.status, updates.reason);
        success.push(taskId);
      } catch (error: any) {
        failed.push({ taskId, error: error.message });
      }
    }

    return { success, failed };
  }

  /**
   * Clone an existing project with all its tasks
   */
  cloneProject(projectId: string, options: CloneOptions = {}): Project {
    const original = this.engine.getProject(projectId);
    if (!original) throw new Error('Project not found');

    // Create new project
    const newProject = this.engine.createProject(
      options.newTitle || `${original.title} (Copy)`,
      original.objective,
      original.acceptanceCriteria
    );

    // Clone tasks
    const tasks = this.engine.listTasks(projectId);
    const taskIdMap = new Map<string, string>();

    for (const task of tasks) {
      const newTask = this.engine.createTask(
        newProject.id,
        task.title,
        task.details,
        task.priority
      );
      taskIdMap.set(task.id, newTask.id);
    }

    // Update dependencies with new IDs
    for (const task of tasks) {
      if (task.dependsOn) {
        const newTaskId = taskIdMap.get(task.id);
        const newDependsOn = taskIdMap.get(task.dependsOn);
        if (newTaskId && newDependsOn) {
          // Update the task with new dependency
          const newTask = this.engine.getTask(newTaskId);
          if (newTask) {
            newTask.dependsOn = newDependsOn;
          }
        }
      }
    }

    // Clone memory if requested
    if (options.includeMemory) {
      const memory = this.engine.listMemory(projectId);
      for (const entry of memory) {
        if (entry.kind !== 'blocker' || !entry.is_resolved) {
          this.engine.logMemory(newProject.id, entry.kind, entry.content);
        }
      }
    }

    // Clone evidence if requested
    if (options.includeEvidence) {
      const evidence = this.engine.listEvidence(projectId);
      for (const entry of evidence) {
        this.engine.logEvidence(newProject.id, entry.title, entry.content);
      }
    }

    return newProject;
  }

  /**
   * Create project from template
   */
  createFromTemplate(template: ProjectTemplate): Project {
    const project = this.engine.createProject(
      template.title,
      template.objective,
      template.acceptanceCriteria
    );

    this.batchCreateTasks(project.id, template.tasks);

    return project;
  }

  /**
   * Archive multiple completed projects
   */
  bulkArchiveProjects(projectIds: string[]): {
    archived: string[];
    skipped: Array<{ projectId: string; reason: string }>;
  } {
    const archived: string[] = [];
    const skipped: Array<{ projectId: string; reason: string }> = [];

    for (const projectId of projectIds) {
      const project = this.engine.getProject(projectId);
      if (!project) {
        skipped.push({ projectId, reason: 'Project not found' });
        continue;
      }

      if (project.status !== 'done') {
        skipped.push({ projectId, reason: 'Project not completed' });
        continue;
      }

      try {
        this.engine.updateProjectStatus(projectId, 'archived', 'Bulk archive operation');
        archived.push(projectId);
      } catch (error: any) {
        skipped.push({ projectId, reason: error.message });
      }
    }

    return { archived, skipped };
  }

  /**
   * Get aggregated statistics across multiple projects
   */
  getAggregatedStats(projectIds: string[]): {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    averageHealth: number;
    averageCompleteness: number;
    statusBreakdown: Record<ProjectStatus, number>;
  } {
    let totalTasks = 0;
    let completedTasks = 0;
    let totalHealth = 0;
    let totalCompleteness = 0;
    const statusBreakdown: Record<string, number> = {};

    for (const projectId of projectIds) {
      const project = this.engine.getProject(projectId);
      if (!project) continue;

      const tasks = this.engine.listTasks(projectId);
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.status === 'done').length;
      totalHealth += project.healthScore || 0;
      totalCompleteness += project.completenessScore || 0;

      statusBreakdown[project.status] = (statusBreakdown[project.status] || 0) + 1;
    }

    return {
      totalProjects: projectIds.length,
      totalTasks,
      completedTasks,
      averageHealth: projectIds.length > 0 ? totalHealth / projectIds.length : 0,
      averageCompleteness: projectIds.length > 0 ? totalCompleteness / projectIds.length : 0,
      statusBreakdown: statusBreakdown as Record<ProjectStatus, number>,
    };
  }
}
