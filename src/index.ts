import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { initDb } from './lib/db.js';
import { TaskEngine } from './taskEngine.js';

initDb();
const engine = new TaskEngine();
const server = new McpServer({ name: 'taskpilot-ai', version: '0.3.0' });

// Core project management tools
server.tool(
  'create_project_from_request',
  {
    title: z.string().describe('Project title'),
    objective: z.string().describe('Clear objective statement'),
    acceptanceCriteria: z.string().describe('Criteria for completion'),
  },
  async ({ title, objective, acceptanceCriteria }) => {
    const project = engine.createProject(title, objective, acceptanceCriteria);
    return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
  }
);

server.tool(
  'generate_work_breakdown',
  { projectId: z.string().describe('Project ID') },
  async ({ projectId }) => {
    const tasks = engine.generateWorkBreakdown(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
  }
);

server.tool(
  'get_project',
  { projectId: z.string().describe('Project ID') },
  async ({ projectId }) => {
    const project = engine.getProject(projectId);
    if (!project) {
      return { content: [{ type: 'text', text: 'Project not found' }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
  }
);

server.tool(
  'list_projects',
  {},
  async () => {
    const projects = engine.listProjects();
    return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
  }
);

server.tool(
  'update_project_status',
  {
    projectId: z.string(),
    status: z.enum(['draft', 'planned', 'in_progress', 'blocked', 'awaiting_verification', 'verified', 'done', 'archived']),
    reason: z.string().optional().describe('Reason for status change'),
  },
  async ({ projectId, status, reason }) => {
    engine.updateProjectStatus(projectId, status, reason);
    return { content: [{ type: 'text', text: `Updated project ${projectId} to ${status}` }] };
  }
);

// Task management tools
server.tool(
  'create_subtask',
  {
    projectId: z.string(),
    title: z.string(),
    details: z.string(),
    priority: z.number().optional(),
    dependsOn: z.string().optional().describe('Task ID this task depends on'),
  },
  async ({ projectId, title, details, priority, dependsOn }) => {
    const task = engine.createTask(projectId, title, details, priority ?? 100, dependsOn);
    return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
  }
);

server.tool(
  'update_task_status',
  {
    taskId: z.string(),
    status: z.enum(['todo', 'in_progress', 'blocked', 'done']),
    reason: z.string().optional().describe('Reason for status change'),
  },
  async ({ taskId, status, reason }) => {
    engine.updateTaskStatus(taskId, status, reason);
    return { content: [{ type: 'text', text: `Updated task ${taskId} to ${status}` }] };
  }
);

server.tool(
  'list_tasks',
  { projectId: z.string() },
  async ({ projectId }) => {
    const tasks = engine.listTasks(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
  }
);

// Memory and evidence tools
server.tool(
  'log_memory',
  {
    projectId: z.string(),
    kind: z.enum(['decision', 'assumption', 'blocker', 'note']),
    content: z.string(),
  },
  async ({ projectId, kind, content }) => {
    const id = engine.logMemory(projectId, kind, content);
    return { content: [{ type: 'text', text: `Logged ${kind}: ${id}` }] };
  }
);

server.tool(
  'resolve_memory',
  {
    memoryId: z.string(),
    reason: z.string().optional().describe('Reason for resolution'),
  },
  async ({ memoryId, reason }) => {
    engine.resolveMemory(memoryId, reason);
    return { content: [{ type: 'text', text: `Resolved memory ${memoryId}` }] };
  }
);

server.tool(
  'list_memory',
  { projectId: z.string() },
  async ({ projectId }) => {
    const memory = engine.listMemory(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(memory, null, 2) }] };
  }
);

server.tool(
  'log_evidence',
  {
    projectId: z.string(),
    title: z.string().describe('Evidence title'),
    content: z.string().describe('Evidence content/proof'),
  },
  async ({ projectId, title, content }) => {
    const id = engine.logEvidence(projectId, title, content);
    return { content: [{ type: 'text', text: `Logged evidence: ${id}` }] };
  }
);

server.tool(
  'list_evidence',
  { projectId: z.string() },
  async ({ projectId }) => {
    const evidence = engine.listEvidence(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(evidence, null, 2) }] };
  }
);

// Verification and audit tools
server.tool(
  'run_completion_audit',
  { projectId: z.string() },
  async ({ projectId }) => {
    const audit = engine.runCompletionAudit(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(audit, null, 2) }] };
  }
);

server.tool(
  'get_audit_history',
  { projectId: z.string() },
  async ({ projectId }) => {
    const history = engine.getAuditHistory(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(history, null, 2) }] };
  }
);

server.tool(
  'why_not_done',
  { projectId: z.string() },
  async ({ projectId }) => {
    const reasons = engine.getWhyNotDone(projectId);
    return {
      content: [{
        type: 'text',
        text: reasons.length > 0
          ? `Project not complete:\n${reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
          : 'Project is complete!'
      }]
    };
  }
);

server.tool(
  'close_project_if_verified',
  { projectId: z.string() },
  async ({ projectId }) => {
    const result = engine.closeProjectIfVerified(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// Drift detection tools
server.tool(
  'run_drift_detection',
  { projectId: z.string() },
  async ({ projectId }) => {
    const driftChecks = engine.runDriftDetection(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(driftChecks, null, 2) }] };
  }
);

server.tool(
  'get_drift_checks',
  { projectId: z.string() },
  async ({ projectId }) => {
    const checks = engine.getDriftChecks(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(checks, null, 2) }] };
  }
);

server.tool(
  'resolve_drift_check',
  { checkId: z.string() },
  async ({ checkId }) => {
    engine.resolveDriftCheck(checkId);
    return { content: [{ type: 'text', text: `Resolved drift check ${checkId}` }] };
  }
);

// Next action guidance
server.tool(
  'suggest_next_best_action',
  { projectId: z.string() },
  async ({ projectId }) => {
    const next = engine.suggestNextBestAction(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(next, null, 2) }] };
  }
);

// State history
server.tool(
  'get_project_timeline',
  { projectId: z.string() },
  async ({ projectId }) => {
    const timeline = engine.getProjectTimeline(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(timeline, null, 2) }] };
  }
);

// Resources
server.resource('projects', 'taskpilot://projects', async () => {
  const projects = engine.listProjects();
  return { contents: [{ uri: 'taskpilot://projects', mimeType: 'application/json', text: JSON.stringify(projects, null, 2) }] };
});

server.resource('state-machine', 'taskpilot://help/state-machine', async () => ({
  contents: [{
    uri: 'taskpilot://help/state-machine',
    mimeType: 'text/plain',
    text: `TaskPilot AI State Machine

Project States:
- draft: Project created but not yet planned
- planned: Work breakdown generated
- in_progress: Active work underway
- blocked: Progress prevented by unresolved issues
- awaiting_verification: Ready for audit
- verified: Audit passed
- done: Completed and closed
- archived: Historical project

Task States:
- todo: Not started
- in_progress: Currently being worked on
- blocked: Cannot proceed
- done: Completed

State Transitions:
Projects progress: draft → planned → in_progress → awaiting_verification → verified → done
Tasks can be moved between any states based on actual status.

Anti-drift Controls:
- Automatic drift detection on every audit
- State history tracking for all changes
- Verifier-gated completion (cannot close without passing audit)
- Health and completeness scoring`
  }]
}));

// Prompts
server.prompt('start_project', { request: z.string() }, async ({ request }) => ({
  messages: [{
    role: 'user',
    content: {
      type: 'text',
      text: `TaskPilot AI: Create a new project from this request.

Request: ${request}

Instructions:
1. Extract a clear title (3-8 words)
2. Write a specific, measurable objective
3. Define testable acceptance criteria (list format)
4. Use create_project_from_request with these inputs
5. Immediately call generate_work_breakdown
6. Review the generated tasks and add any missing critical steps`
    }
  }]
}));

server.prompt('closeout_review', { projectId: z.string() }, async ({ projectId }) => ({
  messages: [{
    role: 'user',
    content: {
      type: 'text',
      text: `TaskPilot AI: Review project ${projectId} for completion.

Instructions:
1. Call run_completion_audit for project ${projectId}
2. If audit fails:
   - Call why_not_done to see all gaps
   - Call suggest_next_best_action for guidance
   - Identify the highest-priority remaining work
   - Do NOT close the project
3. If audit passes:
   - Call close_project_if_verified
   - Confirm closure was successful

Remember: Never claim completion without a passing audit.`
    }
  }]
}));

server.prompt('check_project_health', { projectId: z.string() }, async ({ projectId }) => ({
  messages: [{
    role: 'user',
    content: {
      type: 'text',
      text: `TaskPilot AI: Perform health check on project ${projectId}.

Instructions:
1. Get project details
2. Run drift detection
3. Check completion audit
4. Review state timeline
5. Provide health summary with:
   - Health score
   - Completeness score
   - Number of drift issues
   - Unresolved blockers
   - Next recommended action`
    }
  }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
