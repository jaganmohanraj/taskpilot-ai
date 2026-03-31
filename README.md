# TaskPilot AI

**Transform AI assistants from helpful chatbots into disciplined execution systems.**

TaskPilot AI is a commercial-grade MCP (Model Context Protocol) server that brings **persistent memory**, **anti-drift controls**, **verifier-gated completion**, and **intelligent project management** to AI-assisted work.

## The Problem

Most AI assistants:
- Forget context between sessions
- Drift away from original goals
- Falsely claim tasks are complete
- Lack systematic project tracking
- Have no verification gates
- Can't prove what actually got done

## The Solution

TaskPilot AI provides:

✅ **Verifier-Gated Completion** - Projects cannot be marked done until all criteria pass
✅ **Anti-Drift Detection** - Continuous monitoring prevents scope creep and goal misalignment
✅ **Persistent Memory** - Full audit trail of decisions, blockers, assumptions, and evidence
✅ **State Machine** - Enforced project lifecycle from draft → verified → done
✅ **Health Scoring** - Real-time project health and completeness metrics
✅ **Intelligent Work Breakdown** - Context-aware task generation from acceptance criteria
✅ **Dependency Management** - Task dependencies with automatic next-action suggestions
✅ **Audit History** - Complete timeline of all project state changes

---

## Key Differentiators

### 1. No Fake Completion
Projects cannot close until:
- All tasks are done
- All blockers are resolved
- Evidence is logged
- Acceptance criteria are met
- Drift checks pass

### 2. Anti-Drift System
Automatic detection of:
- Scope drift (too many tasks)
- Goal mismatch (vague objectives)
- Incomplete criteria
- Abandoned tasks
- Unresolved blockers

### 3. Full Memory Persistence
Every project stores:
- **Decisions** - What was decided and why
- **Assumptions** - What we're assuming (and whether verified)
- **Blockers** - What's preventing progress
- **Evidence** - Proof of completion
- **State History** - Complete timeline

### 4. Execution Intelligence
- Smart work breakdown from acceptance criteria
- Priority and dependency awareness
- Next-best-action recommendations
- Health and completeness scoring

---

## Quick Start

### Installation

```bash
git clone https://github.com/jaganmohanraj/taskpilot-ai.git
cd taskpilot-ai
npm install
npm run build
```

### Run the MCP Server

```bash
npm start
```

### Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "taskpilot-ai": {
      "command": "node",
      "args": ["/absolute/path/to/taskpilot-ai/dist/index.js"]
    }
  }
}
```

---

## Core Workflow

### 1. Create a Project

Use the `start_project` prompt with your request.

TaskPilot will:
- Extract a clear title and objective
- Define testable acceptance criteria
- Generate an intelligent work breakdown
- Track everything in SQLite

### 2. Execute With Discipline

As you work:
- Update task status
- Log decisions and assumptions
- Record blockers
- Save evidence
- The system auto-updates health scores

### 3. Verify Before Closure

Use the `closeout_review` prompt.

TaskPilot will:
- Run completion audit
- Detect drift
- List gaps
- Only close if verified

---

## MCP Tools Reference

### Project Management
- `create_project_from_request` - Create new project
- `list_projects` - View all projects
- `get_project` - Get project details
- `update_project_status` - Change project state
- `generate_work_breakdown` - Auto-generate tasks

### Task Management
- `create_subtask` - Add new task
- `list_tasks` - View project tasks
- `update_task_status` - Update task state

### Memory & Evidence
- `log_memory` - Record decision/assumption/blocker/note
- `resolve_memory` - Mark memory as resolved
- `list_memory` - View all memory entries
- `log_evidence` - Save completion proof
- `list_evidence` - View evidence

### Verification & Audit
- `run_completion_audit` - Check if ready to close
- `why_not_done` - Get blockers to completion
- `close_project_if_verified` - Close if audit passes
- `get_audit_history` - View all audits

### Drift Detection
- `run_drift_detection` - Check for anti-patterns
- `get_drift_checks` - View drift issues
- `resolve_drift_check` - Mark drift resolved

### Intelligence
- `suggest_next_best_action` - Get recommended next step
- `get_project_timeline` - View state history

---

## Architecture

TaskPilot AI is built on:

**Core Engine** (`taskEngine.ts`)
- Project and task lifecycle management
- Integration point for all subsystems

**Verifier** (`verifier.ts`)
- Completion audit logic
- Multi-factor scoring
- "Why not done" analysis

**Drift Detector** (`driftDetector.ts`)
- Scope drift detection
- Goal alignment checks
- Abandoned task monitoring
- Blocker tracking

**State Tracker** (`stateTracker.ts`)
- All state change recording
- Project timeline generation

**Work Breakdown Generator** (`workBreakdownGenerator.ts`)
- Intelligent task generation from criteria
- Context-aware breakdown

**Persistence** (`db.ts`)
- SQLite with 8 tables
- Full schema with indexes
- Atomic operations

---

## State Machine

### Project States
1. **draft** → Project created
2. **planned** → Work breakdown generated
3. **in_progress** → Active work
4. **blocked** → Prevented by issues
5. **awaiting_verification** → Ready for audit
6. **verified** → Audit passed
7. **done** → Completed and closed
8. **archived** → Historical

### Task States
- **todo** → Not started
- **in_progress** → Being worked on
- **blocked** → Cannot proceed
- **done** → Completed

---

## Database Schema

- `projects` - Project metadata and scores
- `tasks` - Task details and dependencies
- `memory_entries` - Decisions, assumptions, blockers, notes
- `evidence_entries` - Completion proofs
- `state_history` - All state changes
- `audit_trail` - All audit executions
- `drift_checks` - Detected drift issues
- `project_metrics` - Time-series metrics

---

## Use Cases

### For Solo Developers
- Track multi-day coding projects
- Never lose context
- Ensure features are truly complete

### For AI Agent Workflows
- Prevent drift in long-running tasks
- Enforce completion standards
- Maintain execution discipline

### For Project Teams
- Central source of truth
- Evidence-based completion
- Full audit trail

---

## Roadmap

See [`docs/roadmap.md`](docs/roadmap.md) for planned features.

Near-term priorities:
- Web dashboard UI
- Export/import capabilities
- Multi-agent orchestration support
- Analytics and insights

---

## Documentation

- [Blueprint](docs/blueprint.md) - Core design principles
- [Operating Model](docs/operating-model.md) - Standard runbook
- [Roadmap](docs/roadmap.md) - Future plans

---

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Why TaskPilot AI?

> Most AI task tools are thin wrappers around to-do lists.
>
> **TaskPilot AI is an execution system.**

It doesn't just store tasks - it:
- Prevents drift
- Enforces discipline
- Demands evidence
- Proves completion
- Maintains memory
- Tracks health

**Built for professionals who need AI assistance that doesn't cut corners.**

---

## Support

- **Issues**: [GitHub Issues](https://github.com/jaganmohanraj/taskpilot-ai/issues)

---

Made with discipline. 🎯
