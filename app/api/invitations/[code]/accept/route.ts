import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { acceptInvitation } from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * POST /api/invitations/[code]/accept
 * 초대 코드 수락
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { code } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    // 초대 수락 처리
    const result = await acceptInvitation(supabase, code, user.id);

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    // acceptInvitation에서 던진 일반 Error
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: "INVITATION_ERROR",
            message: error.message,
          },
        },
        { status: 400 },
      );
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
