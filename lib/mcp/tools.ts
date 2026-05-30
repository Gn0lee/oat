import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { getPaymentMethods } from "@/lib/api/payment-method";
import { getStockPrices } from "@/lib/api/stock-price";
import { calculateHoldingValuation } from "@/lib/api/valuation";
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
    description:
      "이번 달 공용/토큰 소유자 개인 현금흐름과 현재 자산/주식 요약을 함께 조회합니다. 두 현금흐름은 합산하지 않습니다.",
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
      "가계부 상세 내역을 조회합니다. source/destination은 account 또는 paymentMethod 기반 Money Endpoint이며, 파트너 개인 지출 상세는 제외됩니다.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "YYYY-MM-DD" },
        to: { type: "string", description: "YYYY-MM-DD" },
        query: { type: "string" },
        types: {
          type: "array",
          items: { type: "string", enum: ["expense", "income", "transfer"] },
        },
        categoryIds: { type: "array", items: { type: "string" } },
        endpointIds: { type: "array", items: { type: "string" } },
        endpointTypes: {
          type: "array",
          items: { type: "string", enum: ["account", "paymentMethod"] },
        },
        ownerIds: { type: "array", items: { type: "string" } },
        isShared: { type: "boolean" },
        limit: { type: "number", minimum: 1, maximum: MAX_LEDGER_ENTRIES },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_ledger_stats",
    description:
      "가계부 요약, 멤버별, 카테고리별, Money Endpoint별 집계를 조회합니다. 현금흐름 summary는 공용/토큰 소유자 개인 장부를 분리하고 이체를 제외합니다.",
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
type LedgerEntryType = "expense" | "income" | "transfer";
type MoneyEndpointType = "account" | "paymentMethod" | "unknown";

interface MoneyEndpoint {
  endpointType: MoneyEndpointType;
  endpointId: string | null;
  endpointName: string;
  ownerName: string | null;
}

interface EndpointMaps {
  accounts: Map<string, { name: string; ownerName: string | null }>;
  paymentMethods: Map<string, { name: string; ownerName: string | null }>;
}

type EndpointDirection = "source" | "destination";

interface LedgerEndpointRow {
  type: LedgerEntryType;
  from_account_id: string | null;
  from_payment_method_id: string | null;
  to_account_id: string | null;
  to_payment_method_id: string | null;
}

interface EndpointAggregate {
  amount: number;
  count: number;
  breakdownByType: Record<
    LedgerEntryType,
    { amount: number; entryCount: number }
  >;
  endpoint: MoneyEndpoint;
}

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

function isLedgerEntryType(value: string): value is LedgerEntryType {
  return value === "expense" || value === "income" || value === "transfer";
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseLedgerEntryTypes(value: unknown): LedgerEntryType[] {
  return parseStringArray(value).filter(isLedgerEntryType);
}

function parseEndpointTypes(
  value: unknown,
): Exclude<MoneyEndpointType, "unknown">[] {
  return parseStringArray(value).filter(
    (item): item is Exclude<MoneyEndpointType, "unknown"> =>
      item === "account" || item === "paymentMethod",
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
      aggregatedOnly: [],
      excluded: [
        "partner private ledger details",
        "partner private ledger totals",
      ],
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

async function fetchEndpointMaps(
  supabase: LooseSupabaseClient,
  householdId: string,
): Promise<EndpointMaps> {
  const [members, { data: accounts }, paymentMethods] = await Promise.all([
    fetchMembers(supabase, householdId),
    supabase
      .from("accounts")
      .select("id, owner_id, name")
      .eq("household_id", householdId),
    getPaymentMethods(supabase as SupabaseClient<Database>, householdId),
  ]);
  const memberMap = new Map(members.map((member) => [member.id, member.name]));

  return {
    accounts: new Map(
      (accounts ?? []).map((account) => [
        account.id,
        {
          name: account.name,
          ownerName: memberMap.get(account.owner_id) ?? null,
        },
      ]),
    ),
    paymentMethods: new Map(
      paymentMethods.map((method) => [
        method.id,
        {
          name: method.name,
          ownerName: method.ownerName,
        },
      ]),
    ),
  };
}

function createUnknownEndpoint(direction: EndpointDirection): MoneyEndpoint {
  return {
    endpointType: "unknown",
    endpointId: null,
    endpointName: direction === "source" ? "출처 없음" : "도착지 없음",
    ownerName: null,
  };
}

export function buildMoneyEndpoint(
  row: LedgerEndpointRow,
  maps: EndpointMaps,
  direction: EndpointDirection,
): MoneyEndpoint | null {
  const accountId =
    direction === "source" ? row.from_account_id : row.to_account_id;
  const paymentMethodId =
    direction === "source"
      ? row.from_payment_method_id
      : row.to_payment_method_id;

  if (accountId) {
    const account = maps.accounts.get(accountId);
    return {
      endpointType: "account",
      endpointId: accountId,
      endpointName: account?.name ?? "알 수 없음",
      ownerName: account?.ownerName ?? null,
    };
  }

  if (paymentMethodId) {
    const paymentMethod = maps.paymentMethods.get(paymentMethodId);
    return {
      endpointType: "paymentMethod",
      endpointId: paymentMethodId,
      endpointName: paymentMethod?.name ?? "알 수 없음",
      ownerName: paymentMethod?.ownerName ?? null,
    };
  }

  if (
    (direction === "source" &&
      (row.type === "expense" || row.type === "transfer")) ||
    (direction === "destination" &&
      (row.type === "income" || row.type === "transfer"))
  ) {
    return createUnknownEndpoint(direction);
  }

  return null;
}

function endpointKey(endpoint: MoneyEndpoint): string {
  return `${endpoint.endpointType}:${endpoint.endpointId ?? "unknown"}`;
}

function incrementEndpointAggregate(
  map: Map<string, EndpointAggregate>,
  endpoint: MoneyEndpoint | null,
  type: LedgerEntryType,
  amount: number,
) {
  if (!endpoint) return;

  const key = endpointKey(endpoint);
  const existing = map.get(key) ?? {
    amount: 0,
    count: 0,
    endpoint,
    breakdownByType: {
      expense: { amount: 0, entryCount: 0 },
      income: { amount: 0, entryCount: 0 },
      transfer: { amount: 0, entryCount: 0 },
    },
  };
  existing.amount += amount;
  existing.count += 1;
  existing.breakdownByType[type].amount += amount;
  existing.breakdownByType[type].entryCount += 1;
  map.set(key, existing);
}

export function buildEndpointStats(
  aggregateMap: Map<string, EndpointAggregate>,
) {
  const total = [...aggregateMap.values()].reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const items = [...aggregateMap.values()]
    .map(({ endpoint, amount, count, breakdownByType }) => ({
      ...endpoint,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
      entryCount: count,
      breakdownByType,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { total, items };
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
  const types = parseLedgerEntryTypes(args.types);
  const categoryIds = parseStringArray(args.categoryIds);
  const endpointIds = parseStringArray(args.endpointIds);
  const endpointTypes = parseEndpointTypes(args.endpointTypes);
  const ownerIds = parseStringArray(args.ownerIds);

  let query = supabase
    .from("ledger_entries")
    .select(
      "id, owner_id, type, amount, title, category_id, from_account_id, from_payment_method_id, to_account_id, to_payment_method_id, is_shared, memo, transacted_at, created_at, updated_at",
    )
    .eq("household_id", auth.householdId)
    .gte("transacted_at", from)
    .lt("transacted_at", to)
    .or(`is_shared.eq.true,owner_id.eq.${auth.userId}`)
    .order("transacted_at", { ascending: false })
    .limit(limit + 1);

  if (types.length > 0) query = query.in("type", types);
  if (categoryIds.length > 0) query = query.in("category_id", categoryIds);
  if (ownerIds.length > 0) query = query.in("owner_id", ownerIds);
  if (typeof args.isShared === "boolean") {
    query = query.eq("is_shared", args.isShared);
  }

  const { data, error } = await query;

  if (error) {
    throw new APIError(
      "MCP_LEDGER_FETCH_ERROR",
      "가계부 내역 조회에 실패했습니다.",
      500,
    );
  }

  const keyword = typeof args.query === "string" ? args.query.trim() : "";
  const endpointTypeSet = new Set<string>(endpointTypes);
  const endpointIdSet = new Set(endpointIds);
  const shouldFilterEndpoint =
    endpointTypeSet.size > 0 || endpointIdSet.size > 0;
  const rows = (data ?? [])
    .filter((row) =>
      isLedgerEntryVisibleToMcp({
        ownerId: row.owner_id,
        isShared: row.is_shared,
        currentUserId: auth.userId,
      }),
    )
    .filter((row) => {
      if (!shouldFilterEndpoint) return true;
      const candidates = [
        { type: "account", id: row.from_account_id },
        { type: "paymentMethod", id: row.from_payment_method_id },
        { type: "account", id: row.to_account_id },
        { type: "paymentMethod", id: row.to_payment_method_id },
      ];
      return candidates.some(
        (candidate) =>
          candidate.id &&
          (endpointTypeSet.size === 0 || endpointTypeSet.has(candidate.type)) &&
          (endpointIdSet.size === 0 || endpointIdSet.has(candidate.id)),
      );
    })
    .filter((row) => {
      if (!keyword) return true;
      const haystack = `${row.title ?? ""} ${row.memo ?? ""}`.toLowerCase();
      return haystack.includes(keyword.toLowerCase());
    });
  const pageRows = rows.slice(0, limit);
  const endpointMaps = await fetchEndpointMaps(supabase, auth.householdId);

  return {
    meta: buildMcpMeta({ period, scopes: auth.scopes }),
    summary: {
      count: pageRows.length,
      limit,
      hasMore: rows.length > limit,
    },
    data: {
      entries: pageRows.map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        type: row.type,
        amount: row.amount,
        title: row.title,
        categoryId: row.category_id,
        source: buildMoneyEndpoint(
          row as LedgerEndpointRow,
          endpointMaps,
          "source",
        ),
        destination: buildMoneyEndpoint(
          row as LedgerEndpointRow,
          endpointMaps,
          "destination",
        ),
        isShared: row.is_shared,
        memo: row.memo,
        transactedAt: row.transacted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
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

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
}

function monthStartDateOnly(value: string): string {
  const date = new Date(value);
  return toDateOnly(startOfUtcMonth(date));
}

function isSameOrAfterMonth(
  year: number,
  month: number,
  dataAvailableFrom: string | null,
): boolean {
  if (!dataAvailableFrom) return false;
  const current = new Date(Date.UTC(year, month - 1, 1));
  const available = new Date(`${dataAvailableFrom}T00:00:00.000Z`);
  return current >= available;
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

async function buildTrendStats(
  supabase: LooseSupabaseClient,
  auth: McpAuthContext,
  months: number,
  endMonth: Date,
) {
  const monthList: { year: number; month: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const cursor = new Date(
      Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() - i, 1),
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
  const { data: earliestVisibleRows } = await supabase
    .from("ledger_entries")
    .select("transacted_at")
    .eq("household_id", auth.householdId)
    .or(`is_shared.eq.true,owner_id.eq.${auth.userId}`)
    .order("transacted_at", { ascending: true })
    .limit(1);
  const earliestCandidates = [earliestVisibleRows?.[0]?.transacted_at].filter(
    (value): value is string => typeof value === "string",
  );
  const dataAvailableFrom =
    earliestCandidates.length > 0
      ? monthStartDateOnly(
          earliestCandidates.sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime(),
          )[0],
        )
      : null;

  const monthMap = new Map<
    string,
    {
      shared: { income: number; expense: number };
      personal: { income: number; expense: number };
    }
  >();
  for (const { year, month } of monthList) {
    monthMap.set(`${year}-${month}`, {
      shared: { income: 0, expense: 0 },
      personal: { income: 0, expense: 0 },
    });
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
    const key = monthKey(date);
    const existing = monthMap.get(key);
    if (!existing) continue;
    const target = row.is_shared ? existing.shared : existing.personal;
    if (row.type === "income") target.income += row.amount;
    if (row.type === "expense") target.expense += row.amount;
  }

  return {
    dataAvailableFrom,
    items: monthList.map(({ year, month }) => {
      const item = monthMap.get(`${year}-${month}`) ?? {
        shared: { income: 0, expense: 0 },
        personal: { income: 0, expense: 0 },
      };
      const recorded = isSameOrAfterMonth(year, month, dataAvailableFrom);
      const build = ({
        income,
        expense,
      }: {
        income: number;
        expense: number;
      }) =>
        recorded
          ? {
              totalIncome: income,
              totalExpense: expense,
              balance: income - expense,
              savingsRate: calcSavingsRate(income, expense),
            }
          : {
              totalIncome: null,
              totalExpense: null,
              balance: null,
              savingsRate: null,
            };
      return {
        year,
        month,
        recorded,
        shared: build(item.shared),
        personal: build(item.personal),
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
  const [members, { data: rows }] = await Promise.all([
    fetchMembers(supabase, auth.householdId),
    supabase
      .from("ledger_entries")
      .select(
        "owner_id, type, amount, category_id, from_account_id, from_payment_method_id, to_account_id, to_payment_method_id, is_shared, transacted_at",
      )
      .eq("household_id", auth.householdId)
      .gte("transacted_at", from)
      .lt("transacted_at", to)
      .or(`is_shared.eq.true,owner_id.eq.${auth.userId}`),
  ]);

  const visibleRows = (rows ?? []).filter((row) =>
    isLedgerEntryVisibleToMcp({
      ownerId: row.owner_id,
      isShared: row.is_shared,
      currentUserId: auth.userId,
    }),
  );
  let sharedIncome = 0;
  let sharedExpense = 0;
  let personalIncome = 0;
  let personalExpense = 0;
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
  const sourceMap = new Map<string, EndpointAggregate>();
  const destinationMap = new Map<string, EndpointAggregate>();
  const endpointMaps = await fetchEndpointMaps(supabase, auth.householdId);

  for (const member of members) {
    byMemberMap.set(member.id, {
      sharedExpense: 0,
      sharedIncome: 0,
      personalExpense: 0,
    });
  }

  for (const row of visibleRows) {
    const memberStats = byMemberMap.get(row.owner_id);
    const type = row.type as LedgerEntryType;

    if (row.type === "income") {
      if (row.is_shared) {
        sharedIncome += row.amount;
        if (memberStats) memberStats.sharedIncome += row.amount;
      } else if (row.owner_id === auth.userId) {
        personalIncome += row.amount;
      }
      incrementAggregate(incomeCategoryMap, row.category_id, row.amount);
    }

    if (row.type === "expense") {
      if (row.is_shared) {
        sharedExpense += row.amount;
        if (memberStats) memberStats.sharedExpense += row.amount;
      } else if (row.owner_id === auth.userId) {
        personalExpense += row.amount;
        if (memberStats) memberStats.personalExpense += row.amount;
      }
      incrementAggregate(expenseCategoryMap, row.category_id, row.amount);
    }

    if (row.type === "expense" || row.type === "transfer") {
      incrementEndpointAggregate(
        sourceMap,
        buildMoneyEndpoint(row as LedgerEndpointRow, endpointMaps, "source"),
        type,
        row.amount,
      );
    }

    if (row.type === "income" || row.type === "transfer") {
      incrementEndpointAggregate(
        destinationMap,
        buildMoneyEndpoint(
          row as LedgerEndpointRow,
          endpointMaps,
          "destination",
        ),
        type,
        row.amount,
      );
    }
  }

  const buildSummary = (income: number, expense: number) => ({
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense,
    savingsRate: calcSavingsRate(income, expense),
  });
  const summary = {
    year,
    month,
    description:
      "shared and personal are separate ledger flows. Do not add them together. Partner private ledgers are excluded.",
    shared: buildSummary(sharedIncome, sharedExpense),
    personal: buildSummary(personalIncome, personalExpense),
  };

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
        personalExpense: isCurrentUser ? stat.personalExpense : null,
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
  const trend = await buildTrendStats(supabase, auth, months, monthCursor);

  return {
    meta: buildMcpMeta({ period, scopes: auth.scopes }),
    summary,
    data: {
      byMember,
      byCategory: {
        expense: byExpenseCategory,
        income: byIncomeCategory,
      },
      bySource: buildEndpointStats(sourceMap),
      byDestination: buildEndpointStats(destinationMap),
      trend,
    },
  };
}

async function getPortfolioSnapshot(
  supabase: SupabaseClient<Database>,
  householdId: string,
) {
  const [holdingsResult, exchangeRateResult] = await Promise.all([
    getHoldings(supabase, householdId, {
      pagination: { page: 1, pageSize: 1000 },
    }),
    getExchangeRateSafe(supabase, "USD", "KRW"),
  ]);
  const holdings = holdingsResult.data;
  const exchangeRate = exchangeRateResult?.rate ?? 1300;
  const stockQueries = holdings
    .filter((holding) => holding.market === "KR" || holding.market === "US")
    .map((holding) => ({
      market: holding.market as "KR" | "US",
      code: holding.ticker,
    }));
  const stockPrices = await getStockPrices(supabase, stockQueries);
  const valuationAt = new Date().toISOString();
  let totalValue = 0;
  let totalInvested = 0;
  let hasMissingPrices = false;
  let hasStalePrices = false;
  let priceFetchedAt: string | null = null;
  const allocationByAssetType = new Map<
    string,
    { totalValue: number; totalInvested: number }
  >();
  const allocationByOwner = new Map<
    string,
    { totalValue: number; totalInvested: number }
  >();

  const valuedHoldings = holdings.map((holding) => {
    const priceKey = `${holding.market}:${holding.ticker}`;
    const price = stockPrices[priceKey];
    const valuation = calculateHoldingValuation(
      {
        quantity: holding.quantity,
        avgPrice: holding.avgPrice,
        totalInvested: holding.totalInvested,
        currency: holding.currency,
      },
      price,
      exchangeRate,
    );
    totalValue += valuation.currentValue;
    totalInvested += valuation.investedAmount;
    hasMissingPrices = hasMissingPrices || valuation.isMissingPrice;
    hasStalePrices = hasStalePrices || valuation.isStalePrice;
    if (price?.fetchedAt) {
      const fetchedAt = price.fetchedAt.toISOString();
      priceFetchedAt =
        !priceFetchedAt || fetchedAt > priceFetchedAt
          ? fetchedAt
          : priceFetchedAt;
    }

    const assetTypeAllocation = allocationByAssetType.get(
      holding.assetType,
    ) ?? {
      totalValue: 0,
      totalInvested: 0,
    };
    assetTypeAllocation.totalValue += valuation.currentValue;
    assetTypeAllocation.totalInvested += valuation.investedAmount;
    allocationByAssetType.set(holding.assetType, assetTypeAllocation);

    const ownerAllocation = allocationByOwner.get(holding.owner.name) ?? {
      totalValue: 0,
      totalInvested: 0,
    };
    ownerAllocation.totalValue += valuation.currentValue;
    ownerAllocation.totalInvested += valuation.investedAmount;
    allocationByOwner.set(holding.owner.name, ownerAllocation);

    return {
      ticker: holding.ticker,
      name: holding.name,
      quantity: holding.quantity,
      avgPrice: holding.avgPrice,
      totalInvested: valuation.investedAmount,
      currentPrice: valuation.currentPrice,
      currentValue: valuation.currentValue,
      returnRate:
        valuation.investedAmount > 0
          ? ((valuation.currentValue - valuation.investedAmount) /
              valuation.investedAmount) *
            100
          : 0,
      market: holding.market,
      currency: holding.currency,
      assetType: holding.assetType,
      riskLevel: holding.riskLevel,
      lastTransactionAt: holding.lastTransactionAt,
      owner: holding.owner,
      account: holding.account,
      priceFetchedAt: price?.fetchedAt.toISOString() ?? null,
      priceStatus: price?.status ?? "missing",
    };
  });
  const returnRate =
    totalInvested > 0
      ? ((totalValue - totalInvested) / totalInvested) * 100
      : 0;

  return {
    summary: {
      holdingCount: holdings.length,
      totalValue,
      totalInvested,
      returnRate,
      valuationAt,
    },
    valuation: {
      valuationAt,
      exchangeRate: exchangeRateResult?.rate ?? null,
      exchangeRateUpdatedAt: exchangeRateResult?.updatedAt ?? null,
      priceFetchedAt,
      hasMissingPrices,
      hasStalePrices,
    },
    allocation: {
      byAssetType: [...allocationByAssetType.entries()].map(
        ([assetType, allocation]) => ({ assetType, ...allocation }),
      ),
      byOwner: [...allocationByOwner.entries()].map(
        ([ownerName, allocation]) => ({ ownerName, ...allocation }),
      ),
    },
    holdings: valuedHoldings,
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
  const snapshot = await getPortfolioSnapshot(
    supabase as SupabaseClient<Database>,
    auth.householdId,
  );

  return {
    meta: buildMcpMeta({ period: null, scopes: auth.scopes }),
    summary: snapshot.summary,
    data: {
      valuation: snapshot.valuation,
      holdings: includeHoldings ? snapshot.holdings : undefined,
      allocation: includeAllocation ? snapshot.allocation : undefined,
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
