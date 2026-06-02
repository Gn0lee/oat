# OAT Domain Context

OAT tracks household money flow and asset growth for connected household members. This context records the shared language for ledger, asset, notification, and collaboration workflows.

## Language

**Household**:
A group of users who can share selected financial records.

**Ledger Record**:
A user-entered money movement in the household ledger, including expense, income, or transfer.
_Avoid_: Expense when referring to all ledger record types.

**Shared Ledger Record**:
A ledger record visible to all household members.
_Avoid_: Shared expense when the record may be income or transfer.

**Personal Ledger Record**:
A ledger record visible only to its owner.
_Avoid_: Personal expense when the record may be income or transfer.

**Transfer Ledger Record**:
A ledger record that moves money between two household money sources.

**Record Change Request**:
A request from a non-owner asking the owner of a shared record to update or delete it.
_Avoid_: Collaboration request when referring to the concrete request object.

## Relationships

- A **Household** has one or more users.
- A **Ledger Record** belongs to exactly one owner.
- A **Shared Ledger Record** belongs to one owner but is visible to all members of the same **Household**.
- A **Personal Ledger Record** belongs to one owner and is visible only to that owner.
- A **Transfer Ledger Record** is deleted and recreated when its movement details need to change.
- A **Ledger Record** keeps its original record type and sharing scope when edited.
- A **Record Change Request** targets one shared record and has one requester and one target owner.
- A requester can have at most one pending **Record Change Request** for the same target record.

## Example Dialogue

> **Dev:** "Can a household member request a change to another member's personal ledger record?"
> **Domain expert:** "No. Only shared ledger records are visible across the household, so only shared ledger records can be requested for change."

> **Dev:** "Can a transfer ledger record be edited through a change request?"
> **Domain expert:** "No. Transfer ledger records are deleted and recreated when their movement details are wrong."

> **Dev:** "Can the same member send both an update request and a delete request for the same shared ledger record?"
> **Domain expert:** "No. They must resolve or cancel the pending record change request before sending another one."

## Flagged Ambiguities

- "Shared expense" was used for the broader ledger privacy model. Resolved: use **Shared Ledger Record** unless the concept specifically excludes income and transfer records.
