---
name: agent-collab-reviewer
description: "Use when reviewing an implementation against tmp/agent-collab/plan.md, checking whether another AI agent followed a document handoff exactly, or writing actionable feedback for an implementer without directly editing code."
---

# Agent Collab Reviewer

Use `agent-collab-protocol` first. Your job is to verify plan compliance, implementation quality, and whether the agreed plan from grilling was faithfully transmitted to implementation. If the implementation or plan feels directionally wrong but the correction depends on product intent, architecture tradeoffs, or domain language, grill the human with `grill-me` or `grill-with-docs` before sending direction back to implementer. Do not edit code.

## Start Conditions

Read `tmp/agent-collab/handoff.yml` first. Review only when:

- `owner_role: reviewer`
- `status: ready_for_review`

Then read:

- `tmp/agent-collab/plan.md`
- `tmp/agent-collab/implementation-report.md`
- `tmp/agent-collab/decisions.md` if present
- the relevant diff and tests
- implementation commits listed in `handoff.yml` or `implementation-report.md`

## Review Priorities

Review in two layers: first complete the mandatory passes below, then use the priority list to rank findings.

## Mandatory Review Passes

Before writing `tmp/agent-collab/review.md`, complete all three passes and record the coverage in the review output. Do not approve if any pass was skipped. If a pass has no findings, say that explicitly.

1. Product/UX pass
   - Check every acceptance criterion, user screenshot, policy decision, visible behavior, copy, signs, formatting, layout, accessibility affordance, and domain expectation.
   - For visual/UI work, inspect the affected components and tests even when the screenshot issue looks obviously fixed.

2. Implementation-quality pass
   - Check module boundaries, formatter/component responsibilities, naming, type safety, unnecessary scope, duplication, local conventions, performance risks, accessibility risks, data integrity, and whether existing helpers were reused instead of reimplemented.
   - Look for superficially correct UI fixes that leave fragile code, unbounded layout regions, over-broad selectors, platform assumptions, or contradictory ownership of business rules.

3. Test/docs consistency pass
   - Check that tests assert behavior rather than incidental Tailwind utility classes, broad DOM selectors, private structure, exact Intl currency spellings, or implementation details unless those are the explicit contract.
   - For policy changes, run targeted text searches for stale examples, old symbols, old terminology, and contradictory comments across docs, comments, tests, `tmp/agent-collab/decisions.md`, and the touched implementation files.
   - Check `implementation-report.md` against the actual diff and verification commands. Flag stale reports after follow-up commits.

The review output must include a `## Review Coverage` section with one bullet for each pass. A review that lacks this section is incomplete.

Check, in order:

1. The implementation satisfies every acceptance criterion in `plan.md`.
2. The plan contains a clear user alignment summary from `grill-me`, `grill-with-docs`, or an already-settled user decision.
3. The implementer did not add unplanned scope, refactors, APIs, schemas, dependencies, or UX behavior.
4. The implementation report shows a test-first TDD loop for code changes, or the plan explicitly justified an alternate verification.
5. The tests follow the plan's testing contract and assert behavior rather than styling hooks, selector classes, private details, or incidental structure.
6. Code quality is consistent with local conventions: naming, module boundaries, error handling, type safety, readability, and reuse of existing helpers.
7. Performance characteristics are acceptable for the touched paths, with no obvious new N+1 queries, excessive renders, avoidable network calls, or unbounded work.
8. Security, data integrity, accessibility, and existing code patterns are preserved.
9. Required implementation commits exist and do not include `tmp/agent-collab/` unless explicitly requested.
10. Any deviation in `implementation-report.md` was explicitly authorized.

Report only issues with high confidence. Do not create speculative cleanup requests.

## Grilling Escalation

Use reviewer-led grilling when:

- the implementation technically follows `plan.md` but the result seems misaligned with product intent
- the plan's `User Alignment` is missing, vague, or contradicted by the code or domain docs
- the right correction requires choosing between product behavior, architecture, terminology, or scope tradeoffs
- a quality concern is real but the desired direction is not obvious enough for a lower-discretion implementer

Use `grill-with-docs` when repo domain docs such as `CONTEXT.md` or ADRs should shape the decision; otherwise use `grill-me`. Ask one question at a time, give your recommended answer, and resolve the decision before writing implementer instructions.

After grilling:

- update `tmp/agent-collab/decisions.md` with durable decisions
- write the agreed direction in `review.md`
- request changes only after converting the decision into concrete implementer instructions
- set `status: changes_requested` and `owner_role: implementer` when the path is clear
- set `status: blocked` and `owner_role: human` only when grilling did not resolve the decision

## Feedback Standard

Feedback must be specific enough for a lower-discretion implementer to apply without redesigning.

Each requested change must include:

- file or behavior location
- observed problem
- expected behavior
- concrete correction
- whether a new or updated test is required, and the exact test file when it is

## Review Output

Write `tmp/agent-collab/review.md` using one of these outcomes.

Approved:

```markdown
# Review

## Result
Approved

## Review Coverage
- Product/UX pass: completed; ...
- Implementation-quality pass: completed; ...
- Test/docs consistency pass: completed; ...

## Notes
- The implementation matches plan.md.
- Reviewed implementation commits: ...
- Reviewer alignment check: no additional grilling needed / grilling completed in decisions.md
```

Changes requested:

```markdown
# Review

## Result
Changes Requested

## Review Coverage
- Product/UX pass: completed; ...
- Implementation-quality pass: completed; ...
- Test/docs consistency pass: completed; ...

## Critical
- [ ] File/location:
      Problem:
      Expected:
      Correction:
      Test:
      Alignment source:

## Important
- [ ] File/location:
      Problem:
      Expected:
      Correction:
      Test:
      Alignment source:
```

Blocked:

```markdown
# Review

## Result
Blocked

## Review Coverage
- Product/UX pass: completed / skipped because ...
- Implementation-quality pass: completed / skipped because ...
- Test/docs consistency pass: completed / skipped because ...

## Questions
- ...
```

## Handoff

If approved:

```yaml
status: approved
owner_role: human
current_request: "Human may push, merge, or request follow-up. Implementation commits are already present."
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

Before ending, update `review.md`, update `handoff.yml`, and reread `handoff.yml` to confirm the next status, owner, reads, and writes are correct.
