import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { initDb } from './lib/db.js';
import { TaskEngine } from './taskEngine.js';

initDb();
const engine = new TaskEngine();
const server = new McpServer({ name: 'taskpilot-ai', version: '0.2.0' });

server.tool(
  'create_project_from_request',
  {
    title: z.string(),
    objective: z.string(),
    acceptanceCriteria: z.string()
  },
  async ({ title, objective, acceptanceCriteria }) => {
    const project = engine.createProject(title, objective, acceptanceCriteria);
    return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
  }
);

server.tool(
  'generate_work_breakdown',
  { projectId: z.string() },
  async ({ projectId }) => {
    const tasks = engine.generateWorkBreakdown(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
  }
);

server.tool(
  'create_subtask',
  { projectId: z.string(), title: z.string(), details: z.string(), priority: z.number().optional() },
  async ({ projectId, title, details, priority }) => {
    const task = engine.createTask(projectId, title, details, priority ?? 100);
    return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
  }
);

server.tool(
  'update_task_status',
  { taskId: z.string(), status: z.enum(['todo', 'in_progress', 'blocked', 'done']) },
  async ({ taskId, status }) => {
    engine.updateTaskStatus(taskId, status);
    return { content: [{ type: 'text', text: `Updated task ${taskId} to ${status}` }] };
  }
);

server.tool(
  'update_project_status',
  { projectId: z.string(), status: z.enum(['planned', 'in_progress', 'blocked', 'needs_review', 'done']) },
  async ({ projectId, status }) => {
    engine.updateProjectStatus(projectId, status);
    return { content: [{ type: 'text', text: `Updated project ${projectId} to ${status}` }] };
  }
);

server.tool(
  'log_memory',
  { projectId: z.string(), kind: z.enum(['decision', 'assumption', 'blocker', 'note']), content: z.string() },
  async ({ projectId, kind, content }) => {
    const id = engine.logMemory(projectId, kind, content);
    return { content: [{ type: 'text', text: `Logged memory ${id}` }] };
  }
);

server.tool(
  'resolve_memory',
  { memoryId: z.string() },
  async ({ memoryId }) => {
    engine.resolveMemory(memoryId);
    return { content: [{ type: 'text', text: `Resolved memory ${memoryId}` }] };
  }
);

server.tool(
  'log_evidence',
  { projectId: z.string(), title: z.string(), content: z.string() },
  async ({ projectId, title, content }) => {
    const id = engine.logEvidence(projectId, title, content);
    return { content: [{ type: 'text', text: `Logged evidence ${id}` }] };
  }
);

server.tool(
  'run_completion_audit',
  { projectId: z.string() },
  async ({ projectId }) => {
    const audit = engine.runCompletionAudit(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(audit, null, 2) }] };
  }
);

server.tool(
  'suggest_next_best_action',
  { projectId: z.string() },
  async ({ projectId }) => {
    const next = engine.suggestNextBestAction(projectId);
    return { content: [{ type: 'text', text: next }] };
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

server.resource('projects', 'taskpilot://projects', async () => {
  const projects = engine.listProjects();
  return { contents: [{ uri: 'taskpilot://projects', text: JSON.stringify(projects, null, 2) }] };
});

server.resource('state-machine', 'taskpilot://help/state-machine', async () => ({
  contents: [{
    uri: 'taskpilot://help/state-machine',
    text: 'Project states: planned, in_progress, blocked, needs_review, done. Task states: todo, in_progress, blocked, done.'
  }]
}));

server.prompt('start_project', { request: z.string() }, async ({ request }) => ({
  messages: [{
    role: 'user',
    content: {
      type: 'text',
      text: `Create a project from this request, define an objective and acceptance criteria, then generate a work breakdown: ${request}`
    }
  }]
}));

server.prompt('closeout_review', { projectId: z.string() }, async ({ projectId }) => ({
  messages: [{
    role: 'user',
    content: {
      type: 'text',
      text: `Review project ${projectId}. Run the completion audit. If it fails, identify the top remaining gap. If it passes, close it.`
    }
  }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
