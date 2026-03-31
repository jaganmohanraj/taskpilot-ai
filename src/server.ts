import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { TaskEngine } from './taskEngine.js';
import { CompositeOperations } from './compositeOperations.js';
import { ExternalVerifier } from './externalVerifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

const engine = new TaskEngine();
const compositeOps = new CompositeOperations(engine);
const externalVerifier = new ExternalVerifier();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// WebSocket connection handling
io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('subscribe:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
  });

  socket.on('unsubscribe:project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });
});

// Helper to emit updates
function emitProjectUpdate(projectId: string, event: string, data: any) {
  io.to(`project:${projectId}`).emit(event, data);
}

// API Routes - Basic Operations
app.get('/api/projects', (req, res) => {
  const projects = engine.listProjects();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = engine.getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

app.get('/api/projects/:id/tasks', (req, res) => {
  const tasks = engine.listTasks(req.params.id);
  res.json(tasks);
});

app.get('/api/projects/:id/memory', (req, res) => {
  const memory = engine.listMemory(req.params.id);
  res.json(memory);
});

app.get('/api/projects/:id/evidence', (req, res) => {
  const evidence = engine.listEvidence(req.params.id);
  res.json(evidence);
});

app.get('/api/projects/:id/timeline', (req, res) => {
  const timeline = engine.getProjectTimeline(req.params.id);
  res.json(timeline);
});

app.get('/api/projects/:id/audit', (req, res) => {
  const audit = engine.runCompletionAudit(req.params.id);
  res.json(audit);
});

app.get('/api/projects/:id/drift', (req, res) => {
  const drift = engine.getDriftChecks(req.params.id);
  res.json(drift);
});

app.get('/api/projects/:id/next-action', (req, res) => {
  const action = engine.suggestNextBestAction(req.params.id);
  res.json(action);
});

app.get('/api/projects/:id/why-not-done', (req, res) => {
  const reasons = engine.getWhyNotDone(req.params.id);
  res.json({ reasons });
});

app.post('/api/projects', (req, res) => {
  const { title, objective, acceptanceCriteria } = req.body;
  const project = engine.createProject(title, objective, acceptanceCriteria);

  // Emit real-time update
  io.emit('project:created', project);

  res.json(project);
});

app.post('/api/projects/:id/tasks', (req, res) => {
  const { title, details, priority, dependsOn } = req.body;
  const task = engine.createTask(req.params.id, title, details, priority, dependsOn);

  // Emit real-time update
  emitProjectUpdate(req.params.id, 'task:created', task);

  res.json(task);
});

app.patch('/api/projects/:id/status', (req, res) => {
  const { status, reason } = req.body;
  try {
    engine.updateProjectStatus(req.params.id, status, reason);
    const project = engine.getProject(req.params.id);

    // Emit real-time update
    emitProjectUpdate(req.params.id, 'project:updated', project);
    io.emit('project:status-changed', { projectId: req.params.id, status });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/tasks/:id/status', (req, res) => {
  const { status, reason } = req.body;
  try {
    const task = engine.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    engine.updateTaskStatus(req.params.id, status, reason);
    const updatedTask = engine.getTask(req.params.id);

    // Emit real-time update
    emitProjectUpdate(task.projectId, 'task:updated', updatedTask);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/projects/:id/memory', (req, res) => {
  const { kind, content } = req.body;
  const id = engine.logMemory(req.params.id, kind, content);

  // Emit real-time update
  emitProjectUpdate(req.params.id, 'memory:added', { id, kind, content });

  res.json({ id });
});

app.post('/api/projects/:id/evidence', (req, res) => {
  const { title, content } = req.body;
  const id = engine.logEvidence(req.params.id, title, content);

  // Emit real-time update
  emitProjectUpdate(req.params.id, 'evidence:added', { id, title, content });

  res.json({ id });
});

// Composite Operations API
app.post('/api/projects/:id/tasks/batch', (req, res) => {
  try {
    const { tasks } = req.body;
    const createdTasks = compositeOps.batchCreateTasks(req.params.id, tasks);

    // Emit real-time update
    emitProjectUpdate(req.params.id, 'tasks:batch-created', createdTasks);

    res.json({ tasks: createdTasks });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/tasks/bulk-status', (req, res) => {
  try {
    const result = compositeOps.bulkUpdateTaskStatus(req.body);

    // Emit updates for each affected project
    for (const taskId of result.success) {
      const task = engine.getTask(taskId);
      if (task) {
        emitProjectUpdate(task.projectId, 'task:updated', task);
      }
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/projects/:id/clone', (req, res) => {
  try {
    const cloned = compositeOps.cloneProject(req.params.id, req.body);

    // Emit real-time update
    io.emit('project:created', cloned);

    res.json(cloned);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/projects/template', (req, res) => {
  try {
    const project = compositeOps.createFromTemplate(req.body);

    // Emit real-time update
    io.emit('project:created', project);

    res.json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/projects/bulk-archive', (req, res) => {
  try {
    const { projectIds } = req.body;
    const result = compositeOps.bulkArchiveProjects(projectIds);

    // Emit updates for archived projects
    for (const projectId of result.archived) {
      io.emit('project:archived', { projectId });
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/projects/stats', (req, res) => {
  try {
    const { projectIds } = req.body;
    const stats = compositeOps.getAggregatedStats(projectIds);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// External Verification API
app.post('/api/projects/:id/verify', async (req, res) => {
  try {
    const { config } = req.body;
    const verifier = config ? new ExternalVerifier(config) : externalVerifier;

    const result = await verifier.verify();

    // Log verification results as evidence
    if (result.passed) {
      engine.logEvidence(
        req.params.id,
        'External Verification Passed',
        `${result.summary}\n\nChecks:\n${result.checks.map(c => `- ${c.name}: ${c.passed ? 'PASS' : 'FAIL'}`).join('\n')}`
      );
    }

    // Emit real-time update
    emitProjectUpdate(req.params.id, 'verification:completed', result);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/verification/config/:type', (req, res) => {
  const type = req.params.type as 'node' | 'python' | 'generic';
  const config = ExternalVerifier.createDefaultConfig(type);
  res.json(config);
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`TaskPilot AI Dashboard running on http://localhost:${PORT}`);
  console.log('WebSocket server enabled for real-time updates');
});

export { app, io, httpServer };
