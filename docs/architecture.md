# Architecture

TaskPilot AI is structured as a modular, commercial-grade execution system.

## High-Level Overview

```
┌──────────────────────────────────────┐
│      MCP Server (index.ts)           │
│  26 Tools + 3 Prompts + 2 Resources  │
└─────────────────┬────────────────────┘
                  │
┌─────────────────▼────────────────────┐
│      Core Engine (taskEngine.ts)      │
│  Orchestrates all subsystems         │
└────────────┬─────────────────────────┘
             │
             ├─── Verifier
             ├─── Drift Detector
             ├─── State Tracker
             ├─── Work Breakdown Generator
             └─── Database Layer
```

## Core Components

### 1. MCP Server Layer (`src/index.ts`)

**Responsibilities:**
- Tool registration and validation
- Resource endpoints
- Prompt definitions
- Request routing to TaskEngine

**Key Features:**
- 26 MCP tools for comprehensive project management
- Input validation via Zod schemas
- Descriptive tool parameters for AI discoverability
- 3 prompt templates for common workflows
- 2 resource endpoints for data access

### 2. Task Engine (`src/taskEngine.ts`)

**Responsibilities:**
- Central orchestration layer
- Project and task lifecycle management
- Subsystem integration
- Health score calculation
- Coordinating state changes

**Key Methods:**
- `createProject()` - Initializes new projects
- `generateWorkBreakdown()` - Delegates to WorkBreakdownGenerator
- `updateTaskStatus()` - Updates status + triggers state tracking
- `runCompletionAudit()` - Delegates to Verifier
- `suggestNextBestAction()` - Intelligent action recommendation
- `updateProjectHealth()` - Real-time health scoring

### 3. Verifier (`src/verifier.ts`)

**Responsibilities:**
- Completion audit execution
- Multi-factor scoring
- "Why not done" analysis
- Audit trail persistence

**Audit Factors:**
- Acceptance criteria presence (30 points)
- Open tasks (25 points)
- Blocked tasks (15 points)
- Unresolved blockers (20 points)
- Evidence logged (20 points)
- Unverified assumptions (10 points)
- Drift checks (10-30 points)

**Score Calculation:**
```
Base Score = 100
- Deduct for each missing factor
- Critical issues (criteria, drift) penalize more
- Result: 0-100 score + pass/fail boolean
```

### 4. Drift Detector (`src/driftDetector.ts`)

**Responsibilities:**
- Anti-pattern detection
- Scope drift monitoring
- Goal alignment verification
- Abandoned task identification

**Detection Logic:**
- **Scope Drift**: Tasks > 20 → high severity
- **Goal Mismatch**: Objective < 20 chars → critical
- **Incomplete Criteria**: No acceptance criteria → critical
- **Abandoned Tasks**: In-progress > 24hrs → medium
- **Unresolved Blockers**: Done + blockers → critical

### 5. State Tracker (`src/stateTracker.ts`)

**Responsibilities:**
- Record all state changes
- Maintain complete timeline
- Support project history queries

**Tracking:**
- Project status changes
- Task status changes
- Reason for each change
- Timestamp with each entry

### 6. Work Breakdown Generator (`src/workBreakdownGenerator.ts`)

**Responsibilities:**
- Intelligent task generation
- Acceptance criteria parsing
- Standard workflow tasks

**Generation Strategy:**
1. Always start with goal clarification
2. Parse acceptance criteria into tasks
3. Create implementation tasks
4. Add evidence collection
5. End with audit step

### 7. Persistence Layer (`src/lib/db.ts`)

**Database Schema:**

#### Core Tables
- `projects` - Project metadata, health/completeness/drift scores
- `tasks` - Tasks with dependencies and priorities
- `memory_entries` - Decisions, assumptions, blockers, notes
- `evidence_entries` - Completion proofs

#### Audit & History Tables
- `state_history` - All state transitions
- `audit_trail` - Audit execution history
- `drift_checks` - Detected drift issues
- `project_metrics` - Time-series data

**Indexes:**
- Foreign keys (project_id)
- Entity lookups (entity_id)
- Optimized for common queries

## Data Flow

### Creating a Project
```
User Request
  → create_project_from_request tool
    → TaskEngine.createProject()
      → Insert into projects table
      → StateTracker.recordStateChange()
        → Insert into state_history
  → Return project object
```

### Running Completion Audit
```
audit_project tool
  → TaskEngine.runCompletionAudit()
    → Verifier.runCompletionAudit()
      → Query projects, tasks, memory, evidence
      → DriftDetector.detectDrift()
        → Check patterns
        → Save drift_checks
      → Calculate score
      → Save audit_trail
    → Update project scores
  → Return audit result
```

### Suggesting Next Action
```
suggest_next_best_action tool
  → TaskEngine.suggestNextBestAction()
    → Check for blockers (highest priority)
    → Check for available tasks (respecting dependencies)
    → Run audit to check if complete
  → Return NextAction object with priority
```

## Design Patterns

### 1. Service Layer Pattern
- TaskEngine coordinates
- Specialized services handle concerns
- Clear separation of responsibilities

### 2. State Machine
- Explicit project lifecycle
- Enforced transitions
- History tracking

### 3. Scoring & Metrics
- Multi-factor evaluation
- Continuous health monitoring
- Drift detection

### 4. Audit Trail
- Every change recorded
- Full timeline available
- Reproducible state

## Extension Points

### Adding New Drift Checks
1. Add check type to `DriftCheckType` in types.ts
2. Implement detection logic in DriftDetector
3. Call from `detectDrift()` method

### Adding New Memory Kinds
1. Add kind to `MemoryKind` in types.ts
2. Update audit logic if needed
3. No database changes required

### Adding New Project States
1. Add state to `ProjectStatus` in types.ts
2. Update state machine documentation
3. Update MCP tool enum

## Performance Considerations

- SQLite with indexes for fast queries
- Lazy loading (only query what's needed)
- Batch operations where possible
- No N+1 query patterns

## Security Considerations

- Local SQLite (no network exposure)
- No authentication (single-user by design)
- Input validation via Zod
- SQL injection prevention (parameterized queries)

## Future Architecture

Planned improvements:
- Plugin system for custom verifiers
- Event bus for subsystem decoupling
- Multi-user support with auth
- WebSocket API for real-time dashboard
- Export/import for backup/restore

---

**Architecture Philosophy:**

> Simple, modular, testable, and extensible.
> Every component has one clear job.
> State is explicit and auditable.
> Verification is mandatory, not optional.
