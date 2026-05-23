# Stock Page Transition And Price Policy Design

## Purpose

Issues 301 and 302 share one user-facing goal: stock and asset screens should not feel blocked by KIS price refresh, expensive valuation, or large stock-list queries. This design keeps that goal narrow and excludes cron/prewarm jobs, market-state cache validity, and broad stock page rewrites.

## Scope

Issue 301 covers request-time stock price behavior and the home asset summary.

- Home must not present market-sensitive portfolio valuation as its primary asset signal.
- Home summary should use recorded investment and holding count, not `getPortfolioSummary()`.
- Stock price lookup should distinguish fresh, stale, and missing prices.
- Expired cached prices should be returned as stale fallback when live refresh fails or times out.
- Missing means no usable live price and no cached fallback row.

Issue 302 covers only SSR lookups that are likely to delay route transitions.

- `/assets/stock/holdings` should remove SSR `initialData` because the `holdings` view aggregates transactions with `group by`.
- `/assets/stock/transactions` should keep its current shape because the transaction list is already client fetched.
- `/assets/stock/settings` should keep SSR initial data because it is a bounded page query against `household_stock_settings`.
- Small reference data such as household members, accounts, and current user id can remain SSR.

## Data Flow

Home summary should fetch ledger/home data as it does today, but replace portfolio valuation with a recorded investment summary derived from holdings or transactions without KIS price lookup. The home UI should show investment principal and holding count, then link to asset detail screens for valuation.

Price lookup should read cached rows separately from freshness filtering. Fresh cached rows are returned immediately. Expired cached rows trigger a live refresh attempt with a short timeout. If refresh succeeds, fresh prices replace stale rows and are upserted. If refresh fails or times out, expired cached rows return with stale status. If no cached row exists and refresh fails, the result is missing.

The holdings page should render its route shell, header, and SSR reference filters immediately. Its list body should fetch `/api/holdings` on the client and show loading, empty, and error states.

## Display Policy

Home:

- Show recorded investment and holding count.
- Do not show total market value, return amount, return rate, or price freshness status.

Asset and stock detail screens:

- May show market-sensitive valuation.
- Include stale prices in valuation when clearly marked.
- Do not silently replace missing prices with average purchase price in a value that is presented as market valuation.
- Surface missing prices clearly where valuation is shown.

## Exclusions

- No cron or prewarm job.
- No market open/closed/holiday freshness model.
- No extended-hours stock market model.
- No broad conversion of simple bounded SSR queries to client fetch.
- No implementation of issue 302 beyond the holdings page in this work; any additional SSR query requires a separate measurement result showing route-transition risk.

## Verification

- Unit tests for price cache freshness, stale fallback, timeout fallback, and missing price behavior.
- Tests or type coverage for home summary shape and home asset UI copy.
- Component behavior for holdings loading, empty, and error states.
- Project typecheck and relevant test suite should pass before completion.
