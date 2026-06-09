---
name: agent-collab-planner
description: "Use when creating a decision-complete implementation plan for another AI agent to execute from files in tmp/agent-collab, especially when a stronger planning model must make choices so a cheaper or less capable implementer can follow instructions exactly."
---

# Agent Collab Planner

Use `agent-collab-protocol` first. Your job is to remove implementation ambiguity before handing work to an implementer. Do not edit product code.

## Inputs

Read:

- `tmp/agent-collab/handoff.yml` if it exists
- `tmp/agent-collab/questions.md` if continuing from `blocked`
- relevant issue, project docs, and code patterns
- `tmp/agent-collab/decisions.md` if it exists

## Output Files

Write:

- `tmp/agent-collab/plan.md`
- `tmp/agent-collab/questions.md` only when planner cannot decide safely
- `tmp/agent-collab/decisions.md` when a durable decision is confirmed
- `tmp/agent-collab/handoff.yml`

## Planning Standard

Write the plan so an implementer does not need to choose architecture, scope, APIs, filenames, validation behavior, or test strategy.

Include:

- goal and non-goals
- acceptance criteria
- relevant existing patterns to follow
- exact implementation sequence
- expected result of each step
- files or subsystems to inspect or change
- TDD test-first steps before implementation steps
- tests and verification commands
- allowed choices, if any
- explicit stop conditions

Avoid open-ended instructions such as "handle appropriately", "follow best practices", or "use existing patterns" unless you name the exact pattern or file to follow.

For code changes, make the plan TDD-friendly by naming the first failing test or test file to create before production code. If a change is not testable first, state why and name the alternate verification.

## Stop Conditions

Do not hand off to implementation if:

- product behavior is ambiguous
- multiple incompatible implementation approaches remain
- required repo facts cannot be found
- the user must choose scope or tradeoffs

Instead, write the issue to `questions.md`, set `status: blocked`, and set `owner_role` to `human`, `planner`, or `coordinator` as appropriate.

## Handoff

When the plan is ready, set:

```yaml
status: ready_for_implementation
owner_role: implementer
current_request: "Implement plan.md exactly; if the plan conflicts with code reality, stop and write questions.md."
required_reads:
  - tmp/agent-collab/plan.md
  - tmp/agent-collab/decisions.md
required_writes:
  - tmp/agent-collab/implementation-report.md
  - tmp/agent-collab/handoff.yml
constraints:
  implementation_mode: sequential
  implementer_may_change_plan: false
```

## Plan Template

```markdown
# Plan: {task title}

## Summary
{What must be built and why.}

## Acceptance Criteria
- ...

## Non-Goals
- ...

## Implementation Steps
1. Write or update the failing test: ...
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the minimum production change.
4. Run the focused test and confirm it passes.
5. Refactor only within the planned scope.

## Stop Conditions
- ...

## Verification
- `command`
```
