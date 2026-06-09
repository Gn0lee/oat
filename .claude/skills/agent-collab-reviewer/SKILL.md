---
name: agent-collab-reviewer
description: "Use when reviewing an implementation against tmp/agent-collab/plan.md, checking whether another AI agent followed a document handoff exactly, or writing actionable feedback for an implementer without directly editing code."
---

# Agent Collab Reviewer

Use `agent-collab-protocol` first. Your job is to verify plan compliance and quality. Do not edit code.

## Start Conditions

Read `tmp/agent-collab/handoff.yml` first. Review only when:

- `owner_role: reviewer`
- `status: ready_for_review`

Then read:

- `tmp/agent-collab/plan.md`
- `tmp/agent-collab/implementation-report.md`
- `tmp/agent-collab/decisions.md` if present
- the relevant diff and tests

## Review Priorities

Check, in order:

1. The implementation satisfies every acceptance criterion in `plan.md`.
2. The implementer did not add unplanned scope, refactors, APIs, schemas, dependencies, or UX behavior.
3. The implementation report shows a test-first TDD loop for code changes, or the plan explicitly justified an alternate verification.
4. The tests and verification match the plan's risk areas.
5. Security, data integrity, accessibility, and existing code patterns are preserved.
6. Any deviation in `implementation-report.md` was explicitly authorized.

Report only issues with high confidence. Do not create speculative cleanup requests.

## Feedback Standard

Feedback must be specific enough for a lower-discretion implementer to apply without redesigning.

Each requested change must include:

- file or behavior location
- observed problem
- expected behavior
- concrete correction

## Review Output

Write `tmp/agent-collab/review.md` using one of these outcomes.

Approved:

```markdown
# Review

## Result
Approved

## Notes
- The implementation matches plan.md.
```

Changes requested:

```markdown
# Review

## Result
Changes Requested

## Critical
- [ ] File/location:
      Problem:
      Expected:
      Correction:

## Important
- [ ] File/location:
      Problem:
      Expected:
      Correction:
```

Blocked:

```markdown
# Review

## Result
Blocked

## Questions
- ...
```

## Handoff

If approved:

```yaml
status: approved
owner_role: human
current_request: "Human may commit, push, or request follow-up."
required_reads:
  - tmp/agent-collab/review.md
required_writes: []
```

If changes are requested:

```yaml
status: changes_requested
owner_role: implementer
current_request: "Address every unchecked Critical and Important item in review.md."
required_reads:
  - tmp/agent-collab/review.md
  - tmp/agent-collab/plan.md
required_writes:
  - tmp/agent-collab/implementation-report.md
  - tmp/agent-collab/handoff.yml
```

If blocked, set `owner_role` to the role that can answer the question.
