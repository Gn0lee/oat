import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { Database } from "@/types";

export type StatsScope = "all" | "shared" | "personal";

export interface LedgerStatsSummary {
  year: number;
  month: number;
  totalIncome: number;
  totalSharedExpense: number;
  totalPersonalExpense: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
}

export interface MemberStatItem {
  memberId: string;
  memberName: string;
  isCurrentUser: boolean;
  sharedExpense: number;
  sharedIncome: number;
  personalExpense: number;
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
  const from = new Date(year, month - 1, 1).toISOString();
  const to = new Date(year, month, 1).toISOString();
  return { from, to };
}

function calcSavingsRate(income: number, expense: number): number {
  if (income === 0) return 0;
  const balance = income - expense;
  return Math.round((balance / income) * 10000) / 100;
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

  let totalIncome = 0;
  let totalSharedExpense = 0;
  let myPersonalExpense = 0;

  for (const row of rows) {
    if (row.type === "income") {
      totalIncome += row.amount;
    } else if (row.type === "expense") {
      if (row.is_shared) {
        totalSharedExpense += row.amount;
      } else if (row.owner_id === userId) {
        myPersonalExpense += row.amount;
      }
    }
  }

  // 파트너 개인 지출 합산 (SECURITY DEFINER)
  const { data: privateTotals } = await supabase.rpc(
    "get_private_entry_totals",
    { hh_id: householdId, p_year: year, p_month: month },
  );

  const partnerPersonalExpense = (privateTotals ?? [])
    .filter((r) => r.owner_id !== userId)
    .reduce((sum, r) => sum + (r.total_amount ?? 0), 0);

  const totalPersonalExpense = myPersonalExpense + partnerPersonalExpense;
  const totalExpense = totalSharedExpense + totalPersonalExpense;
  const balance = totalIncome - totalExpense;
  const savingsRate = calcSavingsRate(totalIncome, totalExpense);

  return {
    year,
    month,
    totalIncome,
    totalSharedExpense,
    totalPersonalExpense,
    totalExpense,
    balance,
    savingsRate,
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

  // 파트너 개인 지출 합산 (SECURITY DEFINER)
  const { data: privateTotals } = await supabase.rpc(
    "get_private_entry_totals",
    { hh_id: householdId, p_year: year, p_month: month },
  );

  const privateMap = new Map<string, number>();
  for (const r of privateTotals ?? []) {
    privateMap.set(r.owner_id, r.total_amount ?? 0);
  }

  const result: MemberStatItem[] = memberList.map((member) => {
    const stat = statsMap.get(member.userId) ?? {
      sharedExpense: 0,
      sharedIncome: 0,
      personalExpense: 0,
    };
    const isCurrentUser = member.userId === userId;
    const personalExpense = isCurrentUser
      ? stat.personalExpense
      : (privateMap.get(member.userId) ?? 0);

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
          .select("id, name, icon")
          .in("id", categoryIds)
      : { data: [] };

  const categoryMap = new Map(
    (categories ?? []).map((c) => [c.id, { name: c.name, icon: c.icon }]),
  );

  const items: CategoryStatItem[] = [...aggregateMap.entries()]
    .map(([categoryId, { amount, count }]) => {
      const cat = categoryId ? categoryMap.get(categoryId) : undefined;
      return {
        categoryId,
        categoryName: cat?.name ?? "미분류",
        categoryIcon: cat?.icon ?? null,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
        entryCount: count,
      };
    })
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

  const results = await Promise.all(
    monthList.map(({ year, month }) =>
      getLedgerStatsSummary(supabase, householdId, userId, year, month),
    ),
  );

  const items: MonthlyTrendItem[] = results.map((summary) => ({
    year: summary.year,
    month: summary.month,
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    balance: summary.balance,
    savingsRate: summary.savingsRate,
  }));

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
