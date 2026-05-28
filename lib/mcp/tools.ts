import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { getPaymentMethods } from "@/lib/api/payment-method";
import { getPortfolioSummary } from "@/lib/api/portfolio";
import type { Database } from "@/types";
import type { McpAuthContext } from "./auth";

export const MAX_LEDGER_ENTRIES = 100;
export const DEFAULT_LEDGER_ENTRIES_LIMIT = 50;
export const MAX_STATS_MONTHS = 12;

export const MCP_TOOL_DEFINITIONS = [
  {
    name: "get_context",
    description:
      "현재 oat MCP 연결의 사용자, 가구, 권한, privacy 모델을 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_financial_overview",
    description: "이번 달 현금흐름과 현재 자산/주식 요약을 함께 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "YYYY-MM-DD" },
        to: { type: "string", description: "YYYY-MM-DD" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_references",
    description: "가구원, 카테고리, 계좌, 결제수단 참조 목록을 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "search_ledger_entries",
    description:
      "가계부 상세 내역을 조회합니다. 파트너 개인 지출 상세는 제외됩니다.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "YYYY-MM-DD" },
        to: { type: "string", description: "YYYY-MM-DD" },
        query: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: MAX_LEDGER_ENTRIES },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_ledger_stats",
    description:
      "가계부 요약, 멤버별, 카테고리별, 결제수단별 집계를 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "number" },
        month: { type: "number" },
        months: { type: "number", minimum: 1, maximum: MAX_STATS_MONTHS },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_asset_snapshot",
    description: "총자산, 주식 보유, 자산 배분과 수익률 snapshot을 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {
        includeHoldings: { type: "boolean" },
        includeAllocation: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
] as const;

export type McpToolName = (typeof MCP_TOOL_DEFINITIONS)[number]["name"];

export interface McpPeriod {
  from: string;
  to: string;
}

type LooseSupabaseClient = SupabaseClient<Database>;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcMonth(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}

function endOfUtcMonth(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 0, 0, 0, 0),
  );
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

export function normalizeMcpPeriod(
  input: { from?: string; to?: string },
  now = new Date(),
): McpPeriod {
  if (!input.from && !input.to) {
    return {
      from: toDateOnly(startOfUtcMonth(now)),
      to: toDateOnly(endOfUtcMonth(now)),
    };
  }

  const to = input.to ? new Date(`${input.to}T00:00:00.000Z`) : now;
  const toMonthStart = startOfUtcMonth(to);
  const minFrom = addUtcMonths(toMonthStart, -(MAX_STATS_MONTHS - 1));
  const requestedFrom = input.from
    ? new Date(`${input.from}T00:00:00.000Z`)
    : toMonthStart;
  const from = requestedFrom < minFrom ? minFrom : requestedFrom;

  return {
    from: toDateOnly(from),
    to: toDateOnly(to),
  };
}

export function clampLedgerLimit(limit: unknown): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_LEDGER_ENTRIES_LIMIT;
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_LEDGER_ENTRIES);
}

export function buildMcpMeta({
  period,
  scopes,
}: {
  period: McpPeriod | null;
  scopes: string[];
}) {
  return {
    period,
    scope: scopes,
    privacy: {
      included: ["shared ledger details", "own private ledger details"],
      aggregatedOnly: ["partner private expenses"],
      excluded: ["partner private expense details"],
    },
    limits: {
      maxLedgerEntries: MAX_LEDGER_ENTRIES,
      maxStatsMonths: MAX_STATS_MONTHS,
    },
  };
}

export function isLedgerEntryVisibleToMcp({
  ownerId,
  isShared,
  currentUserId,
}: {
  ownerId: string;
  isShared: boolean;
  currentUserId: string;
}): boolean {
  return isShared || ownerId === currentUserId;
}

function hasAnyScope(auth: McpAuthContext, scopes: string[]): boolean {
  return scopes.some((scope) => auth.scopes.includes(scope));
}

function requireScope(auth: McpAuthContext, scopes: string[]) {
  if (!hasAnyScope(auth, scopes)) {
    throw new APIError("MCP_FORBIDDEN", "MCP tool 권한이 없습니다.", 403);
  }
}

function periodToIsoRange(period: McpPeriod): { from: string; to: string } {
  const to = new Date(`${period.to}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 1);

  return {
    from: `${period.from}T00:00:00.000Z`,
    to: to.toISOString(),
  };
}

function getYearMonth(args: Record<string, unknown>, now = new Date()) {
  const year = typeof args.year === "number" ? args.year : now.getUTCFullYear();
  const month =
    typeof args.month === "number" ? args.month : now.getUTCMonth() + 1;

  return { year, month };
}

async function fetchMembers(
  supabase: LooseSupabaseClient,
  householdId: string,
) {
  const { data: members, error } = await supabase
    .from("household_members")
    .select("user_id, role")
    .eq("household_id", householdId);

  if (error) {
    throw new APIError("MCP_FETCH_ERROR", "가구원 조회에 실패했습니다.", 500);
  }

  const userIds = [...new Set((members ?? []).map((member) => member.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds)
      : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (members ?? []).map((member) => {
    const profile = profileMap.get(member.user_id);
    return {
      id: member.user_id,
      name: profile?.name ?? "알 수 없음",
      email: profile?.email ?? null,
      role: member.role,
    };
  });
}

async function getContext(supabase: LooseSupabaseClient, auth: McpAuthContext) {
  requireScope(auth, ["read:overview"]);

  const [{ data: profile }, { data: household }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", auth.userId)
      .maybeSingle(),
    supabase
      .from("households")
      .select("id, name")
      .eq("id", auth.householdId)
      .maybeSingle(),
  ]);

  return {
    meta: buildMcpMeta({ period: null, scopes: auth.scopes }),
    summary: {
      server: "oat MCP",
      version: "v0",
      mode: "read-only",
    },
    data: {
      user: profile,
      household,
      capabilities: MCP_TOOL_DEFINITIONS.map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
    },
  };
}

async function listReferences(
  supabase: LooseSupabaseClient,
  auth: McpAuthContext,
) {
  requireScope(auth, ["read:references"]);

  const [members, { data: categories }, { data: accounts }, paymentMethods] =
    await Promise.all([
      fetchMembers(supabase, auth.householdId),
      supabase
        .from("categories")
        .select("id, type, name, icon, display_order, is_system")
        .eq("household_id", auth.householdId)
        .order("display_order", { ascending: true }),
      supabase
        .from("accounts")
        .select(
          "id, owner_id, name, broker, account_type, category, balance, balance_updated_at",
        )
        .eq("household_id", auth.householdId)
        .order("created_at", { ascending: false }),
      getPaymentMethods(supabase as SupabaseClient<Database>, auth.householdId),
    ]);

  const memberMap = new Map(members.map((member) => [member.id, member.name]));

  return {
    meta: buildMcpMeta({ period: null, scopes: auth.scopes }),
    summary: {
      memberCount: members.length,
      categoryCount: (categories ?? []).length,
      accountCount: (accounts ?? []).length,
      paymentMethodCount: paymentMethods.length,
    },
    data: {
      members,
      categories: categories ?? [],
      accounts: (accounts ?? []).map((account) => ({
        ...account,
        ownerName: memberMap.get(account.owner_id) ?? "알 수 없음",
      })),
      paymentMethods,
    },
  };
}

async function searchLedgerEntries(
  supabase: LooseSupabaseClient,
  auth: McpAuthContext,
  args: Record<string, unknown>,
) {
  requireScope(auth, ["read:ledger"]);

  const period = normalizeMcpPeriod({
    from: typeof args.from === "string" ? args.from : undefined,
    to: typeof args.to === "string" ? args.to : undefined,
  });
  const { from, to } = periodToIsoRange(period);
  const limit = clampLedgerLimit(args.limit);

  const query = supabase
    .from("ledger_entries")
    .select(
      "id, owner_id, type, amount, title, category_id, from_account_id, from_payment_method_id, to_account_id, to_payment_method_id, is_shared, memo, transacted_at, created_at, updated_at",
    )
    .eq("household_id", auth.householdId)
    .gte("transacted_at", from)
    .lt("transacted_at", to)
    .or(`is_shared.eq.true,owner_id.eq.${auth.userId}`)
    .order("transacted_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new APIError(
      "MCP_LEDGER_FETCH_ERROR",
      "가계부 내역 조회에 실패했습니다.",
      500,
    );
  }

  const keyword = typeof args.query === "string" ? args.query.trim() : "";
  const rows = (data ?? [])
    .filter((row) =>
      isLedgerEntryVisibleToMcp({
        ownerId: row.owner_id,
        isShared: row.is_shared,
        currentUserId: auth.userId,
      }),
    )
    .filter((row) => {
      if (!keyword) return true;
      const haystack = `${row.title ?? ""} ${row.memo ?? ""}`.toLowerCase();
      return haystack.includes(keyword.toLowerCase());
    });

  return {
    meta: buildMcpMeta({ period, scopes: auth.scopes }),
    summary: {
      count: rows.length,
      limit,
    },
    data: {
      entries: rows,
    },
  };
}

function incrementAggregate(
  map: Map<string | null, { amount: number; count: number }>,
  key: string | null,
  amount: number,
) {
  const existing = map.get(key) ?? { amount: 0, count: 0 };
  map.set(key, {
    amount: existing.amount + amount,
    count: existing.count + 1,
  });
}

function calcSavingsRate(income: number, expense: number): number {
  if (income === 0) return 0;
  return Math.round(((income - expense) / income) * 10000) / 100;
}

async function fetchCategoryMap(
  supabase: LooseSupabaseClient,
  aggregateMap: Map<string | null, { amount: number; count: number }>,
) {
  const ids = [...aggregateMap.keys()].filter(Boolean) as string[];
  const { data } =
    ids.length > 0
      ? await supabase.from("categories").select("id, name, icon").in("id", ids)
      : { data: [] };

  return new Map(
    (data ?? []).map((category) => [
      category.id,
      { name: category.name, icon: category.icon },
    ]),
  );
}

function buildCategoryStats(
  categoryMap: Map<string, { name: string; icon: string | null }>,
  aggregateMap: Map<string | null, { amount: number; count: number }>,
  type: "expense" | "income",
) {
  const total = [...aggregateMap.values()].reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const items = [...aggregateMap.entries()]
    .map(([categoryId, { amount, count }]) => {
      const category = categoryId ? categoryMap.get(categoryId) : undefined;
      return {
        categoryId,
        categoryName: category?.name ?? "미분류",
        categoryIcon: category?.icon ?? null,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
        entryCount: count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { type, scope: "all", total, items };
}

async function fetchPaymentMethodMap(
  supabase: LooseSupabaseClient,
  aggregateMap: Map<string | null, { amount: number; count: number }>,
) {
  const ids = [...aggregateMap.keys()].filter(Boolean) as string[];
  const { data } =
    ids.length > 0
      ? await supabase
          .from("payment_methods")
          .select("id, name, type")
          .in("id", ids)
      : { data: [] };

  return new Map(
    (data ?? []).map((method) => [
      method.id,
      { name: method.name, type: method.type },
    ]),
  );
}

function buildPaymentMethodStats(
  paymentMethodMap: Map<string, { name: string; type: string | null }>,
  aggregateMap: Map<string | null, { amount: number; count: number }>,
) {
  const total = [...aggregateMap.values()].reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const items = [...aggregateMap.entries()]
    .map(([paymentMethodId, { amount, count }]) => {
      const paymentMethod = paymentMethodId
        ? paymentMethodMap.get(paymentMethodId)
        : undefined;
      return {
        paymentMethodId,
        paymentMethodName: paymentMethod?.name ?? "현금/기타",
        paymentMethodType: paymentMethod?.type ?? null,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
        entryCount: count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { scope: "all", total, items };
}

async function buildTrendStats(
  supabase: LooseSupabaseClient,
  auth: McpAuthContext,
  months: number,
) {
  const now = new Date();
  const monthList: { year: number; month: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const cursor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    monthList.push({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
    });
  }

  const first = monthList[0];
  const last = monthList[monthList.length - 1];
  const from = new Date(Date.UTC(first.year, first.month - 1, 1)).toISOString();
  const to = new Date(Date.UTC(last.year, last.month, 1)).toISOString();
  const { data: rows } = await supabase
    .from("ledger_entries")
    .select("owner_id, type, amount, is_shared, transacted_at")
    .eq("household_id", auth.householdId)
    .gte("transacted_at", from)
    .lt("transacted_at", to)
    .or(`is_shared.eq.true,owner_id.eq.${auth.userId}`);

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const { year, month } of monthList) {
    monthMap.set(`${year}-${month}`, { income: 0, expense: 0 });
  }

  for (const row of rows ?? []) {
    if (
      !isLedgerEntryVisibleToMcp({
        ownerId: row.owner_id,
        isShared: row.is_shared,
        currentUserId: auth.userId,
      })
    ) {
      continue;
    }

    const date = new Date(row.transacted_at);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
    const existing = monthMap.get(key);
    if (!existing) continue;
    if (row.type === "income") existing.income += row.amount;
    if (row.type === "expense") existing.expense += row.amount;
  }

  for (const { year, month } of monthList) {
    const { data: privateTotals } = await supabase.rpc(
      "get_private_entry_totals",
      { hh_id: auth.householdId, p_year: year, p_month: month },
    );
    const privateTotalRows = (privateTotals ?? []) as {
      owner_id: string;
      total_amount: number | null;
    }[];
    const partnerPersonalExpense = privateTotalRows
      .filter((row) => row.owner_id !== auth.userId)
      .reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
    const existing = monthMap.get(`${year}-${month}`);
    if (existing) existing.expense += partnerPersonalExpense;
  }

  return {
    items: monthList.map(({ year, month }) => {
      const item = monthMap.get(`${year}-${month}`) ?? {
        income: 0,
        expense: 0,
      };
      return {
        year,
        month,
        totalIncome: item.income,
        totalExpense: item.expense,
        balance: item.income - item.expense,
        savingsRate: calcSavingsRate(item.income, item.expense),
      };
    }),
  };
}

async function getLedgerStats(
  supabase: LooseSupabaseClient,
  auth: McpAuthContext,
  args: Record<string, unknown>,
) {
  requireScope(auth, ["read:ledger"]);

  const { year, month } = getYearMonth(args);
  const months =
    typeof args.months === "number"
      ? Math.min(Math.max(Math.floor(args.months), 1), MAX_STATS_MONTHS)
      : 6;
  const monthCursor = new Date(Date.UTC(year, month - 1, 1));
  const period = normalizeMcpPeriod({
    from: toDateOnly(startOfUtcMonth(monthCursor)),
    to: toDateOnly(endOfUtcMonth(monthCursor)),
  });
  const { from, to } = periodToIsoRange(period);
  const [members, { data: rows }, { data: privateTotals }] = await Promise.all([
    fetchMembers(supabase, auth.householdId),
    supabase
      .from("ledger_entries")
      .select(
        "owner_id, type, amount, category_id, from_payment_method_id, is_shared, transacted_at",
      )
      .eq("household_id", auth.householdId)
      .gte("transacted_at", from)
      .lt("transacted_at", to)
      .or(`is_shared.eq.true,owner_id.eq.${auth.userId}`),
    supabase.rpc("get_private_entry_totals", {
      hh_id: auth.householdId,
      p_year: year,
      p_month: month,
    }),
  ]);

  const visibleRows = (rows ?? []).filter((row) =>
    isLedgerEntryVisibleToMcp({
      ownerId: row.owner_id,
      isShared: row.is_shared,
      currentUserId: auth.userId,
    }),
  );
  const privateTotalRows = (privateTotals ?? []) as {
    owner_id: string;
    total_amount: number | null;
  }[];
  const partnerPersonalExpense = privateTotalRows
    .filter((row) => row.owner_id !== auth.userId)
    .reduce((sum, row) => sum + (row.total_amount ?? 0), 0);

  let totalIncome = 0;
  let totalSharedExpense = 0;
  let myPersonalExpense = 0;
  const byMemberMap = new Map<
    string,
    { sharedExpense: number; sharedIncome: number; personalExpense: number }
  >();
  const expenseCategoryMap = new Map<
    string | null,
    { amount: number; count: number }
  >();
  const incomeCategoryMap = new Map<
    string | null,
    { amount: number; count: number }
  >();
  const paymentMethodMap = new Map<
    string | null,
    { amount: number; count: number }
  >();

  for (const member of members) {
    byMemberMap.set(member.id, {
      sharedExpense: 0,
      sharedIncome: 0,
      personalExpense: 0,
    });
  }

  for (const row of visibleRows) {
    const memberStats = byMemberMap.get(row.owner_id);

    if (row.type === "income") {
      totalIncome += row.amount;
      if (row.is_shared && memberStats) memberStats.sharedIncome += row.amount;
      incrementAggregate(incomeCategoryMap, row.category_id, row.amount);
    }

    if (row.type === "expense") {
      if (row.is_shared) {
        totalSharedExpense += row.amount;
        if (memberStats) memberStats.sharedExpense += row.amount;
      } else if (row.owner_id === auth.userId) {
        myPersonalExpense += row.amount;
        if (memberStats) memberStats.personalExpense += row.amount;
      }

      incrementAggregate(expenseCategoryMap, row.category_id, row.amount);
      incrementAggregate(
        paymentMethodMap,
        row.from_payment_method_id,
        row.amount,
      );
    }
  }

  const totalPersonalExpense = myPersonalExpense + partnerPersonalExpense;
  const totalExpense = totalSharedExpense + totalPersonalExpense;
  const summary = {
    year,
    month,
    totalIncome,
    totalSharedExpense,
    totalPersonalExpense,
    totalExpense,
    balance: totalIncome - totalExpense,
    savingsRate: calcSavingsRate(totalIncome, totalExpense),
  };

  const privateMap = new Map<string, number>();
  for (const row of privateTotalRows) {
    privateMap.set(row.owner_id, row.total_amount ?? 0);
  }

  const byMember = {
    members: members.map((member) => {
      const stat = byMemberMap.get(member.id) ?? {
        sharedExpense: 0,
        sharedIncome: 0,
        personalExpense: 0,
      };
      const isCurrentUser = member.id === auth.userId;
      return {
        memberId: member.id,
        memberName: member.name,
        isCurrentUser,
        sharedExpense: stat.sharedExpense,
        sharedIncome: stat.sharedIncome,
        personalExpense: isCurrentUser
          ? stat.personalExpense
          : (privateMap.get(member.id) ?? 0),
        personalExpenseVisible: isCurrentUser,
      };
    }),
  };

  const byExpenseCategory = buildCategoryStats(
    await fetchCategoryMap(supabase, expenseCategoryMap),
    expenseCategoryMap,
    "expense",
  );
  const byIncomeCategory = buildCategoryStats(
    await fetchCategoryMap(supabase, incomeCategoryMap),
    incomeCategoryMap,
    "income",
  );
  const byPaymentMethod = buildPaymentMethodStats(
    await fetchPaymentMethodMap(supabase, paymentMethodMap),
    paymentMethodMap,
  );
  const trend = await buildTrendStats(supabase, auth, months);

  return {
    meta: buildMcpMeta({ period, scopes: auth.scopes }),
    summary,
    data: {
      byMember,
      byCategory: {
        expense: byExpenseCategory,
        income: byIncomeCategory,
      },
      byPaymentMethod,
      trend,
    },
  };
}

async function getAssetSnapshot(
  supabase: LooseSupabaseClient,
  auth: McpAuthContext,
  args: Record<string, unknown>,
) {
  requireScope(auth, ["read:assets"]);

  const includeHoldings = args.includeHoldings !== false;
  const includeAllocation = args.includeAllocation !== false;
  const typed = supabase as SupabaseClient<Database>;
  const [portfolio, holdingsResult, exchangeRateResult] = await Promise.all([
    getPortfolioSummary(typed, auth.householdId),
    getHoldings(typed, auth.householdId, {
      pagination: { page: 1, pageSize: includeHoldings ? 1000 : 1 },
    }),
    getExchangeRateSafe(typed, "USD", "KRW"),
  ]);

  const holdings = holdingsResult.data;
  const allocationByAssetType = new Map<string, number>();
  const allocationByOwner = new Map<string, number>();

  for (const holding of holdings) {
    allocationByAssetType.set(
      holding.assetType,
      (allocationByAssetType.get(holding.assetType) ?? 0) +
        holding.totalInvested,
    );
    allocationByOwner.set(
      holding.owner.name,
      (allocationByOwner.get(holding.owner.name) ?? 0) + holding.totalInvested,
    );
  }

  return {
    meta: buildMcpMeta({ period: null, scopes: auth.scopes }),
    summary: portfolio,
    data: {
      exchangeRate: exchangeRateResult?.rate ?? null,
      holdings: includeHoldings ? holdings : undefined,
      allocation: includeAllocation
        ? {
            byAssetType: [...allocationByAssetType.entries()].map(
              ([assetType, totalInvested]) => ({ assetType, totalInvested }),
            ),
            byOwner: [...allocationByOwner.entries()].map(
              ([ownerName, totalInvested]) => ({ ownerName, totalInvested }),
            ),
          }
        : undefined,
    },
  };
}

async function getFinancialOverview(
  supabase: LooseSupabaseClient,
  auth: McpAuthContext,
  args: Record<string, unknown>,
) {
  requireScope(auth, ["read:overview"]);

  const period = normalizeMcpPeriod({
    from: typeof args.from === "string" ? args.from : undefined,
    to: typeof args.to === "string" ? args.to : undefined,
  });
  const monthDate = new Date(`${period.to}T00:00:00.000Z`);
  const typed = supabase as SupabaseClient<Database>;
  const ledgerAuth: McpAuthContext = {
    ...auth,
    scopes: [...new Set([...auth.scopes, "read:ledger"])],
  };

  const [ledgerResult, asset, { data: accounts }, paymentMethods] =
    await Promise.all([
      getLedgerStats(supabase, ledgerAuth, {
        year: monthDate.getUTCFullYear(),
        month: monthDate.getUTCMonth() + 1,
        months: 1,
      }),
      getAssetSnapshot(supabase, auth, {
        includeHoldings: false,
        includeAllocation: true,
      }),
      supabase
        .from("accounts")
        .select("id, balance")
        .eq("household_id", auth.householdId),
      getPaymentMethods(typed, auth.householdId),
    ]);

  const accountRows = (accounts ?? []) as { balance: number | null }[];
  const accountBalance = accountRows.reduce(
    (sum, account) => sum + (account.balance ?? 0),
    0,
  );
  const paymentMethodBalance = paymentMethods.reduce<number>(
    (sum, paymentMethod) => sum + (paymentMethod.balance ?? 0),
    0,
  );

  return {
    meta: buildMcpMeta({ period, scopes: auth.scopes }),
    summary: {
      cashFlow: ledgerResult.summary,
      portfolio: asset.summary,
      liquidBalance: accountBalance + paymentMethodBalance,
    },
    data: {
      balances: {
        accounts: accountBalance,
        paymentMethods: paymentMethodBalance,
      },
      asset: asset.data,
    },
  };
}

export async function executeMcpTool(
  supabase: LooseSupabaseClient,
  auth: McpAuthContext,
  name: string,
  args: Record<string, unknown> = {},
) {
  switch (name) {
    case "get_context":
      return getContext(supabase, auth);
    case "get_financial_overview":
      return getFinancialOverview(supabase, auth, args);
    case "list_references":
      return listReferences(supabase, auth);
    case "search_ledger_entries":
      return searchLedgerEntries(supabase, auth, args);
    case "get_ledger_stats":
      return getLedgerStats(supabase, auth, args);
    case "get_asset_snapshot":
      return getAssetSnapshot(supabase, auth, args);
    default:
      throw new APIError(
        "MCP_TOOL_NOT_FOUND",
        "MCP tool을 찾을 수 없습니다.",
        404,
      );
  }
}
