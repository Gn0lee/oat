import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { getLedgerBook, getLedgerBooks } from "@/lib/api/ledger-books";
import {
  formatKst,
  getKstDayRange,
  getKstMonthRange,
  getKstToday,
} from "@/lib/date";
import { ledgerMonthAnchorDate } from "@/lib/ledger-books/navigation";
import type { Database } from "@/types";
import type { LedgerBookVisibility } from "@/types/ledger-book";

/**
 * Which visible transactions a statistic covers. Without `bookId` every book
 * the caller can see (RLS: shared books + own personal books, archived
 * included) is used once. `visibility` narrows that set to shared or personal
 * books; it backs the home card and legacy `scope` requests.
 */
export interface LedgerStatsScope {
  bookId?: string;
  visibility?: LedgerBookVisibility;
}

export interface LedgerStatsMonth {
  year: number;
  month: number;
}

export interface LedgerFlowSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
}

export interface LedgerStatsSummary {
  year: number;
  month: number;
  bookId: string | null;
  total: LedgerFlowSummary;
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
  bookId: string | null;
  bookVisibility: LedgerBookVisibility | null;
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
  bookId: string | null;
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
  bookId: string | null;
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
  bookId: string | null;
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
  bookId: string | null;
  items: DailyStatItem[];
}

interface ResolvedScope {
  bookId: string | null;
  bookVisibility: LedgerBookVisibility | null;
  /** Book filter for the entry query; null means every visible book. */
  bookIds: string[] | null;
  visibilityByBook: Map<string, LedgerBookVisibility>;
}

// A specific book is checked first so hidden, foreign and missing IDs all get
// the same 404. Book visibility (not the legacy is_shared column) decides the
// shared/personal split.
async function resolveScope(
  supabase: SupabaseClient<Database>,
  householdId: string,
  scope: LedgerStatsScope,
): Promise<ResolvedScope> {
  if (scope.bookId) {
    const book = await getLedgerBook(supabase, householdId, scope.bookId);
    return {
      bookId: book.id,
      bookVisibility: book.visibility,
      bookIds: [book.id],
      visibilityByBook: new Map([[book.id, book.visibility]]),
    };
  }
  const books = await getLedgerBooks(supabase, householdId);
  return {
    bookId: null,
    bookVisibility: null,
    bookIds: scope.visibility
      ? books.filter((b) => b.visibility === scope.visibility).map((b) => b.id)
      : null,
    visibilityByBook: new Map(books.map((b) => [b.id, b.visibility])),
  };
}

function throwStatsError(): never {
  throw new APIError("STATS_FETCH_ERROR", "통계 조회에 실패했습니다.", 500);
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

interface FlowRow {
  type: string;
  amount: number;
}

function sumFlow(rows: FlowRow[]): LedgerFlowSummary {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === "income") income += row.amount;
    else if (row.type === "expense") expense += row.amount;
  }
  return buildFlowSummary(income, expense);
}

export async function getLedgerStatsSummary(
  supabase: SupabaseClient<Database>,
  householdId: string,
  params: LedgerStatsMonth & LedgerStatsScope,
): Promise<LedgerStatsSummary> {
  const scope = await resolveScope(supabase, householdId, params);
  const { from, to } = getKstMonthRange(params.year, params.month);

  let query = supabase
    .from("ledger_entries")
    .select("type, amount, book_id")
    .eq("household_id", householdId)
    .in("type", ["expense", "income"])
    .gte("transacted_at", from)
    .lt("transacted_at", to);
  if (scope.bookIds) query = query.in("book_id", scope.bookIds);

  const { data, error } = await query;
  if (error) throwStatsError();

  const rows = data ?? [];
  const visibilityOf = (row: { book_id: string }) =>
    scope.visibilityByBook.get(row.book_id);

  return {
    year: params.year,
    month: params.month,
    bookId: scope.bookId,
    total: sumFlow(rows),
    shared: sumFlow(rows.filter((row) => visibilityOf(row) === "shared")),
    personal: sumFlow(rows.filter((row) => visibilityOf(row) === "personal")),
  };
}

export async function getLedgerStatsByMember(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  params: LedgerStatsMonth & Pick<LedgerStatsScope, "bookId">,
): Promise<LedgerStatsByMemberResult> {
  const scope = await resolveScope(supabase, householdId, params);
  const { from, to } = getKstMonthRange(params.year, params.month);

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, profiles!inner(name)")
    .eq("household_id", householdId);

  const memberList = (members ?? [])
    .map((m) => ({
      userId: m.user_id,
      name: Array.isArray(m.profiles)
        ? ((m.profiles[0] as { name: string })?.name ?? "알 수 없음")
        : ((m.profiles as unknown as { name: string })?.name ?? "알 수 없음"),
    }))
    // A personal book only ever holds its creator's entries.
    .filter(
      (member) =>
        scope.bookVisibility !== "personal" || member.userId === userId,
    );

  let query = supabase
    .from("ledger_entries")
    .select("owner_id, type, amount, book_id")
    .eq("household_id", householdId)
    .in("type", ["expense", "income"])
    .gte("transacted_at", from)
    .lt("transacted_at", to);
  if (scope.bookIds) query = query.in("book_id", scope.bookIds);

  const { data, error } = await query;
  if (error) throwStatsError();

  const statsMap = new Map(
    memberList.map((member) => [
      member.userId,
      { sharedExpense: 0, sharedIncome: 0, personalExpense: 0 },
    ]),
  );

  for (const row of data ?? []) {
    const stat = statsMap.get(row.owner_id);
    if (!stat) continue;
    const visibility = scope.visibilityByBook.get(row.book_id);
    if (visibility === "shared") {
      if (row.type === "expense") stat.sharedExpense += row.amount;
      else if (row.type === "income") stat.sharedIncome += row.amount;
    } else if (
      visibility === "personal" &&
      row.owner_id === userId &&
      row.type === "expense"
    ) {
      stat.personalExpense += row.amount;
    }
  }

  // Others' personal spending is never known here, so it is reported as
  // hidden (null) rather than as 0. A shared book has no personal column.
  const showsPersonal = scope.bookVisibility !== "shared";
  const result: MemberStatItem[] = memberList.map((member) => {
    const stat = statsMap.get(member.userId) ?? {
      sharedExpense: 0,
      sharedIncome: 0,
      personalExpense: 0,
    };
    const isCurrentUser = member.userId === userId;
    const personalExpenseVisible = isCurrentUser && showsPersonal;

    return {
      memberId: member.userId,
      memberName: member.name,
      isCurrentUser,
      sharedExpense: stat.sharedExpense,
      sharedIncome: stat.sharedIncome,
      personalExpense: personalExpenseVisible ? stat.personalExpense : null,
      personalExpenseVisible,
    };
  });

  return {
    bookId: scope.bookId,
    bookVisibility: scope.bookVisibility,
    members: result,
  };
}

export async function getLedgerStatsByCategory(
  supabase: SupabaseClient<Database>,
  householdId: string,
  params: LedgerStatsMonth &
    LedgerStatsScope & {
      type: "expense" | "income";
    },
): Promise<LedgerStatsByCategoryResult> {
  const { type } = params;
  const scope = await resolveScope(supabase, householdId, params);
  const { from, to } = getKstMonthRange(params.year, params.month);

  let query = supabase
    .from("ledger_entries")
    .select("amount, category_id")
    .eq("household_id", householdId)
    .eq("type", type)
    .gte("transacted_at", from)
    .lt("transacted_at", to);
  if (scope.bookIds) query = query.in("book_id", scope.bookIds);

  const { data, error } = await query;
  if (error) throwStatsError();

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

  return { type, bookId: scope.bookId, total, items };
}

export async function getLedgerStatsByPaymentMethod(
  supabase: SupabaseClient<Database>,
  householdId: string,
  params: LedgerStatsMonth & LedgerStatsScope,
): Promise<LedgerStatsByPaymentMethodResult> {
  const scope = await resolveScope(supabase, householdId, params);
  const { from, to } = getKstMonthRange(params.year, params.month);

  let query = supabase
    .from("ledger_entries")
    .select("amount, from_payment_method_id")
    .eq("household_id", householdId)
    .eq("type", "expense")
    .gte("transacted_at", from)
    .lt("transacted_at", to);
  if (scope.bookIds) query = query.in("book_id", scope.bookIds);

  const { data, error } = await query;
  if (error) throwStatsError();

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

  return { bookId: scope.bookId, total, items };
}

export async function getLedgerStatsTrend(
  supabase: SupabaseClient<Database>,
  householdId: string,
  params: LedgerStatsScope & { months: number },
): Promise<LedgerStatsTrendResult> {
  const scope = await resolveScope(supabase, householdId, params);
  const [currentYear, currentMonth] = getKstToday().split("-").map(Number);

  const monthList: LedgerStatsMonth[] = [];
  for (let i = params.months - 1; i >= 0; i--) {
    let year = currentYear;
    let month = currentMonth - i;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    monthList.push({ year, month });
  }

  const first = monthList[0];
  const { from } = getKstMonthRange(first.year, first.month);
  const { to } = getKstMonthRange(currentYear, currentMonth);

  let query = supabase
    .from("ledger_entries")
    .select("type, amount, transacted_at")
    .eq("household_id", householdId)
    .in("type", ["expense", "income"])
    .gte("transacted_at", from)
    .lt("transacted_at", to);
  if (scope.bookIds) query = query.in("book_id", scope.bookIds);

  const { data, error } = await query;
  if (error) throwStatsError();

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const { year, month } of monthList) {
    monthMap.set(`${year}-${month}`, { income: 0, expense: 0 });
  }

  for (const row of data ?? []) {
    const [year, month] = formatKst(row.transacted_at).split("-").map(Number);
    const existing = monthMap.get(`${year}-${month}`);
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

  return { bookId: scope.bookId, items };
}

export async function getLedgerStatsDaily(
  supabase: SupabaseClient<Database>,
  householdId: string,
  params: LedgerStatsMonth & LedgerStatsScope,
): Promise<LedgerStatsDailyResult> {
  const scope = await resolveScope(supabase, householdId, params);
  const { from, to } = getKstMonthRange(params.year, params.month);

  let query = supabase
    .from("ledger_entries")
    .select("type, amount, transacted_at")
    .eq("household_id", householdId)
    .in("type", ["expense", "income"])
    .gte("transacted_at", from)
    .lt("transacted_at", to);
  if (scope.bookIds) query = query.in("book_id", scope.bookIds);

  const { data, error } = await query;
  if (error) throwStatsError();

  const dailyMap = new Map<string, { income: number; expense: number }>();

  for (const row of data ?? []) {
    const date = formatKst(row.transacted_at);
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

  return {
    year: params.year,
    month: params.month,
    bookId: scope.bookId,
    items,
  };
}

export type LedgerStatsDetailKind = "category" | "payment-method" | "daily";

export interface LedgerStatsDetailParams extends LedgerStatsScope {
  kind: LedgerStatsDetailKind;
  year?: number;
  month?: number;
  date?: string;
  type?: "expense" | "income";
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

// The records screen lists the anchor day and every earlier day of that month,
// so a month-level detail opens on the month's anchor date.
function buildLedgerStatsDetailViewAllHref(
  params: LedgerStatsDetailParams,
  type: "expense" | "income",
  month: LedgerStatsMonth,
): string {
  const searchParams = new URLSearchParams();
  appendParam(searchParams, "book", params.bookId);
  searchParams.set(
    "date",
    params.kind === "daily" && params.date
      ? params.date
      : ledgerMonthAnchorDate(month.year, month.month, getKstToday()),
  );
  searchParams.set("type", type);
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
  visibilityByBook: Map<string, LedgerBookVisibility>,
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
    isShared: visibilityByBook.get(String(row.book_id)) === "shared",
    memo: (row.memo as string | null) ?? null,
    transactedAt: String(row.transacted_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getLedgerStatsDetail(
  supabase: SupabaseClient<Database>,
  householdId: string,
  params: LedgerStatsDetailParams,
): Promise<LedgerStatsDetailResult> {
  const scope = await resolveScope(supabase, householdId, params);
  const limit = params.limit ?? 20;
  const [currentYear, currentMonth] = getKstToday().split("-").map(Number);
  const month = {
    year: params.year ?? currentYear,
    month: params.month ?? currentMonth,
  };
  const range =
    params.kind === "daily" && params.date
      ? getKstDayRange(params.date)
      : getKstMonthRange(month.year, month.month);
  const type =
    params.kind === "category" ? (params.type ?? "expense") : "expense";

  let query = supabase
    .from("ledger_entries")
    .select(
      `
      id,
      household_id,
      book_id,
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
    .eq("type", type)
    .gte("transacted_at", range.from)
    .lt("transacted_at", range.to);
  if (scope.bookIds) query = query.in("book_id", scope.bookIds);

  if (params.kind === "category") {
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
    if (
      params.paymentMethodId === "__none__" ||
      params.paymentMethodId === null
    ) {
      query = query.is("from_payment_method_id", null);
    } else if (params.paymentMethodId) {
      query = query.eq("from_payment_method_id", params.paymentMethodId);
    }
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
      mapLedgerStatsDetailRow(
        row as Record<string, unknown>,
        scope.visibilityByBook,
      ),
    ),
    viewAllHref: buildLedgerStatsDetailViewAllHref(params, type, month),
  };
}
