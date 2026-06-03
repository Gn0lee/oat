# Ledger Record Change Requests Implementation Plan

> **For agentic workers:** Execute with `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Follow the checkboxes in order and keep tests close to each behavior change.

**Goal:** Complete issue #344: let non-owners request updates or deletes for shared ledger records, notify the record owner, and let the owner approve or reject from `/notifications/requests/[id]`.

**Architecture:** `record_change_requests` remains the request ledger. User Notifications are derived messages. Ledger approval uses existing owner-only ledger helpers so balance sync and authorization rules stay aligned with direct edits/deletes.

**Out of Scope:** Result notifications for approval/rejection/cancellation stay in #348. Stock transaction requests stay in #346.

---

## Decisions Captured

- Use **Shared Ledger Record**, not "shared expense", when the target can be expense, income, or transfer.
- Update requests use a form populated from the current ledger record, but save only changed fields in `proposedChanges`.
- Delete requests store the deletion reason in `message`; `proposedChanges` stays `{}`.
- Transfer ledger records cannot be update-requested. They can only be delete-requested.
- Owners cannot edit request values during approval. They approve the request as-is or reject it.
- Approving a delete request hard-deletes the ledger record using the existing balance-sync delete helper.
- A requester can have only one pending request per target record, regardless of request type.
- Duplicate pending requests are handled by server `409` plus toast; no upfront pending-state query is required for the MVP.
- `/notifications/requests/[id]` is the canonical request detail route.

---

## File Structure

- Modify: `supabase/migrations/*`
  - Add a migration that replaces the pending unique index with `(requester_id, target_type, target_id)` where `status = 'pending'`.
- Modify: `schemas/record-change-request.ts`
  - Add ledger-specific `proposedChanges` validation helpers or schemas.
- Modify: `lib/api/record-change-requests.ts`
  - Apply approved ledger update/delete requests.
  - Reject transfer update requests.
  - Reject approval when the target ledger record no longer exists.
- Modify: `lib/api/record-change-requests.test.ts`
  - Cover ledger apply behavior, transfer update rejection, target-missing approval, and pending uniqueness mapping.
- Add or modify: `hooks/use-record-change-requests.ts`
  - Client mutations for create/cancel/resolve and detail fetching.
- Modify: `lib/queries/keys.ts`
  - Add query keys for record change requests.
- Modify: `components/ledger/records/*`
  - Split owner direct actions from non-owner request actions.
- Add: `components/ledger/LedgerEntryChangeRequestDialog.tsx`
  - Update request form and delete request form for shared ledger records.
- Add: `app/(main)/notifications/requests/[id]/page.tsx`
  - Request detail page.
- Add: `components/notifications/RecordChangeRequestDetailClient.tsx`
  - Detail, comparison, approve/reject/cancel UI.
- Add focused tests for row action policy, proposed changes diffing, and request detail action visibility.

---

## Task 1: Tighten Pending Uniqueness

- [ ] Add a migration that drops the old `record_change_requests_pending_unique` index.
- [ ] Recreate it on `(requester_id, target_type, target_id)` with `where status = 'pending'`.
- [ ] Confirm duplicate pending update/delete requests for the same requester and target map to `RECORD_CHANGE_REQUEST_ALREADY_PENDING`.
- [ ] Regenerate Supabase types if migration changes type output.

Expected behavior: one requester cannot have both a pending update request and a pending delete request for the same ledger record.

---

## Task 2: Validate Ledger Proposed Changes

- [ ] Define the allowed ledger update fields:
  - `amount`
  - `title`
  - `categoryId`
  - `fromAccountId`
  - `fromPaymentMethodId`
  - `toAccountId`
  - `toPaymentMethodId`
  - `transactedAt`
  - `memo`
- [ ] Reject `type` and `isShared` in ledger `proposedChanges`.
- [ ] Reject update requests with empty `proposedChanges`.
- [ ] Reject update requests for transfer ledger records.
- [ ] Keep delete requests valid with `{}` proposed changes and a `message`.

Expected behavior: request validation cannot create a request that direct ledger editing would never be able to apply.

---

## Task 3: Apply Approved Ledger Requests

- [ ] Replace the current `applyApprovedRecordChangeRequest` placeholder for `target_type = 'ledger_entry'`.
- [ ] Fetch the current target ledger record before approval.
- [ ] If the target is missing, reject approval with a domain error and keep the request pending.
- [ ] For update requests, call `updateLedgerEntryWithBalanceSync` with `target_owner_id` as the owner id and only allowed proposed fields.
- [ ] For delete requests, call `deleteLedgerEntryWithBalanceSync` with `target_owner_id`.
- [ ] Update the request to `approved` only after the ledger operation succeeds.
- [ ] Keep rejection behavior as status-only with optional `responseMessage`.

Expected behavior: `approved` means the original ledger record change has already been applied.

---

## Task 4: Split Ledger Row Actions

- [ ] Pass `currentUserId` into ledger day list and row components.
- [ ] For owner expense/income records, show `수정` and `삭제`.
- [ ] For owner transfer records, show `삭제` only.
- [ ] For non-owner shared expense/income records, show `수정 요청` and `삭제 요청`.
- [ ] For non-owner shared transfer records, show `삭제 요청` only.
- [ ] Never show request actions for personal records.

Expected behavior: users only see actions they can actually complete.

---

## Task 5: Add Request Creation Dialogs

- [ ] Build an update request form populated from the selected ledger record.
- [ ] Compute a field diff against the original values at submit time.
- [ ] Submit only changed fields in `proposedChanges`.
- [ ] Include an optional request message.
- [ ] Show a validation message if no field changed.
- [ ] Build a delete request mode that asks for a deletion reason.
- [ ] On success, stay on the ledger records page and show a success toast.
- [ ] On `RECORD_CHANGE_REQUEST_ALREADY_PENDING`, show the server message as a toast.

Expected behavior: request creation feels like editing a record, but sends a request instead of mutating the target.

---

## Task 6: Add Request Detail Route

- [ ] Create `/notifications/requests/[id]`.
- [ ] Fetch request detail through `GET /api/record-change-requests/[id]`.
- [ ] Display `target_snapshot` for the request-time target summary.
- [ ] For update requests, display only changed fields as `현재 값 -> 요청 값`.
- [ ] For delete requests, display target summary and deletion reason.
- [ ] If the current target differs from the snapshot, show a short conflict notice but allow approval while the target exists.
- [ ] If the target no longer exists, disable approval and allow rejection.
- [ ] Show owner actions only to `target_owner_id` on pending requests: approve/reject.
- [ ] Show requester action only to `requester_id` on pending requests: cancel.
- [ ] Show terminal requests as read-only.

Expected behavior: notification links land on a complete decision screen.

---

## Task 7: Verification

- [ ] Run schema and API tests for record change requests.
- [ ] Run ledger row/action component tests.
- [ ] Run request detail UI tests.
- [ ] Run `pnpm build`.
- [ ] Manually verify the main happy path:
  - non-owner shared income/expense update request
  - owner approval applies the ledger change
  - non-owner shared transfer only shows delete request
  - duplicate pending request shows toast
  - deleted target disables approval in request detail

