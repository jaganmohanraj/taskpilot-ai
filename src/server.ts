import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { TaskEngine } from './taskEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const engine = new TaskEngine();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
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
  res.json(project);
});

app.post('/api/projects/:id/tasks', (req, res) => {
  const { title, details, priority, dependsOn } = req.body;
  const task = engine.createTask(req.params.id, title, details, priority, dependsOn);
  res.json(task);
});

app.patch('/api/projects/:id/status', (req, res) => {
  const { status, reason } = req.body;
  try {
    engine.updateProjectStatus(req.params.id, status, reason);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/tasks/:id/status', (req, res) => {
  const { status, reason } = req.body;
  try {
    engine.updateTaskStatus(req.params.id, status, reason);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/projects/:id/memory', (req, res) => {
  const { kind, content } = req.body;
  const id = engine.logMemory(req.params.id, kind, content);
  res.json({ id });
});

app.post('/api/projects/:id/evidence', (req, res) => {
  const { title, content } = req.body;
  const id = engine.logEvidence(req.params.id, title, content);
  res.json({ id });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`TaskPilot AI Dashboard running on http://localhost:${PORT}`);
});

export { app };
