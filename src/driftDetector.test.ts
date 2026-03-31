import { describe, it, expect, beforeEach } from '@jest/globals';
import { DriftDetector } from './driftDetector.js';
import { initDb, db } from './lib/db.js';
import { TaskEngine } from './taskEngine.js';

describe('DriftDetector', () => {
  let detector: DriftDetector;
  let engine: TaskEngine;

  beforeEach(() => {
    initDb();
    db.exec('DELETE FROM projects');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM memory_entries');
    db.exec('DELETE FROM drift_checks');

    detector = new DriftDetector();
    engine = new TaskEngine();
  });

  describe('detectDrift', () => {
    it('should detect scope drift when too many tasks', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');

      // Create 25 tasks (threshold is 20)
      for (let i = 0; i < 25; i++) {
        engine.createTask(project.id, `Task ${i}`, 'Details', 100);
      }

      const checks = detector.detectDrift(project.id);
      const scopeDrift = checks.find(c => c.checkType === 'scope_drift');
      expect(scopeDrift).toBeDefined();
      expect(scopeDrift!.severity).toBe('high');
    });

    it('should detect goal mismatch when objective too vague', () => {
      const project = engine.createProject('Test', 'Short', 'Criteria');
      const checks = detector.detectDrift(project.id);
      const goalMismatch = checks.find(c => c.checkType === 'goal_mismatch');
      expect(goalMismatch).toBeDefined();
      expect(goalMismatch!.severity).toBe('critical');
    });

    it('should detect incomplete criteria', () => {
      const project = engine.createProject('Test', 'Objective', '');
      const checks = detector.detectDrift(project.id);
      const incompleteCriteria = checks.find(c => c.checkType === 'incomplete_criteria');
      expect(incompleteCriteria).toBeDefined();
      expect(incompleteCriteria!.severity).toBe('critical');
    });

    it('should detect unresolved blockers in done projects', () => {
      const project = engine.createProject('Test', 'Objective', 'Criteria');
      engine.logMemory(project.id, 'blocker', 'Test blocker');
      engine.updateProjectStatus(project.id, 'done');

      const checks = detector.detectDrift(project.id);
      const unresolvedBlocker = checks.find(c => c.checkType === 'unresolved_blocker');
      expect(unresolvedBlocker).toBeDefined();
      expect(unresolvedBlocker!.severity).toBe('critical');
    });

    it('should not duplicate drift checks', () => {
      const project = engine.createProject('Test', 'Short', '');
      const checks1 = detector.detectDrift(project.id);
      const checks2 = detector.detectDrift(project.id);

      // Should find issues but not duplicate them
      expect(checks1.length).toBeGreaterThan(0);
      expect(checks2.length).toBe(checks1.length);
    });
  });

  describe('resolveDriftCheck', () => {
    it('should mark drift check as resolved', () => {
      const project = engine.createProject('Test', 'Short', 'Criteria');
      const checks = detector.detectDrift(project.id);
      expect(checks.length).toBeGreaterThan(0);

      detector.resolveDriftCheck(checks[0].id);
      const unresolvedChecks = detector.getDriftChecks(project.id, false);
      expect(unresolvedChecks.find(c => c.id === checks[0].id)).toBeUndefined();
    });
  });

  describe('getDriftChecks', () => {
    it('should return only unresolved checks by default', () => {
      const project = engine.createProject('Test', 'Short', 'Criteria');
      const allChecks = detector.detectDrift(project.id);
      detector.resolveDriftCheck(allChecks[0].id);

      const unresolvedChecks = detector.getDriftChecks(project.id, false);
      expect(unresolvedChecks.length).toBe(allChecks.length - 1);
    });

    it('should return all checks when includeResolved is true', () => {
      const project = engine.createProject('Test', 'Short', 'Criteria');
      const allChecks = detector.detectDrift(project.id);
      detector.resolveDriftCheck(allChecks[0].id);

      const allChecksAfter = detector.getDriftChecks(project.id, true);
      expect(allChecksAfter.length).toBe(allChecks.length);
    });
  });
});
