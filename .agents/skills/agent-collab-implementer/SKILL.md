---
name: agent-collab-implementer
description: "Use when implementing code from a plan in tmp/agent-collab, applying reviewer feedback, or acting as a lower-discretion execution agent that must follow planner and reviewer documents exactly instead of redesigning the work."
---

# Agent Collab Implementer

Use `agent-collab-protocol` first. Your job is execution, not redesign.

## Start Conditions

Read `tmp/agent-collab/handoff.yml` first. Work only when:

- `owner_role: implementer`
- `status` is `ready_for_implementation` or `changes_requested`

If those are not true, do not implement. Report the mismatch or update `questions.md` only if asked to recover the workflow.

## Required Reads

Read every path in `required_reads`.

Usually this includes:

- `tmp/agent-collab/plan.md`
- `tmp/agent-collab/review.md` when `status: changes_requested`
- `tmp/agent-collab/decisions.md` if present

## Hard Rules

- Follow `plan.md` exactly.
- Use TDD for code changes: write or update the planned failing test before production code, run it, implement the minimum change, then rerun it.
- Commit product code changes before handing off for review.
- Keep `tmp/agent-collab/` coordination files out of implementation commits unless the user explicitly asks otherwise.
- When addressing reviewer feedback, create a new follow-up commit for the change set instead of amending the prior implementation commit unless explicitly directed.
- Do not add scope, features, refactors, dependency changes, or architectural changes that are not requested.
- Do not choose between competing designs.
- Do not silently change APIs, schemas, filenames, validation behavior, or UX beyond the plan.
- If a better approach appears, stop and ask; do not implement it.
- If the plan conflicts with code reality, stop and ask.
- If a required file, command, or dependency is missing, stop and ask.
- If the plan omits a test-first path for a code change, stop and ask unless the plan explicitly says the change is not testable first.

## TDD Workflow

For each planned code change:

1. Create or update the test named in `plan.md`.
2. Run the smallest relevant test command.
3. Confirm the test fails for the expected reason.
4. Implement the smallest production change needed.
5. Rerun the focused test until it passes.
6. Run the broader verification commands from `plan.md`.

Do not skip the red step. If the test unexpectedly passes before implementation, stop and ask because the plan or test target may be wrong.

Use only the tests specified in the plan's testing contract unless reviewer or human instructions add more. Do not create tests that assert selector class names, private implementation details, or incidental markup unless the plan explicitly identifies that as the public contract.

## Commit Workflow

Before setting `status: ready_for_review`:

1. Inspect the diff and staged files.
2. Stage only implementation files that belong in the repository.
3. Do not stage `tmp/agent-collab/` by default.
4. Create a focused commit describing the implemented slice or review fix.
5. Record the commit hash in `implementation-report.md`.
6. Add the commit hash to `handoff.yml` under `artifacts.implementation_commits`.

If there are unrelated pre-existing changes in the worktree, do not include them in the commit. If clean staging is impossible, stop and ask.

## Blocked Flow

When blocked:

1. Append a clear entry to `tmp/agent-collab/questions.md`.
2. Update `handoff.yml`:

```yaml
status: blocked
owner_role: planner
current_request: "Answer the blocker in questions.md, then update the handoff."
required_reads:
  - tmp/agent-collab/questions.md
required_writes:
  - tmp/agent-collab/plan.md
  - tmp/agent-collab/handoff.yml
```

Use `owner_role: human` only when the question is about product intent, scope, credentials, approvals, or external state.

## Completion Report

After implementation, write `tmp/agent-collab/implementation-report.md`:

```markdown
# Implementation Report

## Completed
- ...

## Verification
- `focused red command`: failed as expected / not applicable with reason
- `focused green command`: pass/fail
- `broader command`: pass/fail

## Commits
- `hash`: summary

## Deviations From Plan
- None

## Blockers
- None
```

If anything differed from the plan, record it under `Deviations From Plan`. Deviations should be rare and must be justified by explicit planner, reviewer, or human direction.

## Review Handoff

When ready for review, set:

```yaml
status: ready_for_review
owner_role: reviewer
current_request: "Review implementation against plan.md and implementation-report.md."
required_reads:
  - tmp/agent-collab/plan.md
  - tmp/agent-collab/implementation-report.md
required_writes:
  - tmp/agent-collab/review.md
  - tmp/agent-collab/handoff.yml
constraints:
  implementation_mode: sequential
  implementer_may_change_plan: false
  coordination_files_committed: false
```

Before ending, reread `handoff.yml` and confirm that `implementation-report.md`, commit hashes, status, owner role, reads, and writes match the actual handoff.
