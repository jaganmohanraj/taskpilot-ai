import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { Verifier } from '../src/verifier.js';
import path from 'node:path';
import fs from 'node:fs';

const testDbPath = path.join(process.cwd(), 'artifacts', 'test-verifier.db');

describe('Verifier', () => {
  let db: Database.Database;
  let verifier: Verifier;

  beforeEach(() => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database
    db = new Database(testDbPath);

    // Initialize schema
    db.exec(`
      CREATE TABLE projects (
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

      CREATE TABLE tasks (
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

      CREATE TABLE memory_entries (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        content TEXT NOT NULL,
        is_resolved INTEGER NOT NULL,
        resolved_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE evidence_entries (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE audit_trail (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        audit_type TEXT NOT NULL,
        pass INTEGER NOT NULL,
        score INTEGER NOT NULL,
        reasons TEXT,
        executed_at TEXT NOT NULL
      );

      CREATE TABLE drift_checks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        check_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        resolved INTEGER DEFAULT 0
      );
    `);

    // Mock the db import
    global.db = db;
    verifier = new Verifier();
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('runCompletionAudit', () => {
    it('should pass audit for a complete project', () => {
      // Create a complete project
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', 'Feature X works as expected', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at, completed_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'done', 1, '2024-01-01', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO evidence_entries (id, project_id, title, content, created_at)
        VALUES ('ev_1', 'proj_1', 'Proof of completion', 'Screenshot attached', '2024-01-01')
      `).run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(true);
      expect(result.score).toBe(100);
      expect(result.reasons).toHaveLength(0);
    });

    it('should fail audit when acceptance criteria are missing', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', '', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('Missing acceptance criteria');
      expect(result.score).toBeLessThan(100);
    });

    it('should fail audit when tasks are not complete', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'todo', 1, '2024-01-01', '2024-01-01')
      `).run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('1 open tasks remain');
    });

    it('should fail audit when blockers are unresolved', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO memory_entries (id, project_id, kind, content, is_resolved, created_at)
        VALUES ('mem_1', 'proj_1', 'blocker', 'Cannot proceed due to API issue', 0, '2024-01-01')
      `).run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('1 unresolved blockers remain');
    });

    it('should fail audit when no evidence is logged', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at, completed_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'done', 1, '2024-01-01', '2024-01-01', '2024-01-01')
      `).run();

      const result = verifier.runCompletionAudit('proj_1');

      expect(result.pass).toBe(false);
      expect(result.reasons).toContain('No evidence logged');
    });

    it('should save audit trail', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      verifier.runCompletionAudit('proj_1');

      const auditTrail = db.prepare(`SELECT * FROM audit_trail WHERE project_id = 'proj_1'`).all();
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].audit_type).toBe('completion');
    });
  });

  describe('whyNotDone', () => {
    it('should return empty array for complete project', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at, completed_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'done', 1, '2024-01-01', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO evidence_entries (id, project_id, title, content, created_at)
        VALUES ('ev_1', 'proj_1', 'Proof', 'Done', '2024-01-01')
      `).run();

      const reasons = verifier.whyNotDone('proj_1');
      expect(reasons).toHaveLength(0);
    });

    it('should list all blocking reasons', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', '', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'todo', 1, '2024-01-01', '2024-01-01')
      `).run();

      const reasons = verifier.whyNotDone('proj_1');
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons).toContain('Missing acceptance criteria');
      expect(reasons).toContain('1 open tasks remain');
      expect(reasons).toContain('No evidence logged');
    });
  });

  describe('canClose', () => {
    it('should return canClose=true when audit passes', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', 'Feature X works', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO tasks (id, project_id, title, details, status, priority, created_at, updated_at, completed_at)
        VALUES ('task_1', 'proj_1', 'Task 1', 'Details', 'done', 1, '2024-01-01', '2024-01-01', '2024-01-01')
      `).run();

      db.prepare(`
        INSERT INTO evidence_entries (id, project_id, title, content, created_at)
        VALUES ('ev_1', 'proj_1', 'Proof', 'Done', '2024-01-01')
      `).run();

      const result = verifier.canClose('proj_1');
      expect(result.canClose).toBe(true);
    });

    it('should return canClose=false with reason when audit fails', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', '', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      const result = verifier.canClose('proj_1');
      expect(result.canClose).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history for project', () => {
      db.prepare(`
        INSERT INTO projects (id, title, objective, acceptance_criteria, status, created_at, updated_at)
        VALUES ('proj_1', 'Test Project', 'Build feature X', 'Criteria', 'in_progress', '2024-01-01', '2024-01-01')
      `).run();

      verifier.runCompletionAudit('proj_1');
      verifier.runCompletionAudit('proj_1');

      const history = verifier.getAuditHistory('proj_1');
      expect(history).toHaveLength(2);
      expect(history[0].projectId).toBe('proj_1');
      expect(history[0].auditType).toBe('completion');
    });
  });
});
