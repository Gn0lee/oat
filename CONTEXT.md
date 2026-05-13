# oat

oat is a household money-flow context that connects day-to-day ledger records with long-term asset growth.

## Language

**Ledger Entry**:
A household money-flow record for an expense, income, or transfer.
_Avoid_: transaction

**Payment Method**:
A way to pay for an expense, such as a card, prepaid wallet, gift card, or cash.
_Avoid_: account

**Account**:
A place where money is held, grouped as either a bank account or an investment account.

**Bank Account**:
An account used for ordinary household cash flow.

**Investment Account**:
An account used for investing, not for direct expense payment.

**Payment Source**:
The source of money for an expense; either a payment method or a bank account.
_Avoid_: payment method when bank accounts are also included

**Income Destination**:
The destination where income is received; either a bank account or an investment account.

## Relationships

- A **Ledger Entry** has exactly one type: expense, income, or transfer.
- An expense **Ledger Entry** may have one **Payment Source**.
- An income **Ledger Entry** may have one **Income Destination**.
- A **Payment Source** is either one **Payment Method** or one **Bank Account**.
- An **Income Destination** is either one **Bank Account** or one **Investment Account**.
- An **Investment Account** is excluded from expense **Payment Sources**.
- Moving money into or out of an **Investment Account** is represented as a transfer, not an expense payment.

## Example Dialogue

> **Dev:** "Can users select a brokerage account when recording a grocery expense?"
> **Domain expert:** "No. Grocery expenses can use a card, prepaid wallet, cash, or bank account. A brokerage account movement should be recorded as a transfer."

> **Dev:** "Can users select a brokerage account when recording dividend income?"
> **Domain expert:** "Yes. Dividend income can be received into an investment account."

## Flagged Ambiguities

- "결제수단" was used to mean both **Payment Method** and **Payment Source**. Resolved: when bank accounts are included, the canonical term is **Payment Source**.
