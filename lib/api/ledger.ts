import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { CreateLedgerEntryInput } from "@/schemas/ledger-entry";
import type {
  Database,
  LedgerEntry,
  LedgerEntryType,
  PaymentMethodType,
} from "@/types";
import {
  attachTagsToLedgerEntries,
  replaceLedgerEntryTags,
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

export interface CreateLedgerEntryParams {
  householdId: string;
  ownerId: string;
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
  accountIds?: Array<string | null | undefined>;
  householdAccountIds?: Array<string | null | undefined>;
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
  const householdAccountIds = uniqueDefined(input.householdAccountIds ?? []);
  const allAccountIds = uniqueDefined([...accountIds, ...householdAccountIds]);
  const paymentMethodIds = uniqueDefined(input.paymentMethodIds ?? []);

  const [accountsResult, paymentMethodsResult] = await Promise.all([
    allAccountIds.length > 0
      ? supabase
          .from("accounts")
          .select("id, owner_id")
          .eq("household_id", input.householdId)
          .in("id", allAccountIds)
      : Promise.resolve({ data: [], error: null }),
    paymentMethodIds.length > 0
      ? supabase
          .from("payment_methods")
          .select("id, owner_id")
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
    (accountsResult.data ?? []).map((row) => [row.id, row.owner_id]),
  );
  const paymentMethodMap = new Map(
    (paymentMethodsResult.data ?? []).map((row) => [row.id, row.owner_id]),
  );

  const hasInvalidAccount = accountIds.some(
    (id) => accountMap.get(id) !== input.ownerId,
  );
  const hasInvalidHouseholdAccount = householdAccountIds.some(
    (id) => !accountMap.has(id),
  );
  const hasInvalidPaymentMethod = paymentMethodIds.some(
    (id) => paymentMethodMap.get(id) !== input.ownerId,
  );

  if (
    hasInvalidAccount ||
    hasInvalidHouseholdAccount ||
    hasInvalidPaymentMethod
  ) {
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
    return {
      from: `${options.date}T00:00:00.000Z`,
      to: `${options.date}T23:59:59.999Z`,
    };
  }

  const now = new Date();
  const year = options.year ?? now.getUTCFullYear();
  const month = options.month ?? now.getUTCMonth() + 1;

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return { from: from.toISOString(), to: to.toISOString() };
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
  return entry;
}

export async function getLedgerEntries(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options?: GetLedgerEntriesOptions,
): Promise<LedgerEntryWithDetails[]> {
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
    .lte("transacted_at", to);

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

  return attachLedgerEntryDetails(supabase, scopedRows);
}

export async function getLedgerEntrySummary(
  supabase: SupabaseClient<Database>,
  householdId: string,
  year: number,
  month: number,
  scope: "shared" | "personal" = "shared",
  userId?: string,
): Promise<LedgerEntrySummary> {
  const { from, to } = getDateRange({ year, month });

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("type, amount, is_shared, owner_id")
    .eq("household_id", householdId)
    .gte("transacted_at", from)
    .lte("transacted_at", to);

  if (error) {
    console.error("Ledger summary fetch error:", error);
    throw new APIError(
      "LEDGER_FETCH_ERROR",
      "가계부 요약 조회에 실패했습니다.",
      500,
    );
  }

  const rows = (data ?? []).filter((row) =>
    scope === "shared"
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

export async function createLedgerEntry(
  supabase: SupabaseClient<Database>,
  params: CreateLedgerEntryParams,
): Promise<LedgerEntry> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .insert({
      household_id: params.householdId,
      owner_id: params.ownerId,
      type: params.type,
      amount: params.amount,
      transacted_at: params.transactedAt,
      title: params.title ?? null,
      category_id: params.categoryId ?? null,
      from_account_id: params.fromAccountId ?? null,
      from_payment_method_id: params.fromPaymentMethodId ?? null,
      to_account_id: params.toAccountId ?? null,
      to_payment_method_id: params.toPaymentMethodId ?? null,
      is_shared: params.isShared ?? true,
      memo: params.memo ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Ledger entry insert error:", error);
    throw new APIError(
      "LEDGER_CREATE_ERROR",
      "가계부 항목 생성에 실패했습니다.",
      500,
    );
  }

  return data;
}

type AccountBalanceRow = {
  id: string;
  household_id: string;
  owner_id: string;
  balance: number | null;
};

type PaymentMethodBalanceRow = {
  id: string;
  household_id: string;
  type: PaymentMethodType;
  linked_account_id: string | null;
  balance: number | null;
};

function toBalanceEffectInput(
  params: Pick<
    CreateLedgerEntryParams,
    | "type"
    | "amount"
    | "fromAccountId"
    | "fromPaymentMethodId"
    | "toAccountId"
    | "toPaymentMethodId"
  >,
): LedgerBalanceEffectInput {
  return {
    type: params.type,
    amount: params.amount,
    fromAccountId: params.fromAccountId,
    fromPaymentMethodId: params.fromPaymentMethodId,
    toAccountId: params.toAccountId,
    toPaymentMethodId: params.toPaymentMethodId,
  };
}

async function fetchAccountBalanceRows(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, AccountBalanceRow>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("accounts")
    .select("id, household_id, owner_id, balance")
    .in("id", ids);

  if (error) {
    console.error("Account balance fetch error:", error);
    throw new APIError(
      "LEDGER_BALANCE_FETCH_ERROR",
      "계좌 잔액 조회에 실패했습니다.",
      500,
    );
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function fetchPaymentMethodBalanceRows(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, PaymentMethodBalanceRow>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, household_id, type, linked_account_id, balance")
    .in("id", ids);

  if (error) {
    console.error("Payment method balance fetch error:", error);
    throw new APIError(
      "LEDGER_BALANCE_FETCH_ERROR",
      "결제수단 잔액 조회에 실패했습니다.",
      500,
    );
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

function combineBalanceEffects(
  effects: LedgerBalanceEffect[],
): LedgerBalanceEffect[] {
  const combined = new Map<string, LedgerBalanceEffect>();

  for (const effect of effects) {
    const key = `${effect.table}:${effect.id}`;
    const existing = combined.get(key);
    if (existing) {
      existing.delta += effect.delta;
    } else {
      combined.set(key, { ...effect });
    }
  }

  return [...combined.values()].filter((effect) => effect.delta !== 0);
}

async function applyLedgerBalanceEffects(
  supabase: SupabaseClient<Database>,
  householdId: string,
  entryType: LedgerEntryType,
  effects: LedgerBalanceEffect[],
  ownerId?: string,
): Promise<void> {
  const combinedEffects = combineBalanceEffects(effects);
  const accountIds = combinedEffects
    .filter((effect) => effect.table === "accounts")
    .map((effect) => effect.id);
  const paymentMethodIds = combinedEffects
    .filter((effect) => effect.table === "payment_methods")
    .map((effect) => effect.id);

  const [accountMap, paymentMethodMap] = await Promise.all([
    fetchAccountBalanceRows(supabase, accountIds),
    fetchPaymentMethodBalanceRows(supabase, paymentMethodIds),
  ]);

  const now = new Date().toISOString();

  const applyAccountDelta = async (accountId: string, delta: number) => {
    const account = accountMap.get(accountId);
    if (!account || account.household_id !== householdId) {
      throw new APIError(
        "LEDGER_INVALID_TRANSFER_TARGET",
        "이체할 계좌를 찾을 수 없습니다.",
        400,
      );
    }

    if (ownerId && account.owner_id !== ownerId) {
      throw new APIError(
        "LEDGER_FINANCIAL_SOURCE_FORBIDDEN",
        "본인의 계좌 또는 결제수단만 기록에 사용할 수 있습니다.",
        403,
      );
    }

    if (account.balance === null) return;

    const nextBalance = account.balance + delta;
    account.balance = nextBalance;

    const { error } = await supabase
      .from("accounts")
      .update({
        balance: nextBalance,
        balance_updated_at: now,
        updated_at: now,
      })
      .eq("id", accountId);

    if (error) {
      console.error("Account balance update error:", error);
      throw new APIError(
        "LEDGER_BALANCE_UPDATE_ERROR",
        "계좌 잔액 업데이트에 실패했습니다.",
        500,
      );
    }
  };

  for (const effect of combinedEffects) {
    if (effect.table === "accounts") {
      await applyAccountDelta(effect.id, effect.delta);
    } else {
      const paymentMethod = paymentMethodMap.get(effect.id);
      if (!paymentMethod || paymentMethod.household_id !== householdId) {
        throw new APIError(
          "LEDGER_INVALID_TRANSFER_TARGET",
          "이체할 결제수단을 찾을 수 없습니다.",
          400,
        );
      }

      const isAuxiliary = isTransferCapablePaymentMethod(paymentMethod.type);
      if (!isAuxiliary) {
        if (entryType === "transfer") {
          throw new APIError(
            "LEDGER_INVALID_TRANSFER_TARGET",
            "이체 가능한 결제수단이 아닙니다.",
            400,
          );
        }
        if (
          entryType === "expense" &&
          paymentMethod.type === "debit_card" &&
          paymentMethod.linked_account_id
        ) {
          if (!accountMap.has(paymentMethod.linked_account_id)) {
            const linkedAccountMap = await fetchAccountBalanceRows(supabase, [
              paymentMethod.linked_account_id,
            ]);
            for (const [id, account] of linkedAccountMap) {
              accountMap.set(id, account);
            }
          }
          await applyAccountDelta(
            paymentMethod.linked_account_id,
            effect.delta,
          );
        }
        continue;
      }

      const currentBalance = paymentMethod.balance ?? 0;
      const nextBalance = currentBalance + effect.delta;
      paymentMethod.balance = nextBalance;

      const { error } = await supabase
        .from("payment_methods")
        .update({
          balance: nextBalance,
          balance_updated_at: now,
          updated_at: now,
        })
        .eq("id", effect.id);

      if (error) {
        console.error("Payment method balance update error:", error);
        throw new APIError(
          "LEDGER_BALANCE_UPDATE_ERROR",
          "결제수단 잔액 업데이트에 실패했습니다.",
          500,
        );
      }
    }
  }
}

export async function createLedgerEntryWithBalanceSync(
  supabase: SupabaseClient<Database>,
  params: CreateLedgerEntryParams,
): Promise<LedgerEntry> {
  const ownerScopedAccountIds =
    params.type === "transfer"
      ? [params.fromAccountId]
      : [params.fromAccountId, params.toAccountId];
  const householdScopedAccountIds =
    params.type === "transfer" ? [params.toAccountId] : [];

  await assertLedgerFinancialSourceOwnership(supabase, {
    householdId: params.householdId,
    ownerId: params.ownerId,
    accountIds: ownerScopedAccountIds,
    householdAccountIds: householdScopedAccountIds,
    paymentMethodIds: [params.fromPaymentMethodId, params.toPaymentMethodId],
  });

  const effects = getLedgerBalanceEffects(toBalanceEffectInput(params));

  await applyLedgerBalanceEffects(
    supabase,
    params.householdId,
    params.type,
    effects,
    params.ownerId,
  );

  try {
    const created = await createLedgerEntry(supabase, params);
    if (params.tags) {
      await replaceLedgerEntryTags(supabase, {
        householdId: params.householdId,
        ledgerEntryId: created.id,
        ownerId: params.ownerId,
        tagNames: params.tags,
      });
    }
    return created;
  } catch (error) {
    if (effects.length > 0) {
      await applyLedgerBalanceEffects(
        supabase,
        params.householdId,
        params.type,
        effects.map((effect) => ({ ...effect, delta: -effect.delta })),
        params.ownerId,
      );
    }
    throw error;
  }
}

export async function updateLedgerEntry(
  supabase: SupabaseClient<Database>,
  entryId: string,
  ownerId: string,
  params: UpdateLedgerEntryParams,
): Promise<LedgerEntry> {
  const { data: existing } = await supabase
    .from("ledger_entries")
    .select(
      "id, owner_id, type, amount, title, transacted_at, category_id, from_account_id, from_payment_method_id, to_account_id, to_payment_method_id, memo",
    )
    .eq("id", entryId)
    .single();

  if (!existing) {
    throw new APIError(
      "LEDGER_NOT_FOUND",
      "가계부 항목을 찾을 수 없습니다.",
      404,
    );
  }

  if (existing.owner_id !== ownerId) {
    throw new APIError(
      "LEDGER_FORBIDDEN",
      "본인의 가계부 항목만 수정할 수 있습니다.",
      403,
    );
  }

  if (existing.type === "transfer") {
    const hasOtherChanges =
      (params.amount !== undefined && params.amount !== existing.amount) ||
      (params.title !== undefined && params.title !== existing.title) ||
      (params.transactedAt !== undefined &&
        params.transactedAt !== existing.transacted_at) ||
      (params.categoryId !== undefined &&
        params.categoryId !== existing.category_id) ||
      (params.fromAccountId !== undefined &&
        params.fromAccountId !== existing.from_account_id) ||
      (params.fromPaymentMethodId !== undefined &&
        params.fromPaymentMethodId !== existing.from_payment_method_id) ||
      (params.toAccountId !== undefined &&
        params.toAccountId !== existing.to_account_id) ||
      (params.toPaymentMethodId !== undefined &&
        params.toPaymentMethodId !== existing.to_payment_method_id) ||
      (params.memo !== undefined && params.memo !== existing.memo) ||
      (params.type !== undefined && params.type !== existing.type);

    if (hasOtherChanges) {
      throw new APIError(
        "LEDGER_TRANSFER_EDIT_UNSUPPORTED",
        "이체 기록은 태그 외의 정보를 수정할 수 없습니다. 삭제 후 다시 등록해주세요.",
        400,
      );
    }
  }

  const { data, error } = await supabase
    .from("ledger_entries")
    .update({
      ...(params.type !== undefined && { type: params.type }),
      ...(params.amount !== undefined && { amount: params.amount }),
      ...(params.transactedAt !== undefined && {
        transacted_at: params.transactedAt,
      }),
      ...(params.title !== undefined && { title: params.title }),
      ...(params.categoryId !== undefined && {
        category_id: params.categoryId,
      }),
      ...(params.fromAccountId !== undefined && {
        from_account_id: params.fromAccountId,
      }),
      ...(params.fromPaymentMethodId !== undefined && {
        from_payment_method_id: params.fromPaymentMethodId,
      }),
      ...(params.toAccountId !== undefined && {
        to_account_id: params.toAccountId,
      }),
      ...(params.toPaymentMethodId !== undefined && {
        to_payment_method_id: params.toPaymentMethodId,
      }),
      ...(params.memo !== undefined && { memo: params.memo }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .select()
    .single();

  if (error) {
    console.error("Ledger entry update error:", error);
    throw new APIError(
      "LEDGER_UPDATE_ERROR",
      "가계부 항목 수정에 실패했습니다.",
      500,
    );
  }

  return data;
}

export async function updateLedgerEntryWithBalanceSync(
  supabase: SupabaseClient<Database>,
  entryId: string,
  ownerId: string,
  params: UpdateLedgerEntryParams,
): Promise<LedgerEntry> {
  const { data: existing } = await supabase
    .from("ledger_entries")
    .select(
      "id, household_id, owner_id, type, amount, transacted_at, title, category_id, from_account_id, from_payment_method_id, to_account_id, to_payment_method_id, is_shared, memo",
    )
    .eq("id", entryId)
    .single();

  if (!existing) {
    throw new APIError(
      "LEDGER_NOT_FOUND",
      "가계부 항목을 찾을 수 없습니다.",
      404,
    );
  }

  if (existing.owner_id !== ownerId) {
    throw new APIError(
      "LEDGER_FORBIDDEN",
      "본인의 가계부 항목만 수정할 수 있습니다.",
      403,
    );
  }

  if (existing.type === "transfer") {
    const hasOtherChanges =
      (params.amount !== undefined && params.amount !== existing.amount) ||
      (params.title !== undefined && params.title !== existing.title) ||
      (params.transactedAt !== undefined &&
        params.transactedAt !== existing.transacted_at) ||
      (params.categoryId !== undefined &&
        params.categoryId !== existing.category_id) ||
      (params.fromAccountId !== undefined &&
        params.fromAccountId !== existing.from_account_id) ||
      (params.fromPaymentMethodId !== undefined &&
        params.fromPaymentMethodId !== existing.from_payment_method_id) ||
      (params.toAccountId !== undefined &&
        params.toAccountId !== existing.to_account_id) ||
      (params.toPaymentMethodId !== undefined &&
        params.toPaymentMethodId !== existing.to_payment_method_id) ||
      (params.memo !== undefined && params.memo !== existing.memo) ||
      (params.type !== undefined && params.type !== existing.type);

    if (hasOtherChanges) {
      throw new APIError(
        "LEDGER_TRANSFER_EDIT_UNSUPPORTED",
        "이체 기록은 태그 외의 정보를 수정할 수 없습니다. 삭제 후 다시 등록해주세요.",
        400,
      );
    }

    // Early return for tag-only transfer updates (avoids ownership checks and balance sync on unchanged accounts)
    const updated = await updateLedgerEntry(supabase, entryId, ownerId, params);
    if (params.tags !== undefined) {
      await replaceLedgerEntryTags(supabase, {
        householdId: existing.household_id,
        ledgerEntryId: existing.id,
        ownerId,
        tagNames: params.tags,
      });
    }
    return updated;
  }

  const nextType = params.type ?? existing.type;
  const nextAmount = params.amount ?? existing.amount;
  const nextFromAccountId =
    params.fromAccountId !== undefined
      ? params.fromAccountId
      : existing.from_account_id;
  const nextFromPaymentMethodId =
    params.fromPaymentMethodId !== undefined
      ? params.fromPaymentMethodId
      : existing.from_payment_method_id;
  const nextToAccountId =
    params.toAccountId !== undefined
      ? params.toAccountId
      : existing.to_account_id;
  const nextToPaymentMethodId =
    params.toPaymentMethodId !== undefined
      ? params.toPaymentMethodId
      : existing.to_payment_method_id;

  await assertLedgerFinancialSourceOwnership(supabase, {
    householdId: existing.household_id,
    ownerId,
    accountIds: [nextFromAccountId, nextToAccountId],
    paymentMethodIds: [nextFromPaymentMethodId, nextToPaymentMethodId],
  });

  const oldEffects = getLedgerBalanceEffects({
    type: existing.type,
    amount: existing.amount,
    fromAccountId: existing.from_account_id,
    fromPaymentMethodId: existing.from_payment_method_id,
    toAccountId: existing.to_account_id,
    toPaymentMethodId: existing.to_payment_method_id,
  });
  const newEffects = getLedgerBalanceEffects({
    type: nextType,
    amount: nextAmount,
    fromAccountId: nextFromAccountId,
    fromPaymentMethodId: nextFromPaymentMethodId,
    toAccountId: nextToAccountId,
    toPaymentMethodId: nextToPaymentMethodId,
  });
  const balanceEffects = [
    ...oldEffects.map((effect) => ({ ...effect, delta: -effect.delta })),
    ...newEffects,
  ];

  await applyLedgerBalanceEffects(
    supabase,
    existing.household_id,
    nextType,
    balanceEffects,
    ownerId,
  );

  try {
    const updated = await updateLedgerEntry(supabase, entryId, ownerId, params);
    if (params.tags !== undefined) {
      await replaceLedgerEntryTags(supabase, {
        householdId: existing.household_id,
        ledgerEntryId: existing.id,
        ownerId,
        tagNames: params.tags,
      });
    }
    return updated;
  } catch (error) {
    if (balanceEffects.length > 0) {
      await applyLedgerBalanceEffects(
        supabase,
        existing.household_id,
        existing.type,
        balanceEffects.map((effect) => ({ ...effect, delta: -effect.delta })),
        ownerId,
      );
    }
    throw error;
  }
}

export async function deleteLedgerEntry(
  supabase: SupabaseClient<Database>,
  entryId: string,
  ownerId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("ledger_entries")
    .select("id, owner_id")
    .eq("id", entryId)
    .single();

  if (!existing) {
    throw new APIError(
      "LEDGER_NOT_FOUND",
      "가계부 항목을 찾을 수 없습니다.",
      404,
    );
  }

  if (existing.owner_id !== ownerId) {
    throw new APIError(
      "LEDGER_FORBIDDEN",
      "본인의 가계부 항목만 삭제할 수 있습니다.",
      403,
    );
  }

  const { error } = await supabase
    .from("ledger_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    console.error("Ledger entry delete error:", error);
    throw new APIError(
      "LEDGER_DELETE_ERROR",
      "가계부 항목 삭제에 실패했습니다.",
      500,
    );
  }
}

export async function deleteLedgerEntryWithBalanceSync(
  supabase: SupabaseClient<Database>,
  entryId: string,
  ownerId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("ledger_entries")
    .select(
      "id, household_id, owner_id, type, amount, from_account_id, from_payment_method_id, to_account_id, to_payment_method_id",
    )
    .eq("id", entryId)
    .single();

  if (!existing) {
    throw new APIError(
      "LEDGER_NOT_FOUND",
      "가계부 항목을 찾을 수 없습니다.",
      404,
    );
  }

  if (existing.owner_id !== ownerId) {
    throw new APIError(
      "LEDGER_FORBIDDEN",
      "본인의 가계부 항목만 삭제할 수 있습니다.",
      403,
    );
  }

  const effects = getLedgerBalanceEffects({
    type: existing.type,
    amount: existing.amount,
    fromAccountId: existing.from_account_id,
    fromPaymentMethodId: existing.from_payment_method_id,
    toAccountId: existing.to_account_id,
    toPaymentMethodId: existing.to_payment_method_id,
  });
  const reversedEffects = effects.map((effect) => ({
    ...effect,
    delta: -effect.delta,
  }));

  await applyLedgerBalanceEffects(
    supabase,
    existing.household_id,
    existing.type,
    reversedEffects,
    ownerId,
  );

  const { error } = await supabase
    .from("ledger_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    if (effects.length > 0) {
      await applyLedgerBalanceEffects(
        supabase,
        existing.household_id,
        existing.type,
        effects,
        ownerId,
      );
    }
    console.error("Ledger entry delete error:", error);
    throw new APIError(
      "LEDGER_DELETE_ERROR",
      "가계부 항목 삭제에 실패했습니다.",
      500,
    );
  }
}

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
