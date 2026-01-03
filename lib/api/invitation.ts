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

/**
 * 초대 코드 검증 에러 타입
 */
export type InvitationErrorCode =
  | "NOT_FOUND"
  | "EXPIRED"
  | "ALREADY_USED"
  | "SAME_HOUSEHOLD"
  | "HAS_MEMBERS";

/**
 * 초대 코드 검증 결과
 */
export interface InvitationValidation {
  valid: boolean;
  invitation: Invitation | null;
  error?: InvitationErrorCode;
}

/**
 * 초대 코드로 초대 정보 조회 (코드 유효성만 검증, 사용자 상태는 별도)
 */
export async function getInvitationByCode(
  supabase: SupabaseClient<Database>,
  code: string,
): Promise<Invitation | null> {
  // 코드 정규화 (대문자, 하이픈 제거)
  const normalizedCode = code.toUpperCase().replace(/-/g, "");

  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("code", normalizedCode)
    .single();

  return data;
}

/**
 * 초대 코드 유효성 검증
 */
export async function validateInvitationCode(
  supabase: SupabaseClient<Database>,
  code: string,
  userId: string,
): Promise<InvitationValidation> {
  const invitation = await getInvitationByCode(supabase, code);

  if (!invitation) {
    return { valid: false, invitation: null, error: "NOT_FOUND" };
  }

  if (invitation.used_by) {
    return { valid: false, invitation, error: "ALREADY_USED" };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { valid: false, invitation, error: "EXPIRED" };
  }

  // 이미 같은 가구에 속해있는지 확인
  const userHouseholdId = await getUserHouseholdId(supabase, userId);
  if (userHouseholdId === invitation.household_id) {
    return { valid: false, invitation, error: "SAME_HOUSEHOLD" };
  }

  return { valid: true, invitation };
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
 * 사용자 데이터를 새 가구로 마이그레이션
 */
async function migrateUserDataToNewHousehold(
  supabase: SupabaseClient<Database>,
  userId: string,
  oldHouseholdId: string,
  newHouseholdId: string,
): Promise<void> {
  // 1. transactions 이동
  await supabase
    .from("transactions")
    .update({ household_id: newHouseholdId })
    .eq("household_id", oldHouseholdId)
    .eq("owner_id", userId);

  // 2. household_stock_settings 이동 (사용자의 거래에 연결된 종목만)
  // 먼저 사용자의 거래에서 사용된 ticker 목록 조회
  const { data: userTickers } = await supabase
    .from("transactions")
    .select("ticker")
    .eq("household_id", newHouseholdId)
    .eq("owner_id", userId);

  if (userTickers && userTickers.length > 0) {
    const tickers = [...new Set(userTickers.map((t) => t.ticker))];

    // 기존 가구의 종목 설정 조회
    const { data: oldSettings } = await supabase
      .from("household_stock_settings")
      .select("*")
      .eq("household_id", oldHouseholdId)
      .in("ticker", tickers);

    if (oldSettings && oldSettings.length > 0) {
      // 새 가구에 종목 설정 upsert
      for (const setting of oldSettings) {
        await supabase.from("household_stock_settings").upsert(
          {
            household_id: newHouseholdId,
            ticker: setting.ticker,
            name: setting.name,
            asset_type: setting.asset_type,
            market: setting.market,
            currency: setting.currency,
            risk_level: setting.risk_level,
          },
          { onConflict: "household_id,ticker" },
        );
      }
    }
  }
}

/**
 * 초대 수락 처리
 */
export async function acceptInvitation(
  supabase: SupabaseClient<Database>,
  code: string,
  userId: string,
): Promise<{ householdId: string }> {
  // 1. 초대 코드 유효성 검증
  const validation = await validateInvitationCode(supabase, code, userId);

  if (!validation.valid || !validation.invitation) {
    const errorMessages: Record<InvitationErrorCode, string> = {
      NOT_FOUND: "유효하지 않은 초대 코드입니다.",
      EXPIRED: "만료된 초대 코드입니다.",
      ALREADY_USED: "이미 사용된 초대 코드입니다.",
      SAME_HOUSEHOLD: "이미 해당 가구의 구성원입니다.",
      HAS_MEMBERS: "이미 다른 가구에 소속되어 있습니다.",
    };
    throw new Error(
      errorMessages[validation.error!] || "초대 수락에 실패했습니다.",
    );
  }

  const invitation = validation.invitation;
  const newHouseholdId = invitation.household_id;

  // 2. 사용자의 현재 가구 확인
  const currentHouseholdId = await getUserHouseholdId(supabase, userId);

  if (currentHouseholdId) {
    // 3. 현재 가구의 구성원 수 확인
    const memberCount = await getHouseholdMemberCount(
      supabase,
      currentHouseholdId,
    );

    // 다른 구성원이 있으면 에러
    if (memberCount > 1) {
      throw new Error("이미 다른 가구에 소속되어 있습니다.");
    }

    // 4. 단독 가구인 경우 데이터 마이그레이션
    await migrateUserDataToNewHousehold(
      supabase,
      userId,
      currentHouseholdId,
      newHouseholdId,
    );

    // 5. 기존 가구에서 이탈 및 삭제
    await supabase
      .from("household_members")
      .delete()
      .eq("household_id", currentHouseholdId)
      .eq("user_id", userId);

    await supabase.from("households").delete().eq("id", currentHouseholdId);
  }

  // 6. 새 가구에 member 역할로 추가
  const { error: joinError } = await supabase.from("household_members").insert({
    household_id: newHouseholdId,
    user_id: userId,
    role: "member",
  });

  if (joinError) {
    throw new Error("새 가구에 합류하는 데 실패했습니다.");
  }

  // 7. 초대 코드 사용 처리
  await supabase
    .from("invitations")
    .update({
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  return { householdId: newHouseholdId };
}
