---
name: agent-collab-protocol
description: "Use when an agent must coordinate with other AI agents through files in tmp/agent-collab, hand off work between planner, implementer, reviewer, coordinator, or human roles, or follow a document-based multi-agent workflow without network/API communication."
---

# Agent Collab Protocol

Use this as the shared contract for file-based collaboration between any agents. Agents may be Codex, Claude Code, Antigravity, or another tool; the protocol uses roles, not product names.

## Directory

Use this directory in the current worktree:

```text
tmp/agent-collab/
```

The worktree is the task boundary. Do not create issue-specific subdirectories unless the user explicitly asks for that.

## Files

```text
tmp/agent-collab/
├── handoff.yml
├── plan.md
├── questions.md
├── implementation-report.md
├── review.md
└── decisions.md
```

- `handoff.yml`: single source of truth for current status, owner role, required reads, and required writes.
- `plan.md`: decision-complete implementation plan written by `planner`.
- `questions.md`: blocked questions that require planner, reviewer, coordinator, or human input.
- `implementation-report.md`: implementation summary and verification written by `implementer`.
- `review.md`: approval or requested changes written by `reviewer`.
- `decisions.md`: durable decisions that should prevent repeated debate.

## Handoff Schema

Use this shape for `handoff.yml`:

```yaml
task:
  title: ""
  issue: null
  branch: ""
status: planning | ready_for_implementation | implementing | ready_for_review | changes_requested | approved | blocked
owner_role: planner | implementer | reviewer | coordinator | human
last_updated_by:
  agent: ""
  role: planner | implementer | reviewer | coordinator | human
last_updated_at: "YYYY-MM-DDTHH:mm:ssZ"
current_request: ""
required_reads: []
required_writes: []
constraints:
  implementation_mode: sequential
  implementer_may_change_plan: false
```

## State Flow

Normal flow:

```text
planning -> ready_for_implementation -> implementing -> ready_for_review -> approved
```

Review loop:

```text
ready_for_review -> changes_requested -> implementing -> ready_for_review
```

Blocked flow:

```text
any status -> blocked
```

## Collaboration Rules

- Read `handoff.yml` first.
- Act only when `owner_role` matches your role, unless the user explicitly asks you to inspect or recover the workflow.
- Read every path in `required_reads` before doing role work.
- Write only files owned by your role.
- Do not overwrite another role's document except to append clearly marked responses when that file's format allows it.
- Keep implementation sequential by default: one implementer works at a time.
- Treat `implementer_may_change_plan: false` as a hard stop. Implementers may not redesign; they must ask.
- If required inputs are missing, create or update `questions.md`, set `status: blocked`, and set `owner_role` to the role that can answer.

## Status Updates

When handing off, update `handoff.yml` with:

- the next `status`
- the next `owner_role`
- `last_updated_by.agent`
- `last_updated_by.role`
- `last_updated_at`
- a concrete `current_request`
- exact `required_reads` and `required_writes`
