---
name: agent-collab-planner
description: "Use when creating a decision-complete implementation plan for another AI agent to execute from files in tmp/agent-collab, especially when a stronger planning model must make choices so a cheaper or less capable implementer can follow instructions exactly."
---

# Agent Collab Planner

Use `agent-collab-protocol` first. Your job is to remove implementation ambiguity before handing work to an implementer. Do not edit product code.

Planner works after product intent has been challenged with `grill-me` or `grill-with-docs`, or performs that grilling before finalizing a plan when intent is still soft. Use `grill-with-docs` when repo domain docs such as `CONTEXT.md` or ADRs should shape the decision; otherwise use `grill-me`. Record settled decisions in `decisions.md`.

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
- user alignment summary from grilling, including decided scope and rejected alternatives
- relevant existing patterns to follow
- exact implementation sequence
- expected result of each step
- files or subsystems to inspect or change
- TDD test-first steps before implementation steps
- a testing contract naming exact test files, test cases, assertions, and what not to test
- tests and verification commands
- allowed choices, if any
- explicit stop conditions

Avoid open-ended instructions such as "handle appropriately", "follow best practices", or "use existing patterns" unless you name the exact pattern or file to follow.

For code changes, make the plan TDD-friendly by naming the first failing test or test file to create before production code. If a change is not testable first, state why and name the alternate verification.

## Testing Contract

For every planned code change, specify:

- test file path and whether to create or update it
- test name or behavior description
- assertion target at the behavior/API/domain boundary
- fixture or mock strategy, if needed
- expected red failure before implementation
- focused command to run
- cases that must not be tested because they would encode implementation details

Prefer tests that exercise behavior through public APIs, components, server actions, repositories, or domain functions. Do not ask implementers to test styling hooks, selector class names, private implementation details, or incidental DOM structure unless those are the actual contract.

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
  coordination_files_committed: false
```

## Plan Template

```markdown
# Plan: {task title}

## Summary
{What must be built and why.}

## User Alignment
- Grilling source: grill-me | grill-with-docs | already settled by user
- Decided scope:
- Rejected alternatives:
- Durable decisions to record:

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

## Testing Contract
- Test file:
- Test case:
- Assertions:
- Expected red failure:
- Focused command:
- Do not test:

## Stop Conditions
- ...

## Verification
- `command`
```

Before ending, update `handoff.yml` and reread it to confirm the next status, owner, reads, and writes are correct.
