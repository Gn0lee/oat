import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  deleteInvitation,
  getInvitationById,
  getUserHouseholdId,
} from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/invitations/[id]
 * 초대 취소 (삭제)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    // 사용자의 가구 조회
    const householdId = await getUserHouseholdId(supabase, user.id);

    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    // 초대 존재 확인
    const invitation = await getInvitationById(supabase, id);

    if (!invitation) {
      throw new APIError(
        "INVITATION_NOT_FOUND",
        "초대를 찾을 수 없습니다.",
        404,
      );
    }

    // 본인 가구의 초대인지 확인
    if (invitation.household_id !== householdId) {
      throw new APIError(
        "INVITATION_FORBIDDEN",
        "해당 초대를 취소할 권한이 없습니다.",
        403,
      );
    }

    // 초대 삭제
    await deleteInvitation(supabase, id, householdId);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Invitation delete error:", error);
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
