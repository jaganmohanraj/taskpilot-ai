import Database from 'better-sqlite3';

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL,
    status TEXT NOT NULL,
    health_score INTEGER DEFAULT 0,
    completeness_score INTEGER DEFAULT 0,
    drift_score INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL,
    priority INTEGER NOT NULL,
    depends_on TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS memory_entries (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    is_resolved INTEGER NOT NULL,
    resolved_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS evidence_entries (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS state_history (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    changed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    audit_type TEXT NOT NULL,
    pass INTEGER NOT NULL,
    score INTEGER NOT NULL,
    reasons TEXT,
    executed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS drift_checks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    check_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    resolved INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS project_metrics (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    recorded_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_memory_project ON memory_entries(project_id);
  CREATE INDEX IF NOT EXISTS idx_evidence_project ON evidence_entries(project_id);
  CREATE INDEX IF NOT EXISTS idx_state_history_entity ON state_history(entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_trail_project ON audit_trail(project_id);
  CREATE INDEX IF NOT EXISTS idx_drift_checks_project ON drift_checks(project_id);
  CREATE INDEX IF NOT EXISTS idx_metrics_project ON project_metrics(project_id);
`;

/**
 * Create an isolated in-memory SQLite database pre-populated with the full
 * application schema. Call db.close() in afterEach to release resources.
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(SCHEMA_SQL);
  return db;
}
