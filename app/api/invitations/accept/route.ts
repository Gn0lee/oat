import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  acceptInvitation,
  createHouseholdWithOwner,
  getPendingInvitationForUser,
  getUserHouseholdId,
} from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/invitations/accept
 * 초대 수락 (초대 콜백에서 호출)
 *
 * - 현재 유저의 이메일로 pending 초대가 있으면 수락
 * - 초대가 없으면 새 가구 생성
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    // 이미 가구에 속해있는지 확인
    const existingHouseholdId = await getUserHouseholdId(supabase, user.id);
    if (existingHouseholdId) {
      return NextResponse.json({
        data: {
          type: "existing",
          householdId: existingHouseholdId,
        },
      });
    }

    // pending 초대 확인
    const invitation = await getPendingInvitationForUser(supabase, user.email);

    if (invitation) {
      // 초대 수락
      await acceptInvitation(supabase, invitation, user.id);
      return NextResponse.json({
        data: {
          type: "invited",
          householdId: invitation.household_id,
        },
      });
    }

    // 초대가 없으면 새 가구 생성
    const newHouseholdId = await createHouseholdWithOwner(supabase, user.id);
    return NextResponse.json({
      data: {
        type: "new",
        householdId: newHouseholdId,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Invitation accept error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "서버 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
