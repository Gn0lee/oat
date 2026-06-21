import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { getKstDayRange, getKstMonthRange } from "@/lib/date";
import type { Database } from "@/types";

export type StatsScope = "all" | "shared" | "personal";

export interface LedgerFlowSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
}

export interface LedgerStatsSummary {
  year: number;
  month: number;
  shared: LedgerFlowSummary;
  personal: LedgerFlowSummary;
}

export interface MemberStatItem {
  memberId: string;
  memberName: string;
  isCurrentUser: boolean;
  sharedExpense: number;
  sharedIncome: number;
  personalExpense: number | null;
  personalExpenseVisible: boolean;
}

export interface LedgerStatsByMemberResult {
  members: MemberStatItem[];
}

export interface CategoryStatItem {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string | null;
  amount: number;
  percentage: number;
  entryCount: number;
  directAmount?: number;
  directEntryCount?: number;
  children?: CategoryStatChildItem[];
}

export interface CategoryStatChildItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  amount: number;
  percentage: number;
  entryCount: number;
}

export interface LedgerStatsByCategoryResult {
  type: "expense" | "income";
  scope: StatsScope;
  total: number;
  items: CategoryStatItem[];
}

export interface PaymentMethodStatItem {
  paymentMethodId: string | null;
  paymentMethodName: string;
  paymentMethodType: string | null;
  amount: number;
  percentage: number;
  entryCount: number;
}

export interface LedgerStatsByPaymentMethodResult {
  scope: StatsScope;
  total: number;
  items: PaymentMethodStatItem[];
}

export interface MonthlyTrendItem {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
}

export interface LedgerStatsTrendResult {
  items: MonthlyTrendItem[];
}

export interface DailyStatItem {
  date: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface LedgerStatsDailyResult {
  year: number;
  month: number;
  scope: StatsScope;
  items: DailyStatItem[];
}

function getMonthRange(
  year: number,
  month: number,
): { from: string; to: string } {
  return getKstMonthRange(year, month);
}

function calcSavingsRate(income: number, expense: number): number {
  if (income === 0) return 0;
  const balance = income - expense;
  return Math.round((balance / income) * 10000) / 100;
}

function buildFlowSummary(income: number, expense: number): LedgerFlowSummary {
  return {
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense,
    savingsRate: calcSavingsRate(income, expense),
  };
}

export async function getLedgerStatsSummary(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  year: number,
  month: number,
): Promise<LedgerStatsSummary> {
  const { from, to } = getMonthRange(year, month);

  // RLS 적용 조회: 공용 + 본인 개인 항목
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("type, amount, is_shared, owner_id")
    .eq("household_id", householdId)
    .in("type", ["expense", "income"])
    .gte("transacted_at", from)
    .lt("transacted_at", to);

  if (error) {
    throw new APIError("STATS_FETCH_ERROR", "통계 조회에 실패했습니다.", 500);
  }

  const rows = data ?? [];

  let sharedIncome = 0;
  let sharedExpense = 0;
  let personalIncome = 0;
  let personalExpense = 0;

  for (const row of rows) {
    if (row.is_shared) {
      if (row.type === "income") sharedIncome += row.amount;
      else if (row.type === "expense") sharedExpense += row.amount;
    } else if (row.owner_id === userId) {
      if (row.type === "income") personalIncome += row.amount;
      else if (row.type === "expense") personalExpense += row.amount;
    }
  }

  return {
    year,
    month,
    shared: buildFlowSummary(sharedIncome, sharedExpense),
    personal: buildFlowSummary(personalIncome, personalExpense),
  };
}

export async function getLedgerStatsByMember(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  year: number,
  month: number,
): Promise<LedgerStatsByMemberResult> {
  const { from, to } = getMonthRange(year, month);

  // 가구 멤버 목록 조회
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, profiles!inner(name)")
    .eq("household_id", householdId);

  const memberList = (members ?? []).map((m) => ({
    userId: m.user_id,
    name: Array.isArray(m.profiles)
      ? ((m.profiles[0] as { name: string })?.name ?? "알 수 없음")
      : ((m.profiles as unknown as { name: string })?.name ?? "알 수 없음"),
  }));

  // RLS 적용 조회: 공용 + 본인 개인
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("owner_id, type, amount, is_shared")
    .eq("household_id", householdId)
    .in("type", ["expense", "income"])
    .gte("transacted_at", from)
    .lt("transacted_at", to);

  if (error) {
    throw new APIError("STATS_FETCH_ERROR", "통계 조회에 실패했습니다.", 500);
  }

  const rows = data ?? [];

  // owner_id → 공용/개인 집계
  const statsMap = new Map<
    string,
    { sharedExpense: number; sharedIncome: number; personalExpense: number }
  >();

  for (const member of memberList) {
    statsMap.set(member.userId, {
      sharedExpense: 0,
      sharedIncome: 0,
      personalExpense: 0,
    });
  }

  for (const row of rows) {
    const stat = statsMap.get(row.owner_id);
    if (!stat) continue;

    if (row.is_shared) {
      if (row.type === "expense") stat.sharedExpense += row.amount;
      else if (row.type === "income") stat.sharedIncome += row.amount;
    } else if (row.owner_id === userId && row.type === "expense") {
      stat.personalExpense += row.amount;
    }
  }

  const result: MemberStatItem[] = memberList.map((member) => {
    const stat = statsMap.get(member.userId) ?? {
      sharedExpense: 0,
      sharedIncome: 0,
      personalExpense: 0,
    };
    const isCurrentUser = member.userId === userId;
    const personalExpense = isCurrentUser ? stat.personalExpense : null;

    return {
      memberId: member.userId,
      memberName: member.name,
      isCurrentUser,
      sharedExpense: stat.sharedExpense,
      sharedIncome: stat.sharedIncome,
      personalExpense,
      personalExpenseVisible: isCurrentUser,
    };
  });

  return { members: result };
}

export async function getLedgerStatsByCategory(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  year: number,
  month: number,
  type: "expense" | "income",
  scope: StatsScope,
): Promise<LedgerStatsByCategoryResult> {
  const { from, to } = getMonthRange(year, month);

  let query = supabase
    .from("ledger_entries")
    .select("amount, category_id")
    .eq("household_id", householdId)
    .eq("type", type)
    .gte("transacted_at", from)
    .lt("transacted_at", to);

  if (scope === "shared") {
    query = query.eq("is_shared", true);
  } else if (scope === "personal") {
    query = query.eq("is_shared", false).eq("owner_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new APIError("STATS_FETCH_ERROR", "통계 조회에 실패했습니다.", 500);
  }

  const rows = data ?? [];

  // category_id 기준 집계
  const aggregateMap = new Map<
    string | null,
    { amount: number; count: number }
  >();

  for (const row of rows) {
    const key = row.category_id;
    const existing = aggregateMap.get(key) ?? { amount: 0, count: 0 };
    aggregateMap.set(key, {
      amount: existing.amount + row.amount,
      count: existing.count + 1,
    });
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  // 카테고리 정보 조회
  const categoryIds = [
    ...new Set(rows.map((r) => r.category_id).filter(Boolean) as string[]),
  ];

  const { data: categories } =
    categoryIds.length > 0
      ? await supabase
          .from("categories")
          .select("id, name, icon, parent_id")
          .in("id", categoryIds)
      : { data: [] };

  const categoryMap = new Map(
    (categories ?? []).map((c) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        icon: c.icon,
        parent_id: c.parent_id as string | null,
      },
    ]),
  );

  const parentIds = [
    ...new Set(
      [...categoryMap.values()]
        .map((category) => category.parent_id)
        .filter(Boolean) as string[],
    ),
  ].filter((id) => !categoryMap.has(id));

  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from("categories")
      .select("id, name, icon, parent_id")
      .in("id", parentIds);
    for (const parent of parents ?? []) {
      categoryMap.set(parent.id, {
        id: parent.id,
        name: parent.name,
        icon: parent.icon,
        parent_id: parent.parent_id as string | null,
      });
    }
  }

  const parentStats = new Map<string | null, CategoryStatItem>();
  const ensureParent = (parentId: string | null, categoryName: string) => {
    const existing = parentStats.get(parentId);
    if (existing) return existing;
    const parent = parentId ? categoryMap.get(parentId) : undefined;
    const item: CategoryStatItem = {
      categoryId: parentId,
      categoryName: parent?.name ?? categoryName,
      categoryIcon: parent?.icon ?? null,
      amount: 0,
      percentage: 0,
      entryCount: 0,
      directAmount: 0,
      directEntryCount: 0,
      children: [],
    };
    parentStats.set(parentId, item);
    return item;
  };

  for (const [categoryId, { amount, count }] of aggregateMap.entries()) {
    if (!categoryId) {
      const uncategorized = ensureParent(null, "미분류");
      uncategorized.amount += amount;
      uncategorized.entryCount += count;
      uncategorized.directAmount = (uncategorized.directAmount ?? 0) + amount;
      uncategorized.directEntryCount =
        (uncategorized.directEntryCount ?? 0) + count;
      continue;
    }

    const category = categoryMap.get(categoryId);
    const parentId = category?.parent_id ?? categoryId;
    const parent = ensureParent(parentId, category?.name ?? "미분류");
    parent.amount += amount;
    parent.entryCount += count;

    if (category?.parent_id) {
      parent.children?.push({
        categoryId,
        categoryName: category.name,
        categoryIcon: category.icon ?? parent.categoryIcon,
        amount,
        percentage: 0,
        entryCount: count,
      });
    } else {
      parent.directAmount = (parent.directAmount ?? 0) + amount;
      parent.directEntryCount = (parent.directEntryCount ?? 0) + count;
      parent.categoryIcon = category?.icon ?? parent.categoryIcon;
    }
  }

  const items: CategoryStatItem[] = [...parentStats.values()]
    .map((item) => ({
      ...item,
      percentage:
        total > 0 ? Math.round((item.amount / total) * 10000) / 100 : 0,
      children: (item.children ?? [])
        .map((child) => ({
          ...child,
          percentage:
            item.amount > 0
              ? Math.round((child.amount / item.amount) * 10000) / 100
              : 0,
        }))
        .sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  return { type, scope, total, items };
}

export async function getLedgerStatsByPaymentMethod(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  year: number,
  month: number,
  scope: StatsScope,
): Promise<LedgerStatsByPaymentMethodResult> {
  const { from, to } = getMonthRange(year, month);

  let query = supabase
    .from("ledger_entries")
    .select("amount, from_payment_method_id")
    .eq("household_id", householdId)
    .eq("type", "expense")
    .gte("transacted_at", from)
    .lt("transacted_at", to);

  if (scope === "shared") {
    query = query.eq("is_shared", true);
  } else if (scope === "personal") {
    query = query.eq("is_shared", false).eq("owner_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new APIError("STATS_FETCH_ERROR", "통계 조회에 실패했습니다.", 500);
  }

  const rows = data ?? [];

  const aggregateMap = new Map<
    string | null,
    { amount: number; count: number }
  >();

  for (const row of rows) {
    const key = row.from_payment_method_id;
    const existing = aggregateMap.get(key) ?? { amount: 0, count: 0 };
    aggregateMap.set(key, {
      amount: existing.amount + row.amount,
      count: existing.count + 1,
    });
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  // 결제수단 정보 조회
  const pmIds = [
    ...new Set(
      rows.map((r) => r.from_payment_method_id).filter(Boolean) as string[],
    ),
  ];

  const { data: paymentMethods } =
    pmIds.length > 0
      ? await supabase
          .from("payment_methods")
          .select("id, name, type")
          .in("id", pmIds)
      : { data: [] };

  const pmMap = new Map(
    (paymentMethods ?? []).map((pm) => [
      pm.id,
      { name: pm.name, type: pm.type },
    ]),
  );

  const items: PaymentMethodStatItem[] = [...aggregateMap.entries()]
    .map(([pmId, { amount, count }]) => {
      const pm = pmId ? pmMap.get(pmId) : undefined;
      return {
        paymentMethodId: pmId,
        paymentMethodName: pm?.name ?? "현금/기타",
        paymentMethodType: pm?.type ?? null,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
        entryCount: count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { scope, total, items };
}

export async function getLedgerStatsTrend(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  months: number,
  scope: StatsScope = "all",
): Promise<LedgerStatsTrendResult> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthList: { year: number; month: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    let year = currentYear;
    let month = currentMonth - i;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    monthList.push({ year, month });
  }

  const first = monthList[0];
  const from = new Date(first.year, first.month - 1, 1).toISOString();
  const to = new Date(currentYear, currentMonth, 1).toISOString();

  let query = supabase
    .from("ledger_entries")
    .select("type, amount, transacted_at")
    .eq("household_id", householdId)
    .in("type", ["expense", "income"])
    .gte("transacted_at", from)
    .lt("transacted_at", to);

  if (scope === "shared") {
    query = query.eq("is_shared", true);
  } else if (scope === "personal") {
    query = query.eq("is_shared", false).eq("owner_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new APIError("STATS_FETCH_ERROR", "통계 조회에 실패했습니다.", 500);
  }

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const { year, month } of monthList) {
    monthMap.set(`${year}-${month}`, { income: 0, expense: 0 });
  }

  for (const row of data ?? []) {
    const d = new Date(row.transacted_at);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const existing = monthMap.get(key);
    if (!existing) continue;
    if (row.type === "income") {
      existing.income += row.amount;
    } else {
      existing.expense += row.amount;
    }
  }

  const items: MonthlyTrendItem[] = monthList.map(({ year, month }) => {
    const { income, expense } = monthMap.get(`${year}-${month}`) ?? {
      income: 0,
      expense: 0,
    };
    return {
      year,
      month,
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      savingsRate: calcSavingsRate(income, expense),
    };
  });

  return { items };
}

export async function getLedgerStatsDaily(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  year: number,
  month: number,
  scope: StatsScope,
): Promise<LedgerStatsDailyResult> {
  const { from, to } = getMonthRange(year, month);

  let query = supabase
    .from("ledger_entries")
    .select("type, amount, transacted_at")
    .eq("household_id", householdId)
    .in("type", ["expense", "income"])
    .gte("transacted_at", from)
    .lt("transacted_at", to);

  if (scope === "shared") {
    query = query.eq("is_shared", true);
  } else if (scope === "personal") {
    query = query.eq("is_shared", false).eq("owner_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new APIError("STATS_FETCH_ERROR", "통계 조회에 실패했습니다.", 500);
  }

  const rows = data ?? [];

  const dailyMap = new Map<string, { income: number; expense: number }>();

  for (const row of rows) {
    const date = row.transacted_at.slice(0, 10); // "YYYY-MM-DD"
    const existing = dailyMap.get(date) ?? { income: 0, expense: 0 };
    if (row.type === "income") {
      dailyMap.set(date, { ...existing, income: existing.income + row.amount });
    } else {
      dailyMap.set(date, {
        ...existing,
        expense: existing.expense + row.amount,
      });
    }
  }

  const items: DailyStatItem[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { income, expense }]) => ({
      date,
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    }));

  return { year, month, scope, items };
}

export type LedgerStatsDetailKind = "category" | "payment-method" | "daily";

export interface LedgerStatsDetailParams {
  kind: LedgerStatsDetailKind;
  year?: number;
  month?: number;
  date?: string;
  type?: "expense" | "income";
  scope: StatsScope;
  categoryId?: string | null;
  childCategoryId?: string | null;
  categoryBreakdown?: "direct";
  paymentMethodId?: string | null;
  limit?: number;
}

export interface LedgerStatsDetailResult {
  totalCount: number;
  items: LedgerEntryWithDetails[];
  viewAllHref: string;
}

function appendParam(params: URLSearchParams, key: string, value?: string) {
  if (value) params.set(key, value);
}

function buildLedgerStatsDetailViewAllHref(
  params: LedgerStatsDetailParams,
): string {
  const searchParams = new URLSearchParams();
  if (params.date) {
    searchParams.set("date", params.date);
  } else {
    if (params.year) searchParams.set("year", String(params.year));
    if (params.month) searchParams.set("month", String(params.month));
  }
  if (params.scope !== "all") searchParams.set("scope", params.scope);
  appendParam(searchParams, "type", params.type);
  appendParam(
    searchParams,
    "categoryId",
    params.categoryId === null ? "__none__" : params.categoryId,
  );
  appendParam(
    searchParams,
    "childCategoryId",
    params.childCategoryId ?? undefined,
  );
  appendParam(searchParams, "categoryBreakdown", params.categoryBreakdown);
  appendParam(
    searchParams,
    "paymentMethodId",
    params.paymentMethodId === null ? "__none__" : params.paymentMethodId,
  );
  return `/ledger/records?${searchParams.toString()}`;
}

function mapLedgerStatsDetailRow(
  row: Record<string, unknown>,
): LedgerEntryWithDetails {
  const owner = row.profiles as { name?: string } | null;
  const category = row.categories as {
    name?: string;
    icon?: string | null;
  } | null;
  const fromAccount = row.from_account as { name?: string } | null;
  const toAccount = row.to_account as { name?: string } | null;
  const fromPaymentMethod = row.from_payment_method as { name?: string } | null;
  const toPaymentMethod = row.to_payment_method as { name?: string } | null;

  return {
    id: String(row.id),
    householdId: String(row.household_id),
    ownerId: String(row.owner_id),
    ownerName: owner?.name ?? "알 수 없음",
    type: row.type as LedgerEntryWithDetails["type"],
    amount: Number(row.amount),
    title: (row.title as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? null,
    categoryName: category?.name ?? null,
    categoryIcon: category?.icon ?? null,
    fromAccountId: (row.from_account_id as string | null) ?? null,
    fromAccountName: fromAccount?.name ?? null,
    fromPaymentMethodId: (row.from_payment_method_id as string | null) ?? null,
    fromPaymentMethodName: fromPaymentMethod?.name ?? null,
    toAccountId: (row.to_account_id as string | null) ?? null,
    toAccountName: toAccount?.name ?? null,
    toPaymentMethodId: (row.to_payment_method_id as string | null) ?? null,
    toPaymentMethodName: toPaymentMethod?.name ?? null,
    isShared: Boolean(row.is_shared),
    memo: (row.memo as string | null) ?? null,
    transactedAt: String(row.transacted_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getLedgerStatsDetail(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  params: LedgerStatsDetailParams,
): Promise<LedgerStatsDetailResult> {
  const limit = params.limit ?? 20;
  const range =
    params.kind === "daily" && params.date
      ? getKstDayRange(params.date)
      : getKstMonthRange(
          params.year ?? new Date().getFullYear(),
          params.month ?? new Date().getMonth() + 1,
        );

  let query = supabase
    .from("ledger_entries")
    .select(
      `
      id,
      household_id,
      owner_id,
      type,
      amount,
      transacted_at,
      title,
      category_id,
      from_account_id,
      from_payment_method_id,
      to_account_id,
      to_payment_method_id,
      is_shared,
      memo,
      created_at,
      updated_at,
      profiles!ledger_entries_owner_id_fkey ( id, name ),
      categories ( id, name, icon, parent_id ),
      from_account:accounts!ledger_entries_from_account_id_fkey ( id, name ),
      to_account:accounts!ledger_entries_to_account_id_fkey ( id, name ),
      from_payment_method:payment_methods!ledger_entries_from_payment_method_id_fkey ( id, name ),
      to_payment_method:payment_methods!ledger_entries_to_payment_method_id_fkey ( id, name )
    `,
      { count: "exact" },
    )
    .eq("household_id", householdId)
    .gte("transacted_at", range.from)
    .lt("transacted_at", range.to);

  if (params.scope === "shared") {
    query = query.eq("is_shared", true);
  } else if (params.scope === "personal") {
    query = query.eq("is_shared", false).eq("owner_id", userId);
  }

  if (params.kind === "category") {
    query = query.eq("type", params.type ?? "expense");
    if (params.categoryId === "__none__" || params.categoryId === null) {
      query = query.is("category_id", null);
    } else if (params.childCategoryId) {
      query = query.eq("category_id", params.childCategoryId);
    } else if (params.categoryId && params.categoryBreakdown === "direct") {
      query = query.eq("category_id", params.categoryId);
    } else if (params.categoryId) {
      const { data: children } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", params.categoryId);
      const categoryIds = [
        params.categoryId,
        ...(children ?? []).map((c) => c.id),
      ];
      query = query.in("category_id", categoryIds);
    }
  }

  if (params.kind === "payment-method") {
    query = query.eq("type", "expense");
    if (
      params.paymentMethodId === "__none__" ||
      params.paymentMethodId === null
    ) {
      query = query.is("from_payment_method_id", null);
    } else if (params.paymentMethodId) {
      query = query.eq("from_payment_method_id", params.paymentMethodId);
    }
  }

  if (params.kind === "daily") {
    query = query.eq("type", "expense");
  }

  const { data, error, count } = await query
    .order("transacted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, limit - 1);

  if (error) {
    throw new APIError(
      "STATS_DETAIL_FETCH_ERROR",
      "상세 내역 조회에 실패했습니다.",
      500,
    );
  }

  return {
    totalCount: count ?? 0,
    items: (data ?? []).map((row) =>
      mapLedgerStatsDetailRow(row as Record<string, unknown>),
    ),
    viewAllHref: buildLedgerStatsDetailViewAllHref(params),
  };
}
