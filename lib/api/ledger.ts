import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { getLedgerBook } from "@/lib/api/ledger-books";
import { getKstDayRange, getKstMonthRange, getKstToday } from "@/lib/date";
import type { CreateLedgerEntryInput } from "@/schemas/ledger-entry";
import type {
  Database,
  Json,
  LedgerEntry,
  LedgerEntryType,
  PaymentMethodType,
} from "@/types";
import {
  attachTagsToLedgerEntries,
  normalizeLedgerTagInputs,
} from "./ledger-tags";

export interface LedgerItemFormData {
  amount: string;
  title: string;
  categoryId: string;
  paymentMethodId?: string;
  accountId?: string;
  transactedAt: string;
  memo?: string;
  tagNames?: string[];
}

export type TransferLocation =
  | { kind: "account"; id: string }
  | { kind: "paymentMethod"; id: string };

export interface TransferItemFormData {
  amount: string;
  title: string;
  from: TransferLocation;
  to: TransferLocation;
  transactedAt: string;
  memo?: string;
  tagNames?: string[];
}

const TRANSFER_CAPABLE_PAYMENT_METHOD_TYPES = new Set<PaymentMethodType>([
  "prepaid",
  "gift_card",
  "cash",
]);

export function isTransferCapablePaymentMethod(
  type: PaymentMethodType,
): boolean {
  return TRANSFER_CAPABLE_PAYMENT_METHOD_TYPES.has(type);
}

export function buildLedgerEntryPayload(
  type: "expense" | "income" | "non_expense_withdrawal",
  isShared: boolean,
  item: LedgerItemFormData,
): CreateLedgerEntryInput {
  const base: CreateLedgerEntryInput = {
    type,
    amount: Number(item.amount),
    transactedAt: item.transactedAt.includes("T")
      ? item.transactedAt
      : `${item.transactedAt}T00:00:00.000Z`,
    title: item.title,
    isShared,
    memo: item.memo || undefined,
    tags: item.tagNames || undefined,
  };

  if (item.categoryId && type !== "non_expense_withdrawal") {
    base.categoryId = item.categoryId;
  }

  if (type === "expense" || type === "non_expense_withdrawal") {
    if (item.paymentMethodId) base.fromPaymentMethodId = item.paymentMethodId;
    if (item.accountId) base.fromAccountId = item.accountId;
  }
  if (type === "income" && item.accountId) {
    base.toAccountId = item.accountId;
  }

  return base;
}

export function buildTransferLedgerEntryPayload(
  isShared: boolean,
  item: TransferItemFormData,
): CreateLedgerEntryInput {
  const base: CreateLedgerEntryInput = {
    type: "transfer",
    amount: Number(item.amount),
    transactedAt: item.transactedAt.includes("T")
      ? item.transactedAt
      : `${item.transactedAt}T00:00:00.000Z`,
    title: item.title,
    isShared,
    memo: item.memo || undefined,
    tags: item.tagNames || undefined,
  };

  if (item.from.kind === "account") base.fromAccountId = item.from.id;
  if (item.from.kind === "paymentMethod") {
    base.fromPaymentMethodId = item.from.id;
  }
  if (item.to.kind === "account") base.toAccountId = item.to.id;
  if (item.to.kind === "paymentMethod") base.toPaymentMethodId = item.to.id;

  return base;
}

export interface LedgerEntryWithDetails {
  bookId?: string;
  book?: {
    name: string;
    visibility: "shared" | "personal";
    archivedAt: string | null;
  };
  id: string;
  householdId: string;
  ownerId: string;
  ownerName: string;
  type: LedgerEntryType;
  amount: number;
  title: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  fromAccountId: string | null;
  fromAccountName: string | null;
  fromPaymentMethodId: string | null;
  fromPaymentMethodName: string | null;
  toAccountId: string | null;
  toAccountName: string | null;
  toPaymentMethodId: string | null;
  toPaymentMethodName: string | null;
  isShared: boolean;
  memo: string | null;
  transactedAt: string;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
}

export interface LedgerEntrySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface OwnLedgerActivity {
  hasRecentOwnLedgerActivity: boolean;
  lastOwnLedgerEntryCreatedAt: string | null;
}

export interface GetLedgerEntriesOptions {
  bookId?: string;
  includeBookDetails?: boolean;
  year?: number;
  month?: number;
  date?: string;
  scope?: "shared" | "personal";
  userId?: string;
  tagIds?: string[];
  categoryId?: string | null;
  childCategoryId?: string | null;
  categoryBreakdown?: "direct";
}

export interface LedgerEntrySearchItem extends LedgerEntryWithDetails {
  memoMatched: boolean;
}

export interface LedgerEntrySearchResult {
  items: LedgerEntrySearchItem[];
  nextOffset: number | null;
}

export interface CreateLedgerEntryParams {
  householdId: string;
  ownerId: string;
  bookId?: string;
  type: LedgerEntryType;
  amount: number;
  transactedAt: string;
  title?: string;
  categoryId?: string;
  fromAccountId?: string;
  fromPaymentMethodId?: string;
  toAccountId?: string;
  toPaymentMethodId?: string;
  isShared?: boolean;
  memo?: string;
  tags?: string[];
}

export interface UpdateLedgerEntryParams {
  bookId?: string;
  expectedUpdatedAt?: string;
  confirmVisibilityChange?: boolean;
  type?: LedgerEntryType;
  amount?: number;
  transactedAt?: string;
  title?: string | null;
  categoryId?: string | null;
  fromAccountId?: string | null;
  fromPaymentMethodId?: string | null;
  toAccountId?: string | null;
  toPaymentMethodId?: string | null;
  memo?: string | null;
  tags?: string[] | null;
}

type LedgerEntryRow = LedgerEntry;

interface LedgerFinancialSourceOwnershipInput {
  householdId: string;
  ownerId: string;
  isShared?: boolean;
  accountIds?: Array<string | null | undefined>;
  paymentMethodIds?: Array<string | null | undefined>;
}

function uniqueDefined(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])];
}

export async function assertLedgerFinancialSourceOwnership(
  supabase: SupabaseClient<Database>,
  input: LedgerFinancialSourceOwnershipInput,
): Promise<void> {
  const accountIds = uniqueDefined(input.accountIds ?? []);
  const paymentMethodIds = uniqueDefined(input.paymentMethodIds ?? []);

  const [accountsResult, paymentMethodsResult] = await Promise.all([
    accountIds.length > 0
      ? supabase
          .from("accounts")
          .select("id, owner_id, is_household_usable")
          .eq("household_id", input.householdId)
          .in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    paymentMethodIds.length > 0
      ? supabase
          .from("payment_methods")
          .select("id, owner_id, is_household_usable")
          .eq("household_id", input.householdId)
          .in("id", paymentMethodIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (accountsResult.error || paymentMethodsResult.error) {
    throw new APIError(
      "LEDGER_FINANCIAL_SOURCE_FETCH_ERROR",
      "계좌 또는 결제수단 확인에 실패했습니다.",
      500,
    );
  }

  const accountMap = new Map(
    (accountsResult.data ?? []).map((row) => [row.id, row]),
  );
  const paymentMethodMap = new Map(
    (paymentMethodsResult.data ?? []).map((row) => [row.id, row]),
  );

  const hasInvalidAccount = accountIds.some((id) => {
    const row = accountMap.get(id);
    return (
      !row ||
      (row.owner_id !== input.ownerId &&
        !(input.isShared && row.is_household_usable))
    );
  });
  const hasInvalidPaymentMethod = paymentMethodIds.some((id) => {
    const row = paymentMethodMap.get(id);
    return (
      !row ||
      (row.owner_id !== input.ownerId &&
        !(input.isShared && row.is_household_usable))
    );
  });

  if (hasInvalidAccount || hasInvalidPaymentMethod) {
    throw new APIError(
      "LEDGER_FINANCIAL_SOURCE_FORBIDDEN",
      "본인의 계좌 또는 결제수단만 기록에 사용할 수 있습니다.",
      403,
    );
  }
}

export interface LedgerBalanceEffectInput {
  type: LedgerEntryType;
  amount: number;
  fromAccountId?: string | null;
  fromPaymentMethodId?: string | null;
  toAccountId?: string | null;
  toPaymentMethodId?: string | null;
}

export interface LedgerBalanceEffect {
  table: "accounts" | "payment_methods";
  id: string;
  delta: number;
}

export function getLedgerBalanceEffects(
  input: LedgerBalanceEffectInput,
): LedgerBalanceEffect[] {
  if (input.type === "transfer") {
    return [
      input.fromAccountId && {
        table: "accounts" as const,
        id: input.fromAccountId,
        delta: -input.amount,
      },
      input.fromPaymentMethodId && {
        table: "payment_methods" as const,
        id: input.fromPaymentMethodId,
        delta: -input.amount,
      },
      input.toAccountId && {
        table: "accounts" as const,
        id: input.toAccountId,
        delta: input.amount,
      },
      input.toPaymentMethodId && {
        table: "payment_methods" as const,
        id: input.toPaymentMethodId,
        delta: input.amount,
      },
    ].filter(Boolean) as LedgerBalanceEffect[];
  }

  if (input.type === "income") {
    return [
      input.toAccountId && {
        table: "accounts" as const,
        id: input.toAccountId,
        delta: input.amount,
      },
      input.toPaymentMethodId && {
        table: "payment_methods" as const,
        id: input.toPaymentMethodId,
        delta: input.amount,
      },
    ].filter(Boolean) as LedgerBalanceEffect[];
  }

  if (input.type === "expense" || input.type === "non_expense_withdrawal") {
    return [
      input.fromAccountId && {
        table: "accounts" as const,
        id: input.fromAccountId,
        delta: -input.amount,
      },
      input.fromPaymentMethodId && {
        table: "payment_methods" as const,
        id: input.fromPaymentMethodId,
        delta: -input.amount,
      },
    ].filter(Boolean) as LedgerBalanceEffect[];
  }

  return [];
}

export function calculateLedgerSummary(
  entries: Pick<LedgerEntryWithDetails, "type" | "amount">[],
): LedgerEntrySummary {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const entry of entries) {
    if (entry.type === "income") {
      totalIncome += entry.amount;
    } else if (entry.type === "expense") {
      totalExpense += entry.amount;
    }
    // transfer는 합산 제외
  }

  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

export function filterLedgerEntriesByScope<
  T extends Pick<LedgerEntryWithDetails, "isShared" | "ownerId">,
>(entries: T[], scope: "shared" | "personal", userId: string): T[] {
  return entries.filter((entry) =>
    scope === "shared"
      ? entry.isShared
      : !entry.isShared && entry.ownerId === userId,
  );
}

function getDateRange(options: GetLedgerEntriesOptions): {
  from: string;
  to: string;
} {
  if (options.date) {
    const range = getKstDayRange(options.date);
    return range;
  }

  const [currentYear, currentMonth] = getKstToday().split("-").map(Number);
  const range = getKstMonthRange(
    options.year ?? currentYear,
    options.month ?? currentMonth,
  );
  return range;
}

async function attachLedgerEntryDetails(
  supabase: SupabaseClient<Database>,
  rows: LedgerEntryRow[],
): Promise<LedgerEntryWithDetails[]> {
  if (rows.length === 0) {
    return [];
  }

  const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
  const categoryIds = [
    ...new Set(rows.map((r) => r.category_id).filter(Boolean) as string[]),
  ];
  const accountIds = [
    ...new Set(
      [
        ...rows.map((r) => r.from_account_id),
        ...rows.map((r) => r.to_account_id),
      ].filter(Boolean) as string[],
    ),
  ];
  const paymentMethodIds = [
    ...new Set(
      [
        ...rows.map((r) => r.from_payment_method_id),
        ...rows.map((r) => r.to_payment_method_id),
      ].filter(Boolean) as string[],
    ),
  ];

  const [
    { data: profiles },
    { data: categories },
    { data: accounts },
    { data: paymentMethods },
    tagMap,
  ] = await Promise.all([
    ownerIds.length > 0
      ? supabase.from("profiles").select("id, name").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length > 0
      ? supabase
          .from("categories")
          .select("id, name, icon, parent_id")
          .in("id", categoryIds)
      : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? supabase.from("accounts").select("id, name").in("id", accountIds)
      : Promise.resolve({ data: [] }),
    paymentMethodIds.length > 0
      ? supabase
          .from("payment_methods")
          .select("id, name")
          .in("id", paymentMethodIds)
      : Promise.resolve({ data: [] }),
    attachTagsToLedgerEntries(supabase, rows),
  ]);

  const ownerMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const categoryRows = categories ?? [];
  const parentCategoryIds = [
    ...new Set(
      categoryRows.map((c) => c.parent_id).filter(Boolean) as string[],
    ),
  ].filter((id) => !categoryRows.some((c) => c.id === id));
  const { data: parentCategories } =
    parentCategoryIds.length > 0
      ? await supabase
          .from("categories")
          .select("id, name, icon, parent_id")
          .in("id", parentCategoryIds)
      : { data: [] };
  const categoryMap = new Map(
    [...categoryRows, ...(parentCategories ?? [])].map((c) => [
      c.id,
      {
        name: c.name,
        icon: c.icon,
        parentId: c.parent_id as string | null,
      },
    ]),
  );
  const accountMap = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const paymentMethodMap = new Map(
    (paymentMethods ?? []).map((pm) => [pm.id, pm.name]),
  );

  return rows.map((r) => ({
    id: r.id,
    householdId: r.household_id,
    ownerId: r.owner_id,
    ownerName: ownerMap.get(r.owner_id) ?? "알 수 없음",
    type: r.type,
    amount: r.amount,
    title: r.title,
    categoryId: r.category_id,
    categoryName: r.category_id
      ? (() => {
          const category = categoryMap.get(r.category_id);
          const parent = category?.parentId
            ? categoryMap.get(category.parentId)
            : undefined;
          return parent && category
            ? `${parent.name} > ${category.name}`
            : (category?.name ?? null);
        })()
      : null,
    categoryIcon: r.category_id
      ? (() => {
          const category = categoryMap.get(r.category_id);
          const parent = category?.parentId
            ? categoryMap.get(category.parentId)
            : undefined;
          return category?.icon ?? parent?.icon ?? null;
        })()
      : null,
    fromAccountId: r.from_account_id,
    fromAccountName: r.from_account_id
      ? (accountMap.get(r.from_account_id) ?? null)
      : null,
    fromPaymentMethodId: r.from_payment_method_id,
    fromPaymentMethodName: r.from_payment_method_id
      ? (paymentMethodMap.get(r.from_payment_method_id) ?? null)
      : null,
    toAccountId: r.to_account_id,
    toAccountName: r.to_account_id
      ? (accountMap.get(r.to_account_id) ?? null)
      : null,
    toPaymentMethodId: r.to_payment_method_id,
    toPaymentMethodName: r.to_payment_method_id
      ? (paymentMethodMap.get(r.to_payment_method_id) ?? null)
      : null,
    isShared: r.is_shared,
    memo: r.memo,
    transactedAt: r.transacted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    tags: tagMap.get(r.id) ?? [],
  }));
}

export async function getLedgerEntryById(
  supabase: SupabaseClient<Database>,
  entryId: string,
  householdId: string,
): Promise<LedgerEntryWithDetails> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("id", entryId)
    .eq("household_id", householdId)
    .maybeSingle();

  if (error) {
    console.error("Ledger entry detail fetch error:", error);
    throw new APIError(
      "LEDGER_FETCH_ERROR",
      "가계부 기록 조회에 실패했습니다.",
      500,
    );
  }

  if (!data) {
    throw new APIError("NOT_FOUND", "가계부 기록을 찾을 수 없습니다.", 404);
  }

  const [entry] = await attachLedgerEntryDetails(supabase, [data]);
  if (data.book_id) {
    const [withBook] = await attachLedgerBookDetails(
      supabase,
      householdId,
      [data],
      [entry],
    );
    return withBook;
  }
  return entry;
}

export async function getLedgerEntries(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options?: GetLedgerEntriesOptions,
): Promise<LedgerEntryWithDetails[]> {
  const book = options?.bookId
    ? await getLedgerBook(supabase, householdId, options.bookId)
    : null;
  const { from, to } = getDateRange(options ?? {});

  let matchingIds: string[] | null = null;
  if (options?.tagIds && options.tagIds.length > 0) {
    const { data: tagMappings, error: tagErr } = await supabase
      .from("ledger_entry_tags")
      .select("ledger_entry_id, tag_id")
      .in("tag_id", options.tagIds);

    if (tagErr) {
      console.error("Ledger tag mappings fetch error:", tagErr);
      throw new APIError(
        "LEDGER_TAG_FETCH_ERROR",
        "태그 매핑 조회에 실패했습니다.",
        500,
      );
    }

    const entryTagCount = new Map<string, number>();
    for (const m of tagMappings || []) {
      entryTagCount.set(
        m.ledger_entry_id,
        (entryTagCount.get(m.ledger_entry_id) || 0) + 1,
      );
    }

    matchingIds = [];
    for (const [entryId, count] of entryTagCount.entries()) {
      if (count === options.tagIds.length) {
        matchingIds.push(entryId);
      }
    }

    if (matchingIds.length === 0) {
      return [];
    }
  }

  let categoryFilterIds: string[] | null = null;
  if (options?.childCategoryId) {
    categoryFilterIds = [options.childCategoryId];
  } else if (options?.categoryId && options.categoryId !== "__none__") {
    if (options.categoryBreakdown === "direct") {
      categoryFilterIds = [options.categoryId];
    } else {
      const { data: children, error: childrenError } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", options.categoryId);
      if (childrenError) {
        console.error("Category children fetch error:", childrenError);
        throw new APIError(
          "LEDGER_CATEGORY_FETCH_ERROR",
          "카테고리 조회에 실패했습니다.",
          500,
        );
      }
      categoryFilterIds = [
        options.categoryId,
        ...(children ?? []).map((child) => child.id),
      ];
    }
  }

  const query = supabase
    .from("ledger_entries")
    .select("*")
    .eq("household_id", householdId)
    .gte("transacted_at", from)
    .lt("transacted_at", to);

  if (book) query.eq("book_id", book.id);

  if (matchingIds !== null) {
    query.in("id", matchingIds);
  }

  if (options?.categoryId === "__none__" || options?.categoryId === null) {
    query.is("category_id", null);
  } else if (categoryFilterIds) {
    query.in("category_id", categoryFilterIds);
  }

  const { data, error } = await query
    .order("transacted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Ledger entries fetch error:", error);
    throw new APIError(
      "LEDGER_FETCH_ERROR",
      "가계부 내역 조회에 실패했습니다.",
      500,
    );
  }

  const rows = data ?? [];
  const scopedRows = rows.filter((row) => {
    if (!options?.scope) return true;
    if (options.scope === "shared") return row.is_shared;
    return !row.is_shared && row.owner_id === options.userId;
  });

  if (scopedRows.length === 0) {
    return [];
  }

  const entries = await attachLedgerEntryDetails(supabase, scopedRows);
  return options?.includeBookDetails
    ? attachLedgerBookDetails(supabase, householdId, scopedRows, entries)
    : entries;
}

async function attachLedgerBookDetails(
  supabase: SupabaseClient<Database>,
  householdId: string,
  rows: Array<{ id: string; book_id?: string }>,
  entries: LedgerEntryWithDetails[],
): Promise<LedgerEntryWithDetails[]> {
  const ids = [
    ...new Set(
      rows.map((row) => row.book_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (!ids.length) return entries;
  const { data: books, error } = await supabase
    .from("ledger_books")
    .select("id, name, visibility, archived_at")
    .eq("household_id", householdId)
    .in("id", ids);
  if (error)
    throw new APIError(
      "LEDGER_FETCH_ERROR",
      "장부 정보를 불러올 수 없습니다.",
      500,
    );
  const byId = new Map((books ?? []).map((book) => [book.id, book]));
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return entries.map((entry) => {
    const bookId = rowById.get(entry.id)?.book_id;
    const book = bookId ? byId.get(bookId) : null;
    return {
      ...entry,
      bookId,
      ...(book && {
        book: {
          name: book.name,
          visibility:
            book.visibility === "personal"
              ? ("personal" as const)
              : ("shared" as const),
          archivedAt: book.archived_at,
        },
      }),
    };
  });
}

export async function searchLedgerEntries(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options: {
    query: string;
    scope: "shared" | "personal";
    offset: number;
    limit: number;
  },
): Promise<LedgerEntrySearchResult> {
  const query = options.query.trim();
  const { data, error } = await supabase.rpc("search_ledger_entries", {
    hh_id: householdId,
    search_query: query,
    search_scope: options.scope,
    result_offset: options.offset,
    result_limit: options.limit + 1,
  });

  if (error) {
    console.error("Ledger entry search error:", error);
    throw new APIError(
      "LEDGER_SEARCH_ERROR",
      "가계부 내역 검색에 실패했습니다.",
      500,
    );
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, options.limit);
  const entries = await attachLedgerEntryDetails(supabase, pageRows);
  const normalizedQuery = query.toLocaleLowerCase();

  return {
    items: entries.map((entry) => ({
      ...entry,
      memoMatched:
        entry.memo?.toLocaleLowerCase().includes(normalizedQuery) ?? false,
    })),
    nextOffset:
      rows.length > options.limit ? options.offset + pageRows.length : null,
  };
}

export async function getLedgerEntrySummary(
  supabase: SupabaseClient<Database>,
  householdId: string,
  year: number,
  month: number,
  scope: "shared" | "personal" | "all" = "shared",
  userId?: string,
  bookId?: string,
): Promise<LedgerEntrySummary> {
  if (bookId) await getLedgerBook(supabase, householdId, bookId);
  const { from, to } = getDateRange({ year, month });

  const query = supabase
    .from("ledger_entries")
    .select("type, amount, is_shared, owner_id")
    .eq("household_id", householdId)
    .gte("transacted_at", from)
    .lt("transacted_at", to);
  if (bookId) query.eq("book_id", bookId);
  const { data, error } = await query;

  if (error) {
    console.error("Ledger summary fetch error:", error);
    throw new APIError(
      "LEDGER_FETCH_ERROR",
      "가계부 요약 조회에 실패했습니다.",
      500,
    );
  }

  const rows = (data ?? []).filter((row) =>
    scope === "all"
      ? true
      : scope === "shared"
        ? row.is_shared
        : !row.is_shared && row.owner_id === userId,
  );

  return calculateLedgerSummary(rows);
}

export async function getOwnLedgerActivity(
  supabase: SupabaseClient<Database>,
  householdId: string,
  ownerId: string,
  now = new Date(),
): Promise<OwnLedgerActivity> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("created_at")
    .eq("household_id", householdId)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Own ledger activity fetch error:", error);
    throw new APIError(
      "LEDGER_ACTIVITY_FETCH_ERROR",
      "가계부 기록 활동 조회에 실패했습니다.",
      500,
    );
  }

  const lastOwnLedgerEntryCreatedAt = data?.created_at ?? null;

  if (!lastOwnLedgerEntryCreatedAt) {
    return {
      hasRecentOwnLedgerActivity: false,
      lastOwnLedgerEntryCreatedAt,
    };
  }

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  return {
    hasRecentOwnLedgerActivity:
      new Date(lastOwnLedgerEntryCreatedAt).getTime() >= sevenDaysAgo.getTime(),
    lastOwnLedgerEntryCreatedAt,
  };
}

const ledgerWriteErrors: Record<string, [string, number]> = {
  AUTH_UNAUTHORIZED: ["로그인이 필요합니다.", 401],
  LEDGER_FORBIDDEN: ["가계부 기록에 대한 권한이 없습니다.", 403],
  LEDGER_NOT_FOUND: ["가계부 항목을 찾을 수 없습니다.", 404],
  LEDGER_BOOK_UNAVAILABLE: ["장부를 사용할 수 없습니다.", 404],
  BOOK_UNAVAILABLE: ["장부를 사용할 수 없습니다.", 404],
  LEDGER_BOOK_ARCHIVED: ["보관된 장부는 변경할 수 없습니다.", 409],
  BOOK_ARCHIVED: ["보관된 장부는 변경할 수 없습니다.", 409],
  ENTRY_CHANGED: ["기록이 다른 곳에서 변경되었습니다. 다시 불러와주세요.", 409],
  ENTRY_VERSION_REQUIRED: ["기록을 다시 불러온 뒤 장부를 변경해주세요.", 400],
  VISIBILITY_CHANGE_CONFIRMATION_REQUIRED: [
    "공개 대상 변경을 확인해주세요.",
    400,
  ],
  IDEMPOTENCY_CONFLICT: ["같은 저장 요청 키에 다른 내용이 있습니다.", 409],
  LEDGER_BOOK_NAME_CONFLICT: ["이미 사용 중인 장부 이름입니다.", 409],
  LEDGER_FINANCIAL_SOURCE_FORBIDDEN: [
    "계좌 또는 결제수단을 사용할 권한이 없습니다.",
    403,
  ],
  LEDGER_INVALID_TRANSFER_TARGET: ["사용할 수 없는 금융수단입니다.", 400],
  LEDGER_TRANSFER_EDIT_UNSUPPORTED: [
    "이체 기록의 금액·금융수단·내용은 수정할 수 없습니다. 장부는 변경할 수 있습니다.",
    400,
  ],
  LEDGER_TAG_INVALID_NAME: ["태그 이름이 올바르지 않습니다.", 400],
  LEDGER_TAG_LIMIT_EXCEEDED: ["태그는 최대 5개까지 지정할 수 있습니다.", 400],
  LEDGER_VALIDATION_ERROR: ["유효하지 않은 가계부 기록입니다.", 400],
};

async function writeLedgerEntry(
  supabase: SupabaseClient<Database>,
  operation: "create" | "update" | "delete",
  actorId: string,
  params?: CreateLedgerEntryParams | UpdateLedgerEntryParams,
  entryId?: string,
): Promise<LedgerEntry> {
  const payload =
    params &&
    Object.fromEntries(
      Object.entries({
        ...params,
        ...(params.tags !== undefined && {
          tags: normalizeLedgerTagInputs(params.tags ?? []),
        }),
      }).filter(([, value]) => value !== undefined),
    );
  const { data, error } = await supabase.rpc("write_ledger_entry", {
    p_operation: operation,
    p_actor_id: actorId,
    ...(payload && { p_payload: payload }),
    ...(entryId && { p_entry_id: entryId }),
  });

  if (error || !data) {
    const safeError =
      error?.code === "P0001" && ledgerWriteErrors[error.message];
    if (safeError) {
      const code =
        error!.message === "LEDGER_BOOK_UNAVAILABLE"
          ? "BOOK_UNAVAILABLE"
          : error!.message === "LEDGER_BOOK_ARCHIVED"
            ? "BOOK_ARCHIVED"
            : error!.message;
      throw new APIError(code, safeError[0], safeError[1]);
    }
    throw new APIError(
      `LEDGER_${operation.toUpperCase()}_ERROR`,
      `가계부 항목 ${operation === "create" ? "생성" : operation === "update" ? "수정" : "삭제"}에 실패했습니다.`,
      500,
    );
  }
  return data;
}

function isObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLedgerEntryJson(value: Json): value is LedgerEntry {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.household_id === "string" &&
    typeof value.owner_id === "string" &&
    typeof value.book_id === "string" &&
    typeof value.type === "string" &&
    typeof value.amount === "number" &&
    typeof value.transacted_at === "string" &&
    typeof value.updated_at === "string"
  );
}

export interface BatchLedgerEntryWriteResult {
  entries: LedgerEntry[];
  replayed: boolean;
}

export async function createBatchLedgerEntriesWithBalanceSync(
  supabase: SupabaseClient<Database>,
  actorId: string,
  householdId: string,
  entries: CreateLedgerEntryParams[],
  requestId?: string,
): Promise<BatchLedgerEntryWriteResult> {
  const payload = entries.map((entry) => ({
    ...entry,
    ownerId: actorId,
    householdId,
    ...(entry.tags !== undefined && {
      tags: normalizeLedgerTagInputs(entry.tags),
    }),
  }));
  const { data, error } = await supabase.rpc("write_ledger_entries_batch", {
    p_actor_id: actorId,
    p_household_id: householdId,
    p_entries: payload as Json,
    ...(requestId && { p_request_id: requestId }),
  });
  if (error) {
    const safeError =
      error.code === "P0001" && ledgerWriteErrors[error.message];
    if (safeError) {
      const code =
        error.message === "LEDGER_BOOK_UNAVAILABLE"
          ? "BOOK_UNAVAILABLE"
          : error.message === "LEDGER_BOOK_ARCHIVED"
            ? "BOOK_ARCHIVED"
            : error.message;
      throw new APIError(code, safeError[0], safeError[1]);
    }
    throw new APIError(
      "LEDGER_CREATE_ERROR",
      "가계부 항목 생성에 실패했습니다.",
      500,
    );
  }
  if (
    !isObject(data) ||
    !Array.isArray(data.entries) ||
    typeof data.replayed !== "boolean" ||
    !data.entries.every(isLedgerEntryJson)
  ) {
    throw new APIError(
      "LEDGER_CREATE_ERROR",
      "가계부 항목 생성에 실패했습니다.",
      500,
    );
  }
  return { entries: data.entries, replayed: data.replayed };
}

export async function createLedgerEntryWithBalanceSync(
  supabase: SupabaseClient<Database>,
  params: CreateLedgerEntryParams,
): Promise<LedgerEntry> {
  return writeLedgerEntry(supabase, "create", params.ownerId, params);
}

export async function updateLedgerEntryWithBalanceSync(
  supabase: SupabaseClient<Database>,
  entryId: string,
  ownerId: string,
  params: UpdateLedgerEntryParams,
): Promise<LedgerEntry> {
  return writeLedgerEntry(supabase, "update", ownerId, params, entryId);
}

export async function deleteLedgerEntryWithBalanceSync(
  supabase: SupabaseClient<Database>,
  entryId: string,
  ownerId: string,
  expectedUpdatedAt?: string,
): Promise<void> {
  await writeLedgerEntry(
    supabase,
    "delete",
    ownerId,
    { expectedUpdatedAt },
    entryId,
  );
}

// Keep legacy exports on the same transaction path, including balance and tags.
export const createLedgerEntry = createLedgerEntryWithBalanceSync;
export const updateLedgerEntry = updateLedgerEntryWithBalanceSync;
export const deleteLedgerEntry = deleteLedgerEntryWithBalanceSync;

export async function getLedgerEntryTitles(
  supabase: SupabaseClient<Database>,
  householdId: string,
  query: string,
): Promise<{ titles: string[]; hasMore: boolean }> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return { titles: [], hasMore: false };
  }

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("title")
    .eq("household_id", householdId)
    .not("title", "is", null)
    .ilike("title", `%${trimmedQuery}%`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Ledger titles fetch error:", error);
    throw new APIError(
      "LEDGER_TITLES_FETCH_ERROR",
      "가계부 제목 조회에 실패했습니다.",
      500,
    );
  }

  const titlesSet = new Set<string>();
  for (const row of data || []) {
    if (row.title) {
      titlesSet.add(row.title.trim());
    }
  }

  const uniqueTitles = Array.from(titlesSet);
  const hasMore = uniqueTitles.length > 10;
  const slicedTitles = uniqueTitles.slice(0, 10);

  return {
    titles: slicedTitles,
    hasMore,
  };
}
