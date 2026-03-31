# TaskPilot AI

TaskPilot AI is an MCP server that turns Copilot-style assistants into disciplined execution systems.

It is designed for one core job: take a user request, create a project, break it down, track it, remember context, collect evidence, and refuse to call it complete until the verifier says it is complete.

## Highlights

- persistent local project memory
- anti-drift state machine
- verifier-gated completion
- evidence logging
- blocker and assumption tracking
- MCP tools, resources, and prompts
- SQLite-backed local durability

## Core workflow

1. `create_project_from_request`
2. `generate_work_breakdown`
3. `create_subtask`
4. `update_task_status`
5. `log_memory`
6. `log_evidence`
7. `run_completion_audit`
8. `close_project_if_verified`

## Tech stack

- TypeScript
- Node.js
- SQLite via `better-sqlite3`
- MCP SDK

## Install

```bash
npm install
npm run build
```

## Run

```bash
npm run dev
```

## MCP setup example

See `mcp.json` and `.vscode/settings.json`.

## Recommended agent behavior

- never skip project creation for a non-trivial task
- never claim completion without evidence
- always run the completion audit before closure
- if the audit fails, continue from the highest-priority unresolved item

## Included docs

- `docs/blueprint.md`
- `docs/roadmap.md`
- `docs/operating-model.md`

## License

MIT
