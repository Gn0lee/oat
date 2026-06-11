---
name: agent-collab-coordinator
description: "Use when routing a document-based multi-agent workflow in tmp/agent-collab, recovering unclear handoff state, assigning the next role, or summarizing what planner, implementer, reviewer, or human should do next."
---

# Agent Collab Coordinator

Use `agent-collab-protocol` first. This role routes work; it does not plan product behavior, implement code, or review code quality unless the user explicitly assigns another role.

## Inputs

Read:

- `tmp/agent-collab/handoff.yml`
- any files listed in `required_reads`
- `tmp/agent-collab/questions.md` when `status: blocked`

## Responsibilities

- Determine the current state from `handoff.yml`.
- Verify the next owner role is consistent with the status.
- Summarize the next action for the user or next agent.
- Repair obvious handoff metadata mistakes, such as missing `required_reads`, when the intended state is clear from the documents.
- Verify every role handoff has the required role-owned document updates.
- Verify implementation commits are recorded when `status` is `ready_for_review` or `approved`.
- Verify `tmp/agent-collab/` is not staged or committed unless the user explicitly requested it.
- Keep the workflow sequential unless the user explicitly changes the protocol.

## Do Not

- Do not change `plan.md` product decisions.
- Do not implement code.
- Do not approve or reject code quality.
- Do not resolve product or architecture questions without being assigned planner or human authority.

## Routing Table

```text
planning                  -> planner
ready_for_implementation  -> implementer
implementing              -> implementer
ready_for_review          -> reviewer
changes_requested         -> implementer
approved                  -> human
blocked                   -> planner, reviewer, coordinator, or human depending on questions.md
```

## Recovery Rules

- If `handoff.yml` is missing but `plan.md` exists, create a handoff for `ready_for_implementation`.
- If `review.md` has `Changes Requested`, route to `implementer`.
- If `review.md` has `Approved`, route to `human`.
- If `ready_for_review` lacks `implementation-report.md` or implementation commit hashes, route back to `implementer`.
- If `approved` lacks reviewer approval in `review.md`, route back to `reviewer`.
- If documents disagree, write the inconsistency to `questions.md`, set `status: blocked`, and route to `human`.

## Handoff Summary

When asked for status, answer with:

- current status
- owner role
- files the next role must read
- files the next role must write
- exact next instruction
- implementation commits, when present

Before ending, update `handoff.yml` if routing metadata was repaired and reread it to confirm the state is internally consistent.
