import { db } from './lib/db.js';
import { newId } from './lib/id.js';
import type { StateHistoryEntry } from './types.js';

function now(): string {
  return new Date().toISOString();
}

export class StateTracker {
  recordStateChange(
    entityType: 'project' | 'task',
    entityId: string,
    oldStatus: string | undefined,
    newStatus: string,
    reason?: string
  ): void {
    const entry: StateHistoryEntry = {
      id: newId('state'),
      entityType,
      entityId,
      oldStatus,
      newStatus,
      reason,
      changedAt: now(),
    };

    db.prepare(`
      INSERT INTO state_history (id, entity_type, entity_id, old_status, new_status, reason, changed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(entry.id, entry.entityType, entry.entityId, entry.oldStatus || null, entry.newStatus, entry.reason || null, entry.changedAt);
  }

  getHistory(entityId: string): StateHistoryEntry[] {
    return db.prepare(`
      SELECT * FROM state_history WHERE entity_id = ? ORDER BY changed_at DESC
    `).all(entityId).map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      reason: row.reason,
      changedAt: row.changed_at,
    }));
  }

  getProjectTimeline(projectId: string): StateHistoryEntry[] {
    // Get all state changes for project and its tasks
    const tasks = db.prepare(`SELECT id FROM tasks WHERE project_id = ?`).all(projectId).map((r: any) => r.id);
    const entityIds = [projectId, ...tasks];

    const placeholders = entityIds.map(() => '?').join(',');
    return db.prepare(`
      SELECT * FROM state_history WHERE entity_id IN (${placeholders}) ORDER BY changed_at DESC
    `).all(...entityIds).map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      reason: row.reason,
      changedAt: row.changed_at,
    }));
  }
}
