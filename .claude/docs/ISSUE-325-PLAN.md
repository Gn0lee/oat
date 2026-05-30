# Issue 325 Plan: Separate Shared And Personal Ledger Flows

## Decision

공용 장부와 내 개인 장부는 같은 구조의 별도 데이터셋입니다. 앱과 MCP는 두 장부를 전환해 보여줄 수 있지만, 수입, 지출, 잔액, 저축률을 서로 합산하지 않습니다.

## Domain Rules

- `shared`: 공용 수입, 공용 지출, 공용 이체
- `personal`: 로그인한 본인의 개인 수입, 개인 지출, 개인 이체
- 배우자/파트너의 개인 장부는 상세 내역과 합계를 모두 노출하지 않습니다.
- 용돈 지급은 공용 장부의 지출로 기록합니다.
- 받은 용돈은 개인 장부의 수입으로 기록할 수 있습니다.
- 용돈 사용은 개인 장부의 지출로 기록합니다.
- 공용 장부와 개인 장부를 합산하지 않으므로 용돈 지급과 용돈 사용은 이중 집계되지 않습니다.

## API Shape

Monthly summary responses should use this shape:

```ts
{
  year: number;
  month: number;
  shared: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;
  };
  personal: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;
  };
}
```

Do not expose a combined `total` cash-flow summary.

## Implementation Plan

1. Replace ledger summary aggregation
   - Update `lib/api/ledger-stats.ts` to aggregate `shared` and current-user `personal` separately.
   - Remove all calls to `get_private_entry_totals`.
   - Keep transfer entries out of income, expense, balance, and savings-rate calculations.

2. Update home
   - Replace the single cash-flow card with a manual carousel.
   - First card: `공용 현금흐름`.
   - Second card: `내 현금흐름`.
   - Remove `FamilyExpenseCard` and all `개인 합산` UI.
   - Reset to the shared card when entering home.
   - Do not auto-rotate the carousel.

3. Update ledger main and records
   - `/ledger` summary should use the shared/personal separated summary.
   - `/ledger/records` should add `공용 기록` and `내 기록` tabs.
   - Calendar, day list, and top summary should filter by the selected scope.
   - Shared tab shows shared cash flow.
   - Personal tab shows personal cash flow.

4. Update ledger analysis
   - Keep default scope as `shared`.
   - Ensure summary, category, payment-method, trend, and daily screens use only the selected scope.
   - Personal scope should show personal income, expense, balance, and savings rate from current-user personal records only.
   - Member analysis remains shared-only.

5. Update MCP
   - `get_ledger_stats` returns separated `summary.shared` and `summary.personal`.
   - `get_financial_overview` returns separated `cashFlow.shared` and `cashFlow.personal`.
   - Do not return combined cash-flow totals.
   - Add client-facing metadata explaining that shared and personal ledgers are not additive and partner personal ledgers are excluded.

6. Remove deprecated private-total access
   - Add a Supabase migration dropping `public.get_private_entry_totals`.
   - Remove references from generated types only through the normal Supabase type-generation flow.

7. Tests
   - Add regression tests showing personal entries do not change shared cash flow.
   - Add tests showing partner personal entries are not included in app or MCP summaries.
   - Update home, ledger records, ledger analysis, and MCP tests for the new response shape.

## Out Of Scope

- 공용에서 개인으로 보내는 전용 이체 UX.
- 용돈 입금 빠른 액션.
- 과거 데이터 자동 보정.
- 캐러셀 시각 디자인 고도화.
