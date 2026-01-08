import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Invitation } from "@/types";

const EXPIRY_HOURS = 24 * 7; // 7일

/**
 * 만료 시간 계산 (7일 후)
 */
export function getExpiryTime(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + EXPIRY_HOURS);
  return expiry.toISOString();
}

/**
 * 사용자의 household_id 조회
 */
export async function getUserHouseholdId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .single();

  return data?.household_id ?? null;
}

/**
 * 이메일로 초대 생성
 */
export async function createEmailInvitation(
  supabase: SupabaseClient<Database>,
  householdId: string,
  createdBy: string,
  email: string,
): Promise<Invitation> {
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      household_id: householdId,
      created_by: createdBy,
      email: email.toLowerCase().trim(),
      expires_at: getExpiryTime(),
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    // 중복 이메일 에러
    if (error.code === "23505") {
      throw new Error("이미 해당 이메일로 초대를 보냈습니다.");
    }
    throw error;
  }

  return data;
}

/**
 * 가구의 활성 초대 목록 조회 (pending 상태)
 */
export async function getPendingInvitations(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

/**
 * 특정 초대 조회
 */
export async function getInvitationById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Invitation | null> {
  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

/**
 * 초대 취소 (상태를 cancelled로 변경)
 */
export async function cancelInvitation(
  supabase: SupabaseClient<Database>,
  id: string,
  householdId: string,
): Promise<void> {
  const { error } = await supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) throw error;
}

/**
 * 초대 삭제
 */
export async function deleteInvitation(
  supabase: SupabaseClient<Database>,
  id: string,
  householdId: string,
): Promise<void> {
  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) throw error;
}

/**
 * 이메일로 기존 초대 조회
 */
export async function getInvitationByEmail(
  supabase: SupabaseClient<Database>,
  householdId: string,
  email: string,
): Promise<Invitation | null> {
  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("household_id", householdId)
    .eq("email", email.toLowerCase().trim())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  return data;
}

/**
 * 가구 구성원 수 조회
 */
export async function getHouseholdMemberCount(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<number> {
  const { count } = await supabase
    .from("household_members")
    .select("*", { count: "exact", head: true })
    .eq("household_id", householdId);

  return count ?? 0;
}

/**
 * 이메일로 기존 사용자 확인
 */
export async function checkExistingUserByEmail(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  return !!data;
}

/**
 * 현재 유저의 이메일로 pending 초대 조회
 */
export async function getPendingInvitationForUser(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<Invitation | null> {
  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * 초대 수락 처리
 * - 가구에 member로 추가
 * - 초대 상태를 accepted로 변경
 * RLS를 우회하기 위해 admin 클라이언트 사용
 */
export async function acceptInvitation(
  _supabase: SupabaseClient<Database>,
  invitation: Invitation,
  userId: string,
): Promise<void> {
  const adminClient = createAdminClient();

  // 가구에 member로 추가
  const { error: memberError } = await adminClient
    .from("household_members")
    .insert({
      household_id: invitation.household_id,
      user_id: userId,
      role: "member",
    });

  if (memberError) {
    // 이미 가구에 속해있는 경우
    if (memberError.code === "23505") {
      throw new Error("이미 가구에 속해있습니다.");
    }
    throw memberError;
  }

  // 초대 상태 업데이트
  const { error: inviteError } = await adminClient
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  if (inviteError) throw inviteError;
}

/**
 * 새 가구 생성 및 owner로 추가
 * RLS를 우회하기 위해 admin 클라이언트 사용
 */
export async function createHouseholdWithOwner(
  _supabase: SupabaseClient<Database>,
  userId: string,
  householdName = "우리집",
): Promise<string> {
  const adminClient = createAdminClient();

  // 새 가구 생성
  const { data: household, error: householdError } = await adminClient
    .from("households")
    .insert({ name: householdName })
    .select("id")
    .single();

  if (householdError) throw householdError;

  // owner로 추가
  const { error: memberError } = await adminClient
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: userId,
      role: "owner",
    });

  if (memberError) throw memberError;

  return household.id;
}
