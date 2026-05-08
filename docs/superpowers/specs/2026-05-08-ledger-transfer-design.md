# Ledger Transfer Design

## Context

Issues:

- #250: transfer record API
- #251: transfer record form

The ledger schema already supports `ledger_entry_type = 'transfer'` and has
`from_account_id`, `from_payment_method_id`, `to_account_id`, and
`to_payment_method_id`. The current `/ledger/new` funnel only exposes expense
and income records.

This design adds transfer records for moving money between a user's own stored
locations while keeping prepaid payment methods and gift cards outside total
asset calculations.

## Product Decision

Payment methods remain "how the user paid." They are not total asset accounts.

Some payment methods still need a balance for ledger accuracy:

- `prepaid`: KakaoPay Money, Naver Pay Money, and similar prepaid wallets
- `gift_card`: gift certificates and vouchers
- `cash`: physical cash

These balances are auxiliary balances. They are used to keep spending,
charging, and refunding records accurate, but they are not included in total
assets.

Credit cards and debit cards do not have auxiliary balances.

## Data Model

Add nullable balance fields to `payment_methods`:

- `balance numeric(18, 2)`
- `balance_updated_at timestamptz`

The field is meaningful only for `prepaid`, `gift_card`, and `cash`.
For `credit_card` and `debit_card`, the UI hides the field and API writes
`null`.

Accounts continue to use `accounts.balance` for asset-side balances.
Payment method balances are not included in total asset views or calculations.

## Transfer Semantics

Supported transfers:

- Account to account: decrease source account, increase destination account.
- Account to auxiliary payment method: decrease source account, increase
  destination payment method balance.
- Auxiliary payment method to account: decrease source payment method balance,
  increase destination account.
- Auxiliary payment method to auxiliary payment method: decrease source balance,
  increase destination balance.

Not supported as transfers:

- Account to someone else's account. Record this as an expense.
- Credit card or debit card as a transfer source or destination.

Transfer records have:

- `type = 'transfer'`
- positive `amount`
- no `category_id`
- exactly one source: `from_account_id` or `from_payment_method_id`
- exactly one destination: `to_account_id` or `to_payment_method_id`
- source and destination cannot be the same location
- `is_shared = true` by default

## Expense Semantics

When an expense uses an auxiliary payment method, the ledger records the expense
and decreases that payment method's auxiliary balance.

Credit card and debit card expenses continue to create only the ledger expense
record. Automatic debit-card linked-account withdrawal is out of scope for this
PR.

## API Design

The transfer create path must update balances on the server. The balance update
and `ledger_entries` insert should run as one logical operation so a partial
failure does not leave balances and ledger records inconsistent.

Validation rules:

- User must be a member of the household.
- User can only create records as their own `owner_id`.
- Account IDs must belong to the household.
- Payment method IDs must belong to the household.
- Transfer payment methods must have type `prepaid`, `gift_card`, or `cash`.
- Auxiliary payment method balances cannot go below zero.
- Account balances cannot go below zero when the existing balance is known.

The API should return a clear validation error when a user selects an invalid
source or destination.

## Funnel Design

Update `/ledger/new`:

1. Select privacy.
2. Select type: expense, income, transfer.
3. For expense/income, keep the existing multi-item form.
4. For transfer, show a transfer-specific form.
5. Confirm and save.

The transfer form captures:

- amount
- title
- source
- destination
- date
- memo

Source and destination selectors include:

- accounts
- payment methods whose type is `prepaid`, `gift_card`, or `cash`

They exclude:

- `credit_card`
- `debit_card`

The destination selector must also exclude the currently selected source.

## User-Facing Copy

Show this guidance when creating or editing an auxiliary-balance payment method:

> 이 잔액은 가계부 기록을 정확하게 맞추기 위한 보조잔액이며, 총자산에는 포함되지 않습니다.

Show a shorter variant in the transfer form when a source or destination is an
auxiliary payment method:

> 선불/상품권/현금 잔액은 가계부용 보조잔액이며 총자산에는 포함되지 않습니다.

When users want to send money to another person:

> 타인에게 보낸 돈은 이체가 아니라 지출로 기록해주세요.

## Record Display

Ledger lists should show transfers with a neutral sign and transfer-specific
metadata:

- title
- owner
- source to destination
- amount without income or expense color semantics

Transfers remain excluded from income, expense, and cash-flow summary totals.

## Editing and Deleting

This PR keeps transfer editing conservative:

- Transfer records cannot be edited in place.
- The UI tells users to delete and recreate transfer records when they need to
  change source, destination, amount, or date.

Deleting a transfer must reverse its balance effect. Deleting an expense paid
with an auxiliary payment method must restore the auxiliary balance.

## Testing

Add coverage for:

- transfer payload validation
- filtering transfer-capable payment methods
- account-to-account balance updates
- account-to-auxiliary payment method balance updates
- auxiliary payment method-to-account balance updates
- rejection of credit card and debit card transfer endpoints
- rejection of overdrawing an auxiliary payment method balance
- transfers excluded from ledger summaries
- user-facing auxiliary-balance guidance copy

## Out of Scope

- Including auxiliary payment method balances in total assets
- A separate `prepaid_wallets` table
- Automatic linked-account withdrawal for debit card expenses
- Credit card statement/payment lifecycle
- Budgeting for auxiliary balances
