# Changelog

All notable changes to TaskPilot AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-03-31

### Added - Nuclear Upgrade to Commercial Readiness

**Web Dashboard** 🎨
- **Full-Featured Visual Interface**: Interactive web dashboard at http://localhost:3000
- **Express.js REST API**: 15+ endpoints for complete project management
- **Overview Dashboard**: Project cards with health scores, progress bars, status badges
- **Project Detail View**: Comprehensive tabs for Tasks, Memory, Evidence, Audit, Timeline
- **Real-time Health Meters**: Visual indicators for project health and completeness
- **Next Action Display**: AI-powered recommendations prominently featured
- **Interactive Forms**: Create projects with validation and error handling
- **Modern Design**: Professional styling with CSS variables, responsive grids, animations
- **Easy Launch**: `npm run dashboard` starts server immediately
- **Files Added**:
  - `src/server.ts` - Express server with full REST API
  - `public/index.html` - Dashboard HTML structure
  - `public/css/styles.css` - Complete styling system
  - `public/js/app.js` - Interactive frontend application

**Testing & Quality**
- **Comprehensive Test Suite**: 60+ unit and integration tests across verifier, drift detector, and task engine
- **CI/CD Pipeline**: GitHub Actions workflow with testing on Node 18 & 20, coverage reporting, security scanning
- **Test Coverage Thresholds**: 70% branches, 75% functions, 80% lines/statements enforced
- **Jest Configuration**: Full TypeScript support with ESM modules

**Validation & Enforcement**
- **Evidence Validation System**: Quality scoring (0-100) for all evidence entries
- **Suspicious Pattern Detection**: Catches fake evidence like "done", "ok", single words
- **Quality Indicators**: Rewards evidence with screenshots, test results, commits, metrics
- **State Transition Validation**: Enforces legal project and task state transitions
- **Verifier Enforcement**: Projects CANNOT be marked "done" without passing completion audit (CRITICAL SECURITY FIX)
- **Acceptance Criteria Parser**: Validates criteria are testable and measurable

**Documentation**
- **CONTRIBUTING.md**: Complete contributor guide with setup, workflow, coding standards
- **docs/examples.md**: 5 real-world examples (REST API, refactoring, bug fixes, dependencies, meta-usage)
- **docs/security.md**: Comprehensive security documentation with threat models, mitigations, best practices
- **docs/deployment.md**: Production deployment guide (Docker, Kubernetes, monitoring, backup)
- **docs/comparison.md**: Detailed comparison vs Jira, Asana, Linear, Notion, Todoist, AI tools

**Architecture Improvements**
- **validators.ts**: Centralized validation logic for evidence, criteria, state transitions
- **Low-Quality Evidence Detection**: Warns when evidence is insufficient, logs quality issues as memory notes
- **Illegal Transition Prevention**: Throws errors for invalid state changes (draft → done, etc.)

### Changed
- MCP server version bumped to 0.4.0
- Evidence logging now validates quality before acceptance
- Project status updates enforce audit requirements
- Task status updates validate transition legality

### Security
- **Verifier Bypass Prevention**: Cannot mark projects done without audit passing (score 100/100)
- **State Machine Enforcement**: Invalid transitions throw errors and are logged
- **Input Validation**: Evidence and acceptance criteria validated on input
- **SQL Injection Protection**: All queries use parameterized statements (already present, now documented)
- **Audit Trail**: Every state change recorded with reason and timestamp

### Developer Experience
- Test scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`
- Automated formatting with Prettier
- CI pipeline runs on every push/PR
- Security scanning with npm audit and Snyk

### Breaking Changes
- Evidence logging may warn about low quality (non-breaking, warnings only)
- Direct status manipulation will throw errors if transitions are illegal (by design)

## [0.3.0] - 2026-03-31

### Added
- **Anti-Drift Detection System**: Comprehensive drift detection with 5 check types
  - Scope drift (task count monitoring)
  - Goal mismatch (objective validation)
  - Incomplete criteria detection
  - Abandoned task identification
  - Unresolved blocker tracking
- **Enhanced State Machine**: Full lifecycle with 8 project states (draft → done → archived)
- **State History Tracking**: Complete audit trail of all project and task state changes
- **Intelligent Work Breakdown Generator**: Context-aware task generation from acceptance criteria
- **Task Dependency Management**: Tasks can depend on other tasks with automatic validation
- **Enhanced Verifier**: Multi-factor completion audit with drift integration
- **Health Scoring System**: Real-time project health and completeness metrics
- **Audit Trail Persistence**: All audit executions saved with timestamps
- **Enhanced Database Schema**:
  - Added `state_history` table
  - Added `audit_trail` table
  - Added `drift_checks` table
  - Added `project_metrics` table
  - Added health_score, completeness_score, drift_score to projects
  - Added depends_on, completed_at to tasks
  - Added resolved_at to memory_entries
  - Created indexes for performance
- **26 MCP Tools**: Comprehensive tool coverage for all operations
- **3 MCP Prompts**: start_project, closeout_review, check_project_health
- **New MCP Tools**:
  - `get_project` - Retrieve single project
  - `list_memory` - View all memory entries
  - `list_evidence` - View all evidence
  - `get_audit_history` - View audit history
  - `why_not_done` - Get blockers to completion
  - `run_drift_detection` - Execute drift checks
  - `get_drift_checks` - View drift issues
  - `resolve_drift_check` - Mark drift resolved
  - `get_project_timeline` - View state history
- **Enhanced Documentation**:
  - Complete rewrite of README with commercial positioning
  - New architecture.md with detailed system design
  - Updated all existing docs

### Changed
- Project default status changed from 'planned' to 'draft'
- Work breakdown now context-aware based on acceptance criteria
- Completion audit now includes drift detection
- `suggestNextBestAction` returns structured NextAction object
- Tool parameters now include descriptions for better AI discovery
- MCP server version bumped to 0.3.0

### Improved
- Database schema with proper indexes for performance
- Type safety with expanded TypeScript interfaces
- Error handling and validation
- Code organization into focused modules

## [0.2.0] - 2026-03-31

### Added
- Initial MCP server implementation
- Basic project and task management
- Memory and evidence logging
- Basic completion audit
- SQLite persistence
- Core documentation

### Features
- 10 MCP tools
- 2 MCP prompts
- 2 MCP resources
- State machine (basic)
- Verifier-gated completion (basic)

## [0.1.0] - Initial Concept

- Project conception and initial planning
