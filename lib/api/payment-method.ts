import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { Database, PaymentMethod, PaymentMethodType } from "@/types";

const AUXILIARY_PAYMENT_METHOD_TYPES = new Set([
  "prepaid",
  "gift_card",
  "cash",
]);

export function normalizePaymentMethodBalance(
  type: PaymentMethodType,
  balance?: number | null,
): number | null {
  return AUXILIARY_PAYMENT_METHOD_TYPES.has(type) ? (balance ?? null) : null;
}

export interface CreatePaymentMethodParams {
  householdId: string;
  ownerId: string;
  name: string;
  type: PaymentMethodType;
  linkedAccountId?: string;
  issuer?: string;
  lastFour?: string;
  paymentDay?: number;
  balance?: number | null;
  isDefault?: boolean;
  memo?: string;
}

export interface UpdatePaymentMethodParams {
  name?: string;
  type?: PaymentMethodType;
  linkedAccountId?: string | null;
  issuer?: string | null;
  lastFour?: string | null;
  paymentDay?: number | null;
  balance?: number | null;
  isDefault?: boolean;
  memo?: string | null;
}

export interface PaymentMethodWithDetails {
  id: string;
  householdId: string;
  ownerId: string;
  ownerName: string;
  name: string;
  type: PaymentMethodType;
  linkedAccountId: string | null;
  linkedAccountName: string | null;
  issuer: string | null;
  lastFour: string | null;
  paymentDay: number | null;
  balance: number | null;
  balanceUpdatedAt: string | null;
  isDefault: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getPaymentMethods(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<PaymentMethodWithDetails[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Payment methods fetch error:", error);
    throw new APIError(
      "PAYMENT_METHOD_ERROR",
      "결제수단 목록 조회에 실패했습니다.",
      500,
    );
  }

  const ownerIds = [...new Set((data ?? []).map((pm) => pm.owner_id))];
  const accountIds = [
    ...new Set(
      (data ?? [])
        .map((pm) => pm.linked_account_id)
        .filter(Boolean) as string[],
    ),
  ];

  const [{ data: profiles }, { data: accounts }] = await Promise.all([
    ownerIds.length > 0
      ? supabase.from("profiles").select("id, name").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? supabase.from("accounts").select("id, name").in("id", accountIds)
      : Promise.resolve({ data: [] }),
  ]);

  const ownerMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const accountMap = new Map((accounts ?? []).map((a) => [a.id, a.name]));

  return (data ?? []).map((pm) => ({
    id: pm.id,
    householdId: pm.household_id,
    ownerId: pm.owner_id,
    ownerName: ownerMap.get(pm.owner_id) ?? "알 수 없음",
    name: pm.name,
    type: pm.type,
    linkedAccountId: pm.linked_account_id,
    linkedAccountName: pm.linked_account_id
      ? (accountMap.get(pm.linked_account_id) ?? null)
      : null,
    issuer: pm.issuer,
    lastFour: pm.last_four,
    paymentDay: pm.payment_day,
    balance: pm.balance,
    balanceUpdatedAt: pm.balance_updated_at,
    isDefault: pm.is_default ?? false,
    memo: pm.memo,
    createdAt: pm.created_at,
    updatedAt: pm.updated_at,
  }));
}

export async function createPaymentMethod(
  supabase: SupabaseClient<Database>,
  params: CreatePaymentMethodParams,
): Promise<PaymentMethod> {
  const {
    householdId,
    ownerId,
    name,
    type,
    linkedAccountId,
    issuer,
    lastFour,
    paymentDay,
    balance,
    isDefault,
    memo,
  } = params;

  // 동일 이름 결제수단 중복 확인
  const { data: existing } = await supabase
    .from("payment_methods")
    .select("id")
    .eq("household_id", householdId)
    .eq("owner_id", ownerId)
    .eq("name", name)
    .single();

  if (existing) {
    throw new APIError(
      "PAYMENT_METHOD_DUPLICATE",
      "동일한 이름의 결제수단이 이미 존재합니다.",
      400,
    );
  }

  // linkedAccountId가 같은 가구 소속인지 검증
  if (linkedAccountId) {
    const { data: linkedAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", linkedAccountId)
      .eq("household_id", householdId)
      .single();

    if (!linkedAccount) {
      throw new APIError(
        "ACCOUNT_NOT_FOUND",
        "연결할 계좌를 찾을 수 없습니다.",
        404,
      );
    }
  }

  // isDefault가 true이면 동일 소유자의 다른 결제수단 is_default를 false로
  if (isDefault) {
    await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("household_id", householdId)
      .eq("owner_id", ownerId);
  }

  const normalizedBalance = normalizePaymentMethodBalance(type, balance);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("payment_methods")
    .insert({
      household_id: householdId,
      owner_id: ownerId,
      name,
      type,
      linked_account_id: linkedAccountId ?? null,
      issuer: issuer || null,
      last_four: lastFour || null,
      payment_day: paymentDay ?? null,
      balance: normalizedBalance,
      balance_updated_at: normalizedBalance !== null ? now : null,
      is_default: isDefault ?? false,
      memo: memo || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Payment method insert error:", error);
    throw new APIError(
      "PAYMENT_METHOD_ERROR",
      "결제수단 생성에 실패했습니다.",
      500,
    );
  }

  return data;
}

export async function updatePaymentMethod(
  supabase: SupabaseClient<Database>,
  paymentMethodId: string,
  ownerId: string,
  params: UpdatePaymentMethodParams,
): Promise<PaymentMethod> {
  // 결제수단 존재 및 소유권 확인
  const { data: existing } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("id", paymentMethodId)
    .single();

  if (!existing) {
    throw new APIError(
      "PAYMENT_METHOD_NOT_FOUND",
      "결제수단을 찾을 수 없습니다.",
      404,
    );
  }

  if (existing.owner_id !== ownerId) {
    throw new APIError(
      "PAYMENT_METHOD_FORBIDDEN",
      "본인의 결제수단만 수정할 수 있습니다.",
      403,
    );
  }

  // 이름 변경 시 중복 확인
  if (params.name && params.name !== existing.name) {
    const { data: duplicate } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("household_id", existing.household_id)
      .eq("owner_id", ownerId)
      .eq("name", params.name)
      .single();

    if (duplicate) {
      throw new APIError(
        "PAYMENT_METHOD_DUPLICATE",
        "동일한 이름의 결제수단이 이미 존재합니다.",
        400,
      );
    }
  }

  // linkedAccountId 가구 소속 검증
  if (params.linkedAccountId) {
    const { data: linkedAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", params.linkedAccountId)
      .eq("household_id", existing.household_id)
      .single();

    if (!linkedAccount) {
      throw new APIError(
        "ACCOUNT_NOT_FOUND",
        "연결할 계좌를 찾을 수 없습니다.",
        404,
      );
    }
  }

  // isDefault가 true이면 동일 소유자의 다른 결제수단 is_default를 false로
  if (params.isDefault === true) {
    await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("household_id", existing.household_id)
      .eq("owner_id", ownerId)
      .neq("id", paymentMethodId);
  }

  const nextType = params.type ?? existing.type;
  const nextBalance =
    params.balance !== undefined ? params.balance : existing.balance;
  const normalizedBalance = normalizePaymentMethodBalance(
    nextType,
    nextBalance,
  );
  const shouldUpdateBalanceTimestamp =
    params.balance !== undefined || params.type !== undefined;
  const balanceUpdatedAt = shouldUpdateBalanceTimestamp
    ? normalizedBalance !== null
      ? new Date().toISOString()
      : null
    : undefined;

  const { data, error } = await supabase
    .from("payment_methods")
    .update({
      ...(params.name !== undefined && { name: params.name }),
      ...(params.type !== undefined && { type: params.type }),
      ...(params.linkedAccountId !== undefined && {
        linked_account_id: params.linkedAccountId,
      }),
      ...(params.issuer !== undefined && { issuer: params.issuer }),
      ...(params.lastFour !== undefined && { last_four: params.lastFour }),
      ...(params.paymentDay !== undefined && {
        payment_day: params.paymentDay,
      }),
      balance: normalizedBalance,
      ...(balanceUpdatedAt !== undefined && {
        balance_updated_at: balanceUpdatedAt,
      }),
      ...(params.isDefault !== undefined && { is_default: params.isDefault }),
      ...(params.memo !== undefined && { memo: params.memo }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentMethodId)
    .select()
    .single();

  if (error) {
    console.error("Payment method update error:", error);
    throw new APIError(
      "PAYMENT_METHOD_ERROR",
      "결제수단 수정에 실패했습니다.",
      500,
    );
  }

  return data;
}

export async function deletePaymentMethod(
  supabase: SupabaseClient<Database>,
  paymentMethodId: string,
  ownerId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("payment_methods")
    .select("id, owner_id")
    .eq("id", paymentMethodId)
    .single();

  if (!existing) {
    throw new APIError(
      "PAYMENT_METHOD_NOT_FOUND",
      "결제수단을 찾을 수 없습니다.",
      404,
    );
  }

  if (existing.owner_id !== ownerId) {
    throw new APIError(
      "PAYMENT_METHOD_FORBIDDEN",
      "본인의 결제수단만 삭제할 수 있습니다.",
      403,
    );
  }

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", paymentMethodId);

  if (error) {
    console.error("Payment method delete error:", error);
    throw new APIError(
      "PAYMENT_METHOD_ERROR",
      "결제수단 삭제에 실패했습니다.",
      500,
    );
  }
}
