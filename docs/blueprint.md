# TaskPilot AI Blueprint

## Goal

Build an MCP server that provides disciplined execution instead of loose chat behavior.

## Pillars

1. State
2. Memory
3. Verification
4. Anti-drift control
5. Evidence-backed closure

## Entities

- Project
- Task
- MemoryEntry
- EvidenceEntry
- AuditResult

## State machine

Project states:
- planned
- in_progress
- blocked
- needs_review
- done

Task states:
- todo
- in_progress
- blocked
- done

## Verifier rules

A project cannot be closed when:
- there are open tasks
- there are unresolved blockers
- no evidence exists
- acceptance criteria are missing
