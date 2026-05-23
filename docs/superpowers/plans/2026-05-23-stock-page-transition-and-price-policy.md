# Stock Page Transition And Price Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make user-facing stock and asset screens stop depending on slow request-time KIS price refresh or transaction-aggregating SSR list queries.

**Architecture:** Keep fast SSR reference data, move only risky page-body work off route transitions, and make stock price results explicitly fresh, stale, or missing. Home becomes a recorded-investment entry point, while asset and stock detail screens retain market valuation with clear stale/missing semantics.

**Tech Stack:** Next.js App Router, React Query, Supabase, Vitest, Testing Library, TypeScript.

---

## File Structure

- Modify `lib/kis/types.ts`: add `status: "fresh" | "stale"` to usable stock price results.
- Modify `lib/api/stock-price.ts`: read fresh and expired cache rows separately, add refresh timeout, return stale fallback rows, and leave absent rows missing.
- Add `lib/api/stock-price.test.ts`: test fresh cache, stale fallback after refresh failure, timeout fallback, and missing price behavior.
- Modify `lib/api/home-summary.ts`: replace `PortfolioSummary` in home with a recorded asset summary shape.
- Modify `lib/api/home-summary.test.ts`: assert home summary no longer contains market value or return rate.
- Modify `app/api/home/summary/route.ts`: remove `getPortfolioSummary()` and build recorded investment from `getHoldings()`.
- Modify `components/home/TotalAssetCard.tsx`: show investment principal and holding count only.
- Modify `components/home/HomePageClient.tsx` and `components/home/HomePageClient.test.tsx`: consume the recorded asset summary and remove market valuation copy.
- Modify `app/api/dashboard/summary/route.ts`, `app/api/dashboard/stocks/route.ts`, `app/api/dashboard/by-risk/route.ts`, and `app/api/dashboard/by-owner/route.ts`: count only missing prices as missing, include stale prices in valuation, and stop replacing missing prices with average purchase price where the value is presented as market valuation.
- Modify `types/index.ts`, `hooks/use-dashboard.ts`, and `hooks/use-stock-analysis.ts`: expose stale price counts to consumers.
- Modify `lib/api/portfolio.ts` so `/assets` valuation follows the same missing/stale policy.
- Modify `app/(main)/assets/stock/holdings/page.tsx`: remove SSR `getHoldings()` and stop rendering the initial total count from server data.
- Modify `components/holdings/HoldingsList.tsx`: replace hand-rolled fetch state with React Query and first-load skeleton/error handling.
- Create `hooks/use-holdings.ts`: centralize `/api/holdings` fetching.
- Create `components/holdings/HoldingsList.test.tsx`: assert loading, empty, error, and rendered-data states.

---

### Task 1: Home Recorded Asset Summary

**Files:**
- Modify: `lib/api/home-summary.ts`
- Modify: `lib/api/home-summary.test.ts`
- Modify: `app/api/home/summary/route.ts`
- Modify: `components/home/TotalAssetCard.tsx`
- Modify: `components/home/HomePageClient.tsx`
- Modify: `components/home/HomePageClient.test.tsx`

- [ ] **Step 1: Write failing home summary tests**

In `lib/api/home-summary.test.ts`, replace the portfolio-oriented home test with recorded asset assertions:

```ts
it("현금흐름과 기록 기반 자산 요약을 합쳐서 홈 요약 데이터를 반환한다", () => {
  const cashFlow = {
    year: 2026,
    month: 4,
    totalIncome: 5_000_000,
    totalSharedExpense: 3_000_000,
    totalPersonalExpense: 800_000,
    totalExpense: 3_800_000,
    balance: 1_200_000,
    savingsRate: 24,
  };

  const assets = {
    holdingCount: 5,
    totalInvested: 110_000_000,
  };

  const result = buildHomeSummary(cashFlow, assets);

  expect(result.cashFlow).toEqual(cashFlow);
  expect(result.assets).toEqual(assets);
  expect(result.year).toBe(2026);
  expect(result.month).toBe(4);
  expect(result.userName).toBe("사용자");
  expect(result.topCategories.items).toEqual([]);
  expect(result.ledgerActivity.hasRecentOwnLedgerActivity).toBe(false);
});

it("가구가 없으면 기록 기반 자산 요약 기본값을 반환한다", () => {
  const result = buildHomeSummary(null, null);

  expect(result.assets.holdingCount).toBe(0);
  expect(result.assets.totalInvested).toBe(0);
});
```

Remove assertions that require `result.portfolio.totalValue` or `result.portfolio.returnRate`.

- [ ] **Step 2: Run home summary tests and verify failure**

Run:

```bash
pnpm test lib/api/home-summary.test.ts
```

Expected: FAIL because `HomeSummary` still exposes `portfolio`, not `assets`.

- [ ] **Step 3: Implement recorded home asset summary type**

Update `lib/api/home-summary.ts`:

```ts
import type {
  LedgerStatsByCategoryResult,
  LedgerStatsSummary,
} from "./ledger-stats";

export interface HomeAssetSummary {
  holdingCount: number;
  totalInvested: number;
}

export interface HomeSummary {
  year: number;
  month: number;
  userName: string;
  cashFlow: LedgerStatsSummary;
  assets: HomeAssetSummary;
  topCategories: LedgerStatsByCategoryResult;
  ledgerActivity: {
    hasRecentOwnLedgerActivity: boolean;
    lastOwnLedgerEntryCreatedAt: string | null;
  };
}

const DEFAULT_CASH_FLOW: LedgerStatsSummary = {
  year: 0,
  month: 0,
  totalIncome: 0,
  totalSharedExpense: 0,
  totalPersonalExpense: 0,
  totalExpense: 0,
  balance: 0,
  savingsRate: 0,
};

const DEFAULT_ASSETS: HomeAssetSummary = {
  holdingCount: 0,
  totalInvested: 0,
};

const DEFAULT_TOP_CATEGORIES: LedgerStatsByCategoryResult = {
  type: "expense",
  scope: "shared",
  total: 0,
  items: [],
};

const DEFAULT_LEDGER_ACTIVITY = {
  hasRecentOwnLedgerActivity: false,
  lastOwnLedgerEntryCreatedAt: null,
};

export function calcSavingsRate(income: number, expense: number): number {
  if (income === 0) return 0;
  return Math.round(((income - expense) / income) * 100);
}

export function buildHomeSummary(
  cashFlow: LedgerStatsSummary | null,
  assets: HomeAssetSummary | null,
  topCategories: LedgerStatsByCategoryResult | null = null,
  ledgerActivity: HomeSummary["ledgerActivity"] | null = null,
  userName = "사용자",
): HomeSummary {
  const cf = cashFlow ?? DEFAULT_CASH_FLOW;

  return {
    year: cf.year,
    month: cf.month,
    userName,
    cashFlow: cf,
    assets: assets ?? DEFAULT_ASSETS,
    topCategories: topCategories ?? DEFAULT_TOP_CATEGORIES,
    ledgerActivity: ledgerActivity ?? DEFAULT_LEDGER_ACTIVITY,
  };
}
```

- [ ] **Step 4: Change home API to avoid `getPortfolioSummary()`**

In `app/api/home/summary/route.ts`, replace the portfolio import:

```ts
import { getHoldings } from "@/lib/api/holdings";
```

Remove:

```ts
import { getPortfolioSummary } from "@/lib/api/portfolio";
```

Add a local helper near the top of the file:

```ts
async function getHomeAssetSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
) {
  const holdings = await getHoldings(supabase, householdId, {
    pagination: { page: 1, pageSize: 1000 },
  });

  return {
    holdingCount: holdings.total,
    totalInvested: holdings.data.reduce(
      (sum, holding) => sum + holding.totalInvested,
      0,
    ),
  };
}
```

Change the `Promise.all` block from `portfolio` to `assets`:

```ts
const [cashFlow, assets, topCategories, ledgerActivity, profileResult] =
  await Promise.all([
    householdId
      ? getLedgerStatsSummary(supabase, householdId, user.id, year, month)
      : null,
    householdId ? getHomeAssetSummary(supabase, householdId) : null,
    householdId
      ? getLedgerStatsByCategory(
          supabase,
          householdId,
          user.id,
          year,
          month,
          "expense",
          "shared",
        )
      : null,
    householdId
      ? getOwnLedgerActivity(supabase, householdId, user.id)
      : null,
    supabase.from("profiles").select("name").eq("id", user.id).single(),
  ]);
```

Pass `assets` into `buildHomeSummary`.

- [ ] **Step 5: Write failing HomePageClient UI test**

In `components/home/HomePageClient.test.tsx`, change the mocked data from `portfolio` to `assets`:

```ts
assets: {
  holdingCount: 4,
  totalInvested: 20_000_000,
},
```

Replace asset assertions:

```ts
expect(screen.getByText("투자원금")).toBeInTheDocument();
expect(screen.getByText("₩20,000,000")).toBeInTheDocument();
expect(screen.getByText("4종목 · 2,000만")).toBeInTheDocument();
expect(screen.queryByText("지금 우리집 자산은")).not.toBeInTheDocument();
expect(screen.queryByText(/수익률/)).not.toBeInTheDocument();
```

- [ ] **Step 6: Run HomePageClient test and verify failure**

Run:

```bash
pnpm test components/home/HomePageClient.test.tsx
```

Expected: FAIL because `HomePageClient` still reads `portfolio` and `TotalAssetCard` still shows market value and return rate.

- [ ] **Step 7: Update home asset UI**

Update `components/home/TotalAssetCard.tsx`:

```tsx
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

interface TotalAssetCardProps {
  holdingCount?: number;
  totalInvested?: number;
  currency?: "KRW" | "USD";
}

export function TotalAssetCard({
  holdingCount = 0,
  totalInvested = 0,
  currency = "KRW",
}: TotalAssetCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm text-gray-500">투자원금</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalInvested, currency)}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            현재 평가금액은 자산 화면에서 확인하세요
          </p>
        </div>
        <Link
          href="/assets"
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white"
        >
          자산 보기
        </Link>
      </div>

      <div className="mt-5 rounded-xl bg-gray-50 p-3 text-sm">
        <p className="text-xs text-gray-500">보유 종목</p>
        <p className="mt-1 font-semibold text-gray-900">{holdingCount}종목</p>
      </div>
    </div>
  );
}
```

Update `components/home/HomePageClient.tsx`:

```tsx
const assets = data?.assets ?? {
  holdingCount: 0,
  totalInvested: 0,
};
```

Change asset hint:

```tsx
const assetHint =
  assets.holdingCount > 0
    ? `${assets.holdingCount}종목 · ${formatCompactNumber(assets.totalInvested)}`
    : "자산을 등록해보세요";
```

Render:

```tsx
<TotalAssetCard
  holdingCount={assets.holdingCount}
  totalInvested={assets.totalInvested}
/>
```

- [ ] **Step 8: Run home tests and typecheck**

Run:

```bash
pnpm test lib/api/home-summary.test.ts components/home/HomePageClient.test.tsx
pnpm type-check
```

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add lib/api/home-summary.ts lib/api/home-summary.test.ts app/api/home/summary/route.ts components/home/TotalAssetCard.tsx components/home/HomePageClient.tsx components/home/HomePageClient.test.tsx
git commit -m "feat: make home asset summary record based"
```

---

### Task 2: Stock Price Fresh/Stale/Missing Policy

**Files:**
- Modify: `lib/kis/types.ts`
- Modify: `lib/api/stock-price.ts`
- Create: `lib/api/stock-price.test.ts`

- [ ] **Step 1: Write stock price policy tests**

Create `lib/api/stock-price.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StockQuery } from "@/lib/kis/types";

const domesticMock = vi.hoisted(() => vi.fn());
const overseasMock = vi.hoisted(() => vi.fn());
const adminUpsertMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/kis/client", () => ({
  MAX_MULTI_STOCKS: 30,
  getDomesticMultiPrice: domesticMock,
  getExchangeCode: (exchange: string) => exchange,
  getOverseasPrice: overseasMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: adminUpsertMock,
    }),
  }),
}));

function createSupabase(rows: unknown[]) {
  return {
    from: (table: string) => {
      if (table === "stock_master") {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [] }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: (_column: string, market: string) => ({
            in: (_column: string, codes: string[]) =>
              Promise.resolve({
                data: rows.filter(
                  (row) =>
                    (row as { market: string }).market === market &&
                    codes.includes((row as { code: string }).code),
                ),
                error: null,
              }),
          }),
        }),
      };
    },
  };
}

describe("getStockPrices", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-23T03:15:00.000Z"));
    domesticMock.mockReset();
    overseasMock.mockReset();
    adminUpsertMock.mockReset();
    adminUpsertMock.mockResolvedValue({ error: null });
  });

  it("returns fresh cached prices without KIS refresh", async () => {
    const { getStockPrices } = await import("./stock-price");
    const supabase = createSupabase([
      {
        market: "KR",
        code: "005930",
        price: 75000,
        change_rate: 1.2,
        fetched_at: "2026-05-23T03:05:00.000Z",
      },
    ]);

    const result = await getStockPrices(
      supabase as never,
      [{ market: "KR", code: "005930" }] satisfies StockQuery[],
    );

    expect(result["KR:005930"]).toMatchObject({
      price: 75000,
      status: "fresh",
    });
    expect(domesticMock).not.toHaveBeenCalled();
  });

  it("returns stale cached price when refresh fails", async () => {
    domesticMock.mockRejectedValue(new Error("kis down"));
    const { getStockPrices } = await import("./stock-price");
    const supabase = createSupabase([
      {
        market: "KR",
        code: "005930",
        price: 74000,
        change_rate: 0.5,
        fetched_at: "2026-05-23T01:00:00.000Z",
      },
    ]);

    const result = await getStockPrices(
      supabase as never,
      [{ market: "KR", code: "005930" }] satisfies StockQuery[],
    );

    expect(result["KR:005930"]).toMatchObject({
      price: 74000,
      status: "stale",
    });
  });

  it("omits price when live refresh fails and no cached row exists", async () => {
    domesticMock.mockRejectedValue(new Error("kis down"));
    const { getStockPrices } = await import("./stock-price");
    const supabase = createSupabase([]);

    const result = await getStockPrices(
      supabase as never,
      [{ market: "KR", code: "005930" }] satisfies StockQuery[],
    );

    expect(result["KR:005930"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run policy tests and verify failure**

Run:

```bash
pnpm test lib/api/stock-price.test.ts
```

Expected: FAIL because `status` does not exist and expired cache rows are discarded.

- [ ] **Step 3: Extend stock price result type**

Update `lib/kis/types.ts`:

```ts
export interface StockPriceResult {
  market: "KR" | "US";
  code: string;
  price: number;
  changeRate: number | null;
  fetchedAt: Date;
  status: "fresh" | "stale";
}
```

- [ ] **Step 4: Split cache lookup into fresh and stale candidates**

In `lib/api/stock-price.ts`, add:

```ts
interface CachedPriceBuckets {
  fresh: Map<string, StockPriceResult>;
  stale: Map<string, StockPriceResult>;
}
```

Replace `getCachedPrices` with:

```ts
async function getCachedPriceBuckets(
  supabase: SupabaseClient<Database>,
  stocks: StockQuery[],
): Promise<CachedPriceBuckets> {
  if (stocks.length === 0) {
    return { fresh: new Map(), stale: new Map() };
  }

  const krCodes = stocks.filter((s) => s.market === "KR").map((s) => s.code);
  const usCodes = stocks.filter((s) => s.market === "US").map((s) => s.code);

  const fetchKrPrices = async (): Promise<StockPriceRow[]> => {
    if (krCodes.length === 0) return [];
    const { data, error } = await supabase
      .from("stock_prices")
      .select("market, code, price, change_rate, fetched_at")
      .eq("market", "KR")
      .in("code", krCodes);
    if (error) {
      console.error("KR cache query error:", error);
      return [];
    }
    return (data ?? []) as StockPriceRow[];
  };

  const fetchUsPrices = async (): Promise<StockPriceRow[]> => {
    if (usCodes.length === 0) return [];
    const { data, error } = await supabase
      .from("stock_prices")
      .select("market, code, price, change_rate, fetched_at")
      .eq("market", "US")
      .in("code", usCodes);
    if (error) {
      console.error("US cache query error:", error);
      return [];
    }
    return (data ?? []) as StockPriceRow[];
  };

  const [krData, usData] = await Promise.all([
    fetchKrPrices(),
    fetchUsPrices(),
  ]);

  const fresh = new Map<string, StockPriceResult>();
  const stale = new Map<string, StockPriceResult>();

  for (const row of [...krData, ...usData]) {
    const fetchedAt = new Date(row.fetched_at);
    const key = createStockKey(row.market as MarketType, row.code);
    const base = {
      market: row.market as "KR" | "US",
      code: row.code,
      price: Number(row.price),
      changeRate: row.change_rate !== null ? Number(row.change_rate) : null,
      fetchedAt,
    };

    if (isCacheValid(fetchedAt)) {
      fresh.set(key, { ...base, status: "fresh" });
    } else {
      stale.set(key, { ...base, status: "stale" });
    }
  }

  return { fresh, stale };
}
```

- [ ] **Step 5: Add refresh timeout helper**

In `lib/api/stock-price.ts`, add near constants:

```ts
const PRICE_REFRESH_TIMEOUT_MS = 2_000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = PRICE_REFRESH_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("PRICE_REFRESH_TIMEOUT"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
```

- [ ] **Step 6: Return stale fallback and missing omissions**

Update `getStockPrices`:

```ts
export async function getStockPrices(
  supabase: SupabaseClient<Database>,
  stocks: StockQuery[],
): Promise<Record<string, StockPriceResult>> {
  if (stocks.length === 0) {
    return {};
  }

  const cached = await getCachedPriceBuckets(supabase, stocks);
  const stocksNeedingRefresh = stocks.filter(
    (s) => !cached.fresh.has(createStockKey(s.market, s.code)),
  );

  if (stocksNeedingRefresh.length === 0) {
    return Object.fromEntries(cached.fresh);
  }

  const domesticCodes = stocksNeedingRefresh
    .filter((s) => s.market === "KR")
    .map((s) => s.code);
  const overseasStocks = stocksNeedingRefresh.filter((s) => s.market === "US");

  let newPrices: StockPriceResult[] = [];

  try {
    const [domesticPrices, overseasPrices] = await withTimeout(
      Promise.all([
        fetchDomesticPrices(domesticCodes),
        fetchOverseasPrices(supabase, overseasStocks),
      ]),
    );
    newPrices = [...domesticPrices, ...overseasPrices].map((price) => ({
      ...price,
      status: "fresh" as const,
    }));
    await upsertPrices(newPrices);
  } catch (error) {
    console.error("Stock price refresh failed:", error);
  }

  const result: Record<string, StockPriceResult> =
    Object.fromEntries(cached.fresh);

  for (const price of newPrices) {
    result[createStockKey(price.market, price.code)] = price;
  }

  for (const stock of stocksNeedingRefresh) {
    const key = createStockKey(stock.market, stock.code);
    if (!result[key] && cached.stale.has(key)) {
      result[key] = cached.stale.get(key) as StockPriceResult;
    }
  }

  return result;
}
```

- [ ] **Step 7: Run stock price tests and typecheck**

Run:

```bash
pnpm test lib/api/stock-price.test.ts
pnpm type-check
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add lib/kis/types.ts lib/api/stock-price.ts lib/api/stock-price.test.ts
git commit -m "feat: add stale stock price fallback"
```

---

### Task 3: Market Valuation Missing/Stale Display Policy

**Files:**
- Modify: `lib/api/portfolio.ts`
- Modify: `app/api/dashboard/summary/route.ts`
- Modify: `app/api/dashboard/stocks/route.ts`
- Modify: `app/api/dashboard/by-risk/route.ts`
- Modify: `app/api/dashboard/by-owner/route.ts`
- Modify: `types/index.ts`
- Modify: `hooks/use-dashboard.ts`
- Modify: `hooks/use-stock-analysis.ts`
- Modify: `components/dashboard/TotalReturnCard.tsx`
- Modify: `components/dashboard/stocks/StockSummarySection.tsx`

- [ ] **Step 1: Write valuation helper tests**

Create `lib/api/valuation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateHoldingValuation } from "./valuation";

describe("calculateHoldingValuation", () => {
  it("uses fresh market price for valuation", () => {
    const result = calculateHoldingValuation(
      { quantity: 2, avgPrice: 900, totalInvested: 1800, currency: "KRW" },
      {
        market: "KR",
        code: "005930",
        price: 1000,
        changeRate: null,
        fetchedAt: new Date(),
        status: "fresh",
      },
      1300,
    );

    expect(result.currentValue).toBe(2000);
    expect(result.isMissingPrice).toBe(false);
    expect(result.isStalePrice).toBe(false);
  });

  it("includes stale price but marks it stale", () => {
    const result = calculateHoldingValuation(
      { quantity: 2, avgPrice: 900, totalInvested: 1800, currency: "KRW" },
      {
        market: "KR",
        code: "005930",
        price: 1000,
        changeRate: null,
        fetchedAt: new Date(),
        status: "stale",
      },
      1300,
    );

    expect(result.currentValue).toBe(2000);
    expect(result.isMissingPrice).toBe(false);
    expect(result.isStalePrice).toBe(true);
  });

  it("does not use average purchase price for missing market valuation", () => {
    const result = calculateHoldingValuation(
      { quantity: 2, avgPrice: 900, totalInvested: 1800, currency: "KRW" },
      undefined,
      1300,
    );

    expect(result.currentPrice).toBeNull();
    expect(result.currentValue).toBe(0);
    expect(result.isMissingPrice).toBe(true);
  });
});
```

- [ ] **Step 2: Run valuation tests and verify failure**

Run:

```bash
pnpm test lib/api/valuation.test.ts
```

Expected: FAIL because the new helper is not wired or file does not exist before creation.

- [ ] **Step 3: Add valuation helper**

Create `lib/api/valuation.ts`:

```ts
import type { StockPriceResult } from "@/lib/kis/types";

export interface ValuationPriceInput {
  quantity: number;
  avgPrice: number;
  totalInvested: number;
  currency: "KRW" | "USD";
}

export interface ValuationPriceResult {
  currentPrice: number | null;
  currentValue: number;
  investedAmount: number;
  isMissingPrice: boolean;
  isStalePrice: boolean;
}

export function calculateHoldingValuation(
  holding: ValuationPriceInput,
  price: StockPriceResult | undefined,
  exchangeRate: number,
): ValuationPriceResult {
  const isUSD = holding.currency === "USD";
  const investedAmount = isUSD
    ? holding.totalInvested * exchangeRate
    : holding.totalInvested;

  if (!price) {
    return {
      currentPrice: null,
      currentValue: 0,
      investedAmount,
      isMissingPrice: true,
      isStalePrice: false,
    };
  }

  const rawCurrentValue = holding.quantity * price.price;

  return {
    currentPrice: price.price,
    currentValue: isUSD ? rawCurrentValue * exchangeRate : rawCurrentValue,
    investedAmount,
    isMissingPrice: false,
    isStalePrice: price.status === "stale",
  };
}
```

- [ ] **Step 4: Wire dashboard and portfolio code to helper**

In each route currently doing:

```ts
const currentPrice = priceData?.price ?? null;
const effectivePrice = currentPrice ?? h.avgPrice;
const rawCurrentValue = h.quantity * effectivePrice;
```

replace with:

```ts
const valuation = calculateHoldingValuation(
  {
    quantity: h.quantity,
    avgPrice: h.avgPrice,
    totalInvested: h.totalInvested,
    currency: h.currency,
  },
  stockPrices[`${h.market}:${h.ticker}`],
  exchangeRate,
);
```

Use:

```ts
if (valuation.isMissingPrice) missingPriceCount++;
if (valuation.isStalePrice) stalePriceCount++;
```

and assign:

```ts
currentPrice: valuation.currentPrice,
currentValue: valuation.currentValue,
investedAmountKRW: valuation.investedAmount,
```

For `lib/api/portfolio.ts`, missing prices contribute `0` to `totalValue` and still contribute to `totalInvested`.

- [ ] **Step 5: Add stale count to response shapes where already returning missing count**

In `app/api/dashboard/summary/route.ts` and `app/api/dashboard/stocks/route.ts`, include:

```ts
stalePriceCount,
```

next to `missingPriceCount`.

Update `types/index.ts`:

```ts
export interface StockAnalysisSummary {
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  returnRate: number;
  holdingCount: number;
  missingPriceCount: number;
  stalePriceCount: number;
}
```

Update `hooks/use-dashboard.ts` response interface:

```ts
interface DashboardSummaryResponse extends DashboardSummary {
  missingPriceCount: number;
  stalePriceCount: number;
  exchangeRate: number;
}
```

- [ ] **Step 6: Update UI labels**

In `components/dashboard/TotalReturnCard.tsx`, add optional prop:

```ts
stalePriceCount?: number;
```

Render below missing warning when count is positive:

```tsx
{stalePriceCount > 0 && (
  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
    <AlertTriangle className="size-3" />
    <span>{stalePriceCount}종목 이전 가격 기준</span>
  </div>
)}
```

In `components/dashboard/stocks/StockSummarySection.tsx`, add a similar message under the missing price warning:

```tsx
{summary.stalePriceCount > 0 && (
  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
    <AlertTriangle className="size-3" />
    <span>{summary.stalePriceCount}종목 이전 가격 기준</span>
  </div>
)}
```

- [ ] **Step 7: Run valuation and affected dashboard tests**

Run:

```bash
pnpm test lib/api/valuation.test.ts
pnpm type-check
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add lib/api/valuation.ts lib/api/valuation.test.ts lib/api/portfolio.ts app/api/dashboard/summary/route.ts app/api/dashboard/stocks/route.ts app/api/dashboard/by-risk/route.ts app/api/dashboard/by-owner/route.ts components/dashboard/TotalReturnCard.tsx components/dashboard/stocks/StockSummarySection.tsx
git commit -m "feat: clarify stale and missing valuation"
```

---

### Task 4: Holdings Page Client Fetch

**Files:**
- Create: `hooks/use-holdings.ts`
- Modify: `app/(main)/assets/stock/holdings/page.tsx`
- Modify: `components/holdings/HoldingsList.tsx`
- Create: `components/holdings/HoldingsList.test.tsx`

- [ ] **Step 1: Add holdings hook**

Create `hooks/use-holdings.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  HoldingsFilters,
  HoldingWithDetails,
} from "@/lib/api/holdings";
import { queries } from "@/lib/queries/keys";
import type { PaginatedResult } from "@/lib/utils/query";

interface UseHoldingsParams {
  filters?: HoldingsFilters;
  page?: number;
  pageSize?: number;
}

async function fetchHoldings({
  filters,
  page = 1,
  pageSize = 20,
}: UseHoldingsParams): Promise<PaginatedResult<HoldingWithDetails>> {
  const params = new URLSearchParams();
  if (filters?.ownerId) params.set("ownerId", filters.ownerId);
  if (filters?.assetType) params.set("assetType", filters.assetType);
  if (filters?.market) params.set("market", filters.market);
  if (filters?.accountId) params.set("accountId", filters.accountId);
  if (filters?.search) params.set("search", filters.search);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const response = await fetch(`/api/holdings?${params.toString()}`);

  if (!response.ok) {
    throw new Error("보유 현황 조회에 실패했습니다.");
  }

  return response.json();
}

export function useHoldings(params: UseHoldingsParams = {}) {
  return useQuery({
    queryKey: queries.holdings.list(params).queryKey,
    queryFn: () => fetchHoldings(params),
    staleTime: 1000 * 60 * 5,
  });
}
```

Update `lib/queries/keys.ts` holdings section so the list query key includes filters and pagination:

```ts
holdings: {
  all: null,
  list: (params?: {
    filters?: {
      ownerId?: string;
      assetType?: string;
      market?: string;
      accountId?: string;
      search?: string;
    };
    page?: number;
    pageSize?: number;
  }) => ({
    queryKey: [params],
  }),
  detail: (id: string) => ({ queryKey: [id] }),
},
```

- [ ] **Step 2: Write HoldingsList tests**

Create `components/holdings/HoldingsList.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHoldings } from "@/hooks/use-holdings";
import { HoldingsList } from "./HoldingsList";

vi.mock("@/hooks/use-holdings", () => ({
  useHoldings: vi.fn(),
}));

describe("HoldingsList", () => {
  const members = [{ id: "user-1", name: "지호" }];
  const accounts = [{ id: "account-1", name: "삼성증권" }];

  it("first load shows skeleton", () => {
    vi.mocked(useHoldings).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
    } as ReturnType<typeof useHoldings>);

    const { container } = render(
      <HoldingsList members={members} accounts={accounts} />,
    );

    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  it("error state is shown when query fails", () => {
    vi.mocked(useHoldings).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error("failed"),
    } as ReturnType<typeof useHoldings>);

    render(<HoldingsList members={members} accounts={accounts} />);

    expect(screen.getByText("보유 현황을 불러오지 못했습니다.")).toBeInTheDocument();
  });

  it("renders holding rows from query data", () => {
    vi.mocked(useHoldings).mockReturnValue({
      data: {
        data: [
          {
            ticker: "005930",
            name: "삼성전자",
            quantity: 10,
            avgPrice: 70000,
            totalInvested: 700000,
            market: "KR",
            currency: "KRW",
            assetType: "equity",
            riskLevel: null,
            firstTransactionAt: null,
            lastTransactionAt: null,
            owner: { id: "user-1", name: "지호" },
            account: { id: "account-1", name: "삼성증권", broker: "samsung" },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as ReturnType<typeof useHoldings>);

    render(<HoldingsList members={members} accounts={accounts} />);

    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("005930")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run HoldingsList tests and verify failure**

Run:

```bash
pnpm test components/holdings/HoldingsList.test.tsx
```

Expected: FAIL because `HoldingsList` still requires `initialData` and does not use `useHoldings`.

- [ ] **Step 4: Remove holdings SSR initial data**

Update `app/(main)/assets/stock/holdings/page.tsx`:

```tsx
import { Plus } from "lucide-react";
import Link from "next/link";
import { HoldingsList } from "@/components/holdings/HoldingsList";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getAccounts } from "@/lib/api/account";
import { getHouseholdWithMembers } from "@/lib/api/household";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HoldingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const householdId = await getUserHouseholdId(supabase, user.id);

  if (!householdId) {
    return (
      <p className="text-center text-gray-500 py-12">
        가구 정보를 찾을 수 없습니다.
      </p>
    );
  }

  const household = await getHouseholdWithMembers(supabase, user.id);
  const members =
    household?.members.map((m) => ({ id: m.userId, name: m.name })) ?? [];

  const accountsData = await getAccounts(supabase, householdId);
  const accounts = accountsData.map((a) => ({ id: a.id, name: a.name }));

  return (
    <>
      <PageHeader
        title="보유 현황"
        backHref="/assets/stock"
        action={
          <Button asChild size="sm">
            <Link href="/assets/stock/transactions/new">
              <Plus className="w-4 h-4 mr-1" />
              거래 추가
            </Link>
          </Button>
        }
      />

      <HoldingsList members={members} accounts={accounts} />
    </>
  );
}
```

- [ ] **Step 5: Update HoldingsList to use hook and show states**

Update `components/holdings/HoldingsList.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useHoldings } from "@/hooks/use-holdings";
import type { HoldingsFilters as Filters } from "@/lib/api/holdings";
import { HoldingsFilters } from "./HoldingsFilters";
import { HoldingsTable } from "./HoldingsTable";

interface Member {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
}

interface HoldingsListProps {
  members: Member[];
  accounts: Account[];
}

function HoldingsListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 rounded-xl bg-gray-200" />
      <Skeleton className="h-64 rounded-xl bg-gray-200" />
    </div>
  );
}

export function HoldingsList({ members, accounts }: HoldingsListProps) {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, error } = useHoldings({
    filters,
    page,
    pageSize: 20,
  });

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <HoldingsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          members={members}
          accounts={accounts}
        />
        <HoldingsListSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <HoldingsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          members={members}
          accounts={accounts}
        />
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            보유 현황을 불러오지 못했습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">총 {data.total}개 종목 보유 중</p>

      <HoldingsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        members={members}
        accounts={accounts}
      />

      <div className={isFetching ? "opacity-50 pointer-events-none" : ""}>
        <HoldingsTable data={data.data} />
      </div>

      {data.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(page - 1)}
                className={
                  page <= 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-4 text-sm text-gray-700">
                {page} / {data.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(page + 1)}
                className={
                  page >= data.totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run holdings tests and typecheck**

Run:

```bash
pnpm test components/holdings/HoldingsList.test.tsx
pnpm type-check
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add hooks/use-holdings.ts lib/queries/keys.ts app/'(main)'/assets/stock/holdings/page.tsx components/holdings/HoldingsList.tsx components/holdings/HoldingsList.test.tsx
git commit -m "feat: fetch holdings list on client"
```

---

### Task 5: Final Verification

**Files:**
- Verify all modified files from Tasks 1-4.

- [ ] **Step 1: Run focused tests**

```bash
pnpm test lib/api/home-summary.test.ts components/home/HomePageClient.test.tsx lib/api/stock-price.test.ts lib/api/valuation.test.ts components/holdings/HoldingsList.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full project tests**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Review route boundaries**

Run:

```bash
rg -n "getPortfolioSummary|getHoldings\\(" app/'(main)'/home app/api/home app/'(main)'/assets/stock/holdings
```

Expected:

- No `getPortfolioSummary` in `app/api/home/summary/route.ts`.
- No `getHoldings` in `app/(main)/assets/stock/holdings/page.tsx`.
- `getHoldings` remains allowed in `app/api/home/summary/route.ts` only for recorded investment summary and in `app/api/holdings/route.ts` for client list fetch.

- [ ] **Step 6: Commit any verification fixes**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "fix: complete stock transition verification"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: Task 1 covers home recorded investment; Task 2 covers fresh/stale/missing and timeout fallback; Task 3 covers missing/stale valuation display policy; Task 4 covers issue 302 holdings-only client fetch; Task 5 covers verification.
- Placeholder scan: no TBD/TODO/fill-in steps remain.
- Type consistency: `HomeSummary.assets`, `StockPriceResult.status`, and `useHoldings` query params are introduced before downstream consumers use them.
