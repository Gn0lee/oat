import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { CreateLedgerEntryInput } from "@/schemas/ledger-entry";
import type { Database, LedgerEntry, LedgerEntryType } from "@/types";

export interface LedgerItemFormData {
  amount: string;
  title: string;
  categoryId: string;
  paymentMethodId?: string;
  accountId?: string;
  transactedAt: string;
  memo?: string;
}

export function buildLedgerEntryPayload(
  type: "expense" | "income",
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
    categoryId: item.categoryId,
    isShared,
    memo: item.memo || undefined,
  };

  if (type === "expense" && item.paymentMethodId) {
    base.fromPaymentMethodId = item.paymentMethodId;
  }
  if (type === "income" && item.accountId) {
    base.toAccountId = item.accountId;
  }

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
}

export interface LedgerEntrySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface GetLedgerEntriesOptions {
  year?: number;
  month?: number;
  date?: string;
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
  isShared?: boolean;
  memo?: string | null;
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

export async function getLedgerEntries(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options?: GetLedgerEntriesOptions,
): Promise<LedgerEntryWithDetails[]> {
  const { from, to } = getDateRange(options ?? {});

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("household_id", householdId)
    .gte("transacted_at", from)
    .lte("transacted_at", to)
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

  if (rows.length === 0) {
    return [];
  }

  // 관련 ID 수집
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
  ] = await Promise.all([
    ownerIds.length > 0
      ? supabase.from("profiles").select("id, name").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length > 0
      ? supabase
          .from("categories")
          .select("id, name, icon")
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
  ]);

  const ownerMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const categoryMap = new Map(
    (categories ?? []).map((c) => [c.id, { name: c.name, icon: c.icon }]),
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
      ? (categoryMap.get(r.category_id)?.name ?? null)
      : null,
    categoryIcon: r.category_id
      ? (categoryMap.get(r.category_id)?.icon ?? null)
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
  }));
}

export async function getLedgerEntrySummary(
  supabase: SupabaseClient<Database>,
  householdId: string,
  year: number,
  month: number,
): Promise<LedgerEntrySummary> {
  const { from, to } = getDateRange({ year, month });

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("type, amount")
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

  return calculateLedgerSummary(data ?? []);
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

export async function updateLedgerEntry(
  supabase: SupabaseClient<Database>,
  entryId: string,
  ownerId: string,
  params: UpdateLedgerEntryParams,
): Promise<LedgerEntry> {
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
      "본인의 가계부 항목만 수정할 수 있습니다.",
      403,
    );
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
      ...(params.isShared !== undefined && { is_shared: params.isShared }),
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
