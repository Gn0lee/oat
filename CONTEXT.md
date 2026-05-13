# oat

Family finance context for tracking household money flow and asset growth in one view.

## Language

**Financial Account**:
A household-managed account that holds or receives money, including both bank accounts and investment accounts.
_Avoid_: Cash-only account, bank-only account

**Bank Account**:
A financial account used for ordinary cash, savings, or deposit balances.
_Avoid_: Cash asset

**Investment Account**:
A financial account used for investments such as stocks, CMA, ISA, or pension products.
_Avoid_: Stock-only account

## Relationships

- A **Financial Account** is either a **Bank Account** or an **Investment Account**.
- A **Household** has zero or more **Financial Accounts**.
- A **Stock Holding** belongs to an **Investment Account**, but an **Investment Account** can exist before it has any **Stock Holdings**.

## Example dialogue

> **Dev:** "If a user has registered only a stock account but no stock holdings yet, should the asset page say there are no financial assets?"
> **Domain expert:** "No. A stock account is still a financial account, even before any holdings are recorded."

## Flagged ambiguities

- "Financial account" was previously easy to read as cash or bank accounts only. Resolved: it means the full set of household-managed accounts, including investment accounts.
