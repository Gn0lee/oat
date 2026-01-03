import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Invitation } from "@/types";

const CODE_LENGTH = 6;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동되는 문자 제외 (O,0,1,I)
const EXPIRY_HOURS = 24;

/**
 * 6자리 초대 코드 생성
 */
export function generateInvitationCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

/**
 * 만료 시간 계산 (24시간 후)
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
 * 초대 코드 생성 및 저장
 */
export async function createInvitation(
  supabase: SupabaseClient<Database>,
  householdId: string,
  createdBy: string,
): Promise<Invitation> {
  // 고유한 코드 생성 (충돌 시 재시도)
  let code = generateInvitationCode();
  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        household_id: householdId,
        code,
        created_by: createdBy,
        expires_at: getExpiryTime(),
      })
      .select()
      .single();

    if (!error && data) {
      return data;
    }

    // 코드 중복 에러인 경우 재시도
    if (error?.code === "23505") {
      code = generateInvitationCode();
      retries++;
      continue;
    }

    throw error;
  }

  throw new Error("초대 코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
}

/**
 * 가구의 활성 초대 코드 조회 (만료되지 않고 사용되지 않은)
 */
export async function getActiveInvitation(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<Invitation | null> {
  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("household_id", householdId)
    .is("used_by", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}
