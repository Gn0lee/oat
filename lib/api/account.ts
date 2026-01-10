import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, AccountType, Database } from "@/types";
import { APIError } from "./error";

export interface CreateAccountParams {
  householdId: string;
  ownerId: string;
  name: string;
  broker?: string;
  accountNumber?: string;
  accountType: AccountType;
  isDefault?: boolean;
  memo?: string;
}

export interface UpdateAccountParams {
  name?: string;
  broker?: string | null;
  accountNumber?: string | null;
  accountType?: AccountType;
  isDefault?: boolean;
  memo?: string | null;
}

export interface AccountWithOwner {
  id: string;
  householdId: string;
  ownerId: string;
  ownerName: string;
  name: string;
  broker: string | null;
  accountNumber: string | null;
  accountType: AccountType | null;
  isDefault: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 가구의 모든 계좌 조회
 */
export async function getAccounts(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<AccountWithOwner[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Accounts fetch error:", error);
    throw new APIError("ACCOUNT_ERROR", "계좌 목록 조회에 실패했습니다.", 500);
  }

  // 소유자 정보 조회
  const ownerIds = [...new Set((data ?? []).map((a) => a.owner_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", ownerIds);

  const ownerMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  return (data ?? []).map((account) => ({
    id: account.id,
    householdId: account.household_id,
    ownerId: account.owner_id,
    ownerName: ownerMap.get(account.owner_id) ?? "알 수 없음",
    name: account.name,
    broker: account.broker,
    accountNumber: account.account_number,
    accountType: account.account_type,
    isDefault: account.is_default ?? false,
    memo: account.memo,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  }));
}

/**
 * 계좌 생성
 * - is_default가 true이면 동일 소유자의 다른 계좌 is_default를 false로 변경
 */
export async function createAccount(
  supabase: SupabaseClient<Database>,
  params: CreateAccountParams,
): Promise<Account> {
  const {
    householdId,
    ownerId,
    name,
    broker,
    accountNumber,
    accountType,
    isDefault,
    memo,
  } = params;

  // 동일 이름 계좌 중복 확인
  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("household_id", householdId)
    .eq("owner_id", ownerId)
    .eq("name", name)
    .single();

  if (existing) {
    throw new APIError(
      "ACCOUNT_DUPLICATE",
      "동일한 이름의 계좌가 이미 존재합니다.",
      400,
    );
  }

  // is_default가 true이면 동일 소유자의 다른 계좌 is_default를 false로
  if (isDefault) {
    await supabase
      .from("accounts")
      .update({ is_default: false })
      .eq("household_id", householdId)
      .eq("owner_id", ownerId);
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      household_id: householdId,
      owner_id: ownerId,
      name,
      broker: broker || null,
      account_number: accountNumber || null,
      account_type: accountType,
      is_default: isDefault ?? false,
      memo: memo || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Account insert error:", error);
    throw new APIError("ACCOUNT_ERROR", "계좌 생성에 실패했습니다.", 500);
  }

  return data;
}

/**
 * 계좌 수정
 * - 소유권 확인 필수
 * - is_default가 true이면 동일 소유자의 다른 계좌 is_default를 false로 변경
 */
export async function updateAccount(
  supabase: SupabaseClient<Database>,
  accountId: string,
  ownerId: string,
  params: UpdateAccountParams,
): Promise<Account> {
  // 계좌 존재 및 소유권 확인
  const { data: existingAccount } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!existingAccount) {
    throw new APIError("ACCOUNT_NOT_FOUND", "계좌를 찾을 수 없습니다.", 404);
  }

  if (existingAccount.owner_id !== ownerId) {
    throw new APIError(
      "ACCOUNT_FORBIDDEN",
      "본인의 계좌만 수정할 수 있습니다.",
      403,
    );
  }

  // 이름 변경 시 중복 확인
  if (params.name && params.name !== existingAccount.name) {
    const { data: duplicate } = await supabase
      .from("accounts")
      .select("id")
      .eq("household_id", existingAccount.household_id)
      .eq("owner_id", ownerId)
      .eq("name", params.name)
      .single();

    if (duplicate) {
      throw new APIError(
        "ACCOUNT_DUPLICATE",
        "동일한 이름의 계좌가 이미 존재합니다.",
        400,
      );
    }
  }

  // is_default가 true이면 동일 소유자의 다른 계좌 is_default를 false로
  if (params.isDefault === true) {
    await supabase
      .from("accounts")
      .update({ is_default: false })
      .eq("household_id", existingAccount.household_id)
      .eq("owner_id", ownerId)
      .neq("id", accountId);
  }

  const { data, error } = await supabase
    .from("accounts")
    .update({
      ...(params.name !== undefined && { name: params.name }),
      ...(params.broker !== undefined && { broker: params.broker }),
      ...(params.accountNumber !== undefined && {
        account_number: params.accountNumber,
      }),
      ...(params.accountType !== undefined && {
        account_type: params.accountType,
      }),
      ...(params.isDefault !== undefined && { is_default: params.isDefault }),
      ...(params.memo !== undefined && { memo: params.memo }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .select()
    .single();

  if (error) {
    console.error("Account update error:", error);
    throw new APIError("ACCOUNT_ERROR", "계좌 수정에 실패했습니다.", 500);
  }

  return data;
}

/**
 * 계좌 삭제
 * - 소유권 확인 필수
 * - 연결된 거래의 account_id는 DB cascade로 null 처리
 */
export async function deleteAccount(
  supabase: SupabaseClient<Database>,
  accountId: string,
  ownerId: string,
): Promise<void> {
  // 계좌 존재 및 소유권 확인
  const { data: existingAccount } = await supabase
    .from("accounts")
    .select("id, owner_id")
    .eq("id", accountId)
    .single();

  if (!existingAccount) {
    throw new APIError("ACCOUNT_NOT_FOUND", "계좌를 찾을 수 없습니다.", 404);
  }

  if (existingAccount.owner_id !== ownerId) {
    throw new APIError(
      "ACCOUNT_FORBIDDEN",
      "본인의 계좌만 삭제할 수 있습니다.",
      403,
    );
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId);

  if (error) {
    console.error("Account delete error:", error);
    throw new APIError("ACCOUNT_ERROR", "계좌 삭제에 실패했습니다.", 500);
  }
}
