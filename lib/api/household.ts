import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, HouseholdRole } from "@/types";

/**
 * 구성원 정보 타입
 */
export interface HouseholdMemberInfo {
  userId: string;
  name: string;
  email: string;
  role: HouseholdRole;
  joinedAt: string;
}

/**
 * 가구 정보 타입
 */
export interface HouseholdInfo {
  id: string;
  name: string;
  members: HouseholdMemberInfo[];
}

/**
 * 사용자의 가구 정보 및 구성원 목록 조회
 */
export async function getHouseholdWithMembers(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<HouseholdInfo | null> {
  // 1. 사용자의 가구 조회
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return null;
  }

  const householdId = membership.household_id;

  // 2. 가구 정보 조회
  const { data: household } = await supabase
    .from("households")
    .select("id, name")
    .eq("id", householdId)
    .single();

  if (!household) {
    return null;
  }

  // 3. 구성원 목록 조회 (프로필 정보와 함께)
  const { data: members } = await supabase
    .from("household_members")
    .select(
      `
      user_id,
      role,
      joined_at,
      profiles (
        name,
        email
      )
    `,
    )
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });

  if (!members) {
    return null;
  }

  return {
    id: household.id,
    name: household.name,
    members: members.map((m) => ({
      userId: m.user_id,
      name: (m.profiles as { name: string; email: string })?.name || "",
      email: (m.profiles as { name: string; email: string })?.email || "",
      role: m.role,
      joinedAt: m.joined_at,
    })),
  };
}

/**
 * 가구 이름 수정 (owner만 가능)
 */
export async function updateHouseholdName(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  newName: string,
): Promise<{ id: string; name: string }> {
  // 1. 사용자가 해당 가구의 owner인지 확인
  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .single();

  if (membershipError || !membership) {
    throw new Error("가구 구성원이 아닙니다.");
  }

  if (membership.role !== "owner") {
    throw new Error("가구 이름 변경 권한이 없습니다.");
  }

  // 2. 가구 이름 업데이트
  const { data: updated, error: updateError } = await supabase
    .from("households")
    .update({ name: newName })
    .eq("id", householdId)
    .select("id, name")
    .single();

  if (updateError || !updated) {
    throw new Error("가구 이름 변경에 실패했습니다.");
  }

  return updated;
}
