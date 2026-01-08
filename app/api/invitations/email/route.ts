import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  checkExistingUserByEmail,
  createEmailInvitation,
  getHouseholdMemberCount,
  getInvitationByEmail,
  getUserHouseholdId,
} from "@/lib/api/invitation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inviteEmailSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
});

/**
 * POST /api/invitations/email
 * 이메일로 초대 발송
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    // 요청 파싱
    const body = await request.json();
    const result = inviteEmailSchema.safeParse(body);

    if (!result.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        result.error.issues[0].message,
        400,
      );
    }

    const { email } = result.data;

    // 자기 자신 초대 방지
    if (user.email?.toLowerCase() === email.toLowerCase()) {
      throw new APIError(
        "INVITATION_SELF",
        "자기 자신을 초대할 수 없습니다.",
        400,
      );
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

    // 가구 구성원 수 확인 (최대 2명)
    const memberCount = await getHouseholdMemberCount(supabase, householdId);
    if (memberCount >= 2) {
      throw new APIError(
        "HOUSEHOLD_FULL",
        "가구 구성원이 최대 인원(2명)에 도달했습니다.",
        400,
      );
    }

    // 이미 가입된 사용자인지 확인
    const existingUser = await checkExistingUserByEmail(supabase, email);
    if (existingUser) {
      throw new APIError(
        "USER_ALREADY_EXISTS",
        "이미 가입된 이메일입니다. 해당 사용자에게 직접 연락하세요.",
        400,
      );
    }

    // 중복 초대 확인
    const existingInvitation = await getInvitationByEmail(
      supabase,
      householdId,
      email,
    );
    if (existingInvitation) {
      throw new APIError(
        "INVITATION_EXISTS",
        "이미 해당 이메일로 초대를 보냈습니다.",
        400,
      );
    }

    // Supabase Admin API로 초대 이메일 발송
    const adminClient = createAdminClient();
    const { error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          household_id: householdId,
          invited_by: user.id,
        },
      });

    if (inviteError) {
      console.error("Supabase invite error:", inviteError);
      throw new APIError(
        "INVITATION_SEND_FAILED",
        "초대 이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
        500,
      );
    }

    // invitations 테이블에 기록
    const invitation = await createEmailInvitation(
      supabase,
      householdId,
      user.id,
      email,
    );

    return NextResponse.json({ data: invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Invitation email error:", error);
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
