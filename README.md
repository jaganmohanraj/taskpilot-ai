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

### 1. No Fake Completion ⛔
Projects cannot close until:
- All tasks are done
- All blockers are resolved
- Evidence is logged **and validated for quality**
- Acceptance criteria are met
- Drift checks pass

**Enforcement**: Direct attempts to mark projects "done" are blocked at the architecture level. The verifier must pass with 100/100 score.

### 2. Anti-Drift System
Automatic detection of:
- Scope drift (too many tasks)
- Goal mismatch (vague objectives)
- Incomplete criteria
- Abandoned tasks
- Unresolved blockers

### 3. Full Memory Persistence 💾
Every project stores:
- **Decisions** - What was decided and why
- **Assumptions** - What we're assuming (and whether verified)
- **Blockers** - What's preventing progress
- **Evidence** - Proof of completion (quality-scored 0-100)
- **State History** - Complete timeline with reasons

**Evidence Validation**: All evidence is scored for quality. Suspicious patterns like "done" or "ok" trigger warnings.

### 4. Execution Intelligence 🧠
- Smart work breakdown from acceptance criteria
- Priority and dependency awareness
- Next-best-action recommendations
- Health and completeness scoring
- Automatic state transition enforcement
- Test coverage: 70-80% across core modules

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

### Run the Web Dashboard 🎨

Launch the interactive web dashboard for visual project management:

```bash
npm run dashboard
```

Then open http://localhost:3000 in your browser.

The dashboard provides:
- **Overview**: View all projects with health scores and progress
- **Project Detail**: Deep-dive into tasks, memory, evidence, audit results, and timeline
- **Next Action**: AI-powered recommendations for what to work on next
- **Real-time Health**: Visual health meters and completeness tracking
- **Create Projects**: Interactive forms to create new projects

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

### Getting Started
- [Quick Start](#quick-start) - Installation and setup
- [Examples](docs/examples.md) - 5 real-world usage examples
- [Deployment Guide](docs/deployment.md) - Docker, Kubernetes, production

### Architecture & Design
- [Architecture](docs/architecture.md) - System design and components
- [Blueprint](docs/blueprint.md) - Core design principles
- [Operating Model](docs/operating-model.md) - Standard runbook
- [Security](docs/security.md) - Threat models and mitigations

### Contributing
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Comparison](docs/comparison.md) - vs Jira, Asana, Linear, Notion
- [Roadmap](docs/roadmap.md) - Future plans

---

## Testing & Quality

TaskPilot AI has comprehensive test coverage:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Coverage Thresholds**:
- Branches: 70%
- Functions: 75%
- Lines: 80%
- Statements: 80%

**Test Files**:
- `verifier.test.ts` - Completion audit logic (15+ tests)
- `driftDetector.test.ts` - Anti-drift checks (10+ tests)
- `taskEngine.test.ts` - Core engine operations (35+ tests)

**CI/CD**: Automated testing on Node 18 & 20 with GitHub Actions

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Coding standards
- Testing requirements
- Pull request process
- Architecture guidelines

Key areas for contribution:
- **Web Dashboard** - Visual UI for projects
- **Advanced Drift Detection** - Semantic analysis
- **Multi-Agent Orchestration** - Coordinating multiple AI agents
- **External Integrations** - GitHub, Jira, Linear connectors

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Why TaskPilot AI?

> Most AI task tools are thin wrappers around to-do lists.
>
> **TaskPilot AI is an execution system.**

It doesn't just store tasks - it:
- **Prevents drift** with automatic detection
- **Enforces discipline** through state validation
- **Demands evidence** with quality scoring
- **Proves completion** via verifier gates
- **Maintains memory** of all decisions
- **Tracks health** in real-time

**Built for professionals who need AI assistance that doesn't cut corners.**

### Commercial Readiness

- ✅ **60+ tests** with 70-80% coverage
- ✅ **CI/CD pipeline** with automated quality checks
- ✅ **Security documentation** with threat models
- ✅ **Production deployment** guides (Docker/K8s)
- ✅ **Verifier enforcement** prevents bypass
- ✅ **Evidence validation** catches fake completions
- ⚠️ **Web dashboard** (roadmap)

---

## Comparison

| Feature | TaskPilot AI | Jira | Asana | Linear |
|---------|:------------:|:----:|:-----:|:------:|
| Verifier-Gated Completion | ✅ | ❌ | ❌ | ❌ |
| Evidence Validation | ✅ | ❌ | ❌ | ❌ |
| Anti-Drift Detection | ✅ | ❌ | ❌ | ❌ |
| Persistent AI Memory | ✅ | ❌ | ❌ | ❌ |
| State Enforcement | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Open Source | ✅ | ❌ | ❌ | ❌ |
| Self-Hosted | ✅ | ⚠️ | ❌ | ❌ |

See [docs/comparison.md](docs/comparison.md) for detailed analysis.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/jaganmohanraj/taskpilot-ai/issues)

---

Made with discipline. 🎯
