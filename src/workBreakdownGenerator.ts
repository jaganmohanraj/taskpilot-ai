import type { Task, Project } from './types.js';

export class WorkBreakdownGenerator {
  /**
   * Generate intelligent work breakdown based on project objective and acceptance criteria
   */
  generateBreakdown(project: Project): Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>[] {
    const tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>[] = [];

    // Always start with goal clarification
    tasks.push({
      projectId: project.id,
      title: 'Clarify and validate project objective',
      details: `Review and validate the objective: "${project.objective}". Ensure it is specific, measurable, and achievable.`,
      status: 'todo',
      priority: 1,
    });

    // Parse acceptance criteria to generate tasks
    if (project.acceptanceCriteria) {
      const criteriaLines = project.acceptanceCriteria
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      criteriaLines.forEach((criterion, index) => {
        tasks.push({
          projectId: project.id,
          title: `Implement: ${criterion.substring(0, 50)}${criterion.length > 50 ? '...' : ''}`,
          details: `Acceptance criterion: ${criterion}`,
          status: 'todo',
          priority: 10 + index * 10,
        });
      });
    } else {
      // Generic breakdown if no criteria
      tasks.push({
        projectId: project.id,
        title: 'Define acceptance criteria',
        details: 'Create clear, testable acceptance criteria for project completion',
        status: 'todo',
        priority: 5,
      });

      tasks.push({
        projectId: project.id,
        title: 'Design solution approach',
        details: 'Create architectural/design plan for implementation',
        status: 'todo',
        priority: 20,
      });

      tasks.push({
        projectId: project.id,
        title: 'Implement core functionality',
        details: 'Build main features according to design',
        status: 'todo',
        priority: 30,
      });

      tasks.push({
        projectId: project.id,
        title: 'Test and validate',
        details: 'Verify all functionality works as expected',
        status: 'todo',
        priority: 40,
      });
    }

    // Always end with evidence collection and audit
    tasks.push({
      projectId: project.id,
      title: 'Collect completion evidence',
      details: 'Document proof that all acceptance criteria are met',
      status: 'todo',
      priority: 900,
    });

    tasks.push({
      projectId: project.id,
      title: 'Run completion audit',
      details: 'Execute final verification audit before closure',
      status: 'todo',
      priority: 1000,
    });

    return tasks;
  }

  /**
   * Suggest next tasks based on current state
   */
  suggestNextTasks(project: Project, existingTasks: Task[]): Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>[] {
    const suggestions: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>[] = [];

    // Check if there are blocked tasks that need unblocking steps
    const blockedTasks = existingTasks.filter(t => t.status === 'blocked');
    for (const blockedTask of blockedTasks) {
      suggestions.push({
        projectId: project.id,
        title: `Unblock: ${blockedTask.title}`,
        details: `Resolve blocker for task: ${blockedTask.title}`,
        status: 'todo',
        priority: 50,
      });
    }

    return suggestions;
  }
}
