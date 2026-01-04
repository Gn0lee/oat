import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import {
  createInvitation,
  getActiveInvitation,
  getUserHouseholdId,
} from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/invitations
 * 초대 코드 생성
 * body.regenerate가 true이면 기존 코드 삭제 후 새로 생성
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // body 파싱 (optional)
    let regenerate = false;
    try {
      const body = await request.json();
      regenerate = body?.regenerate === true;
    } catch {
      // body가 없는 경우 무시
    }

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

    // 기존 활성 초대 코드 확인
    const existingInvitation = await getActiveInvitation(supabase, householdId);

    if (existingInvitation) {
      if (regenerate) {
        // 기존 코드 삭제
        await supabase
          .from("invitations")
          .delete()
          .eq("id", existingInvitation.id);
      } else {
        // 기존 활성 코드가 있으면 반환
        return NextResponse.json({ data: existingInvitation });
      }
    }

    // 새 초대 코드 생성
    const invitation = await createInvitation(supabase, householdId, user.id);

    return NextResponse.json({ data: invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Invitation creation error:", error);
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

/**
 * GET /api/invitations
 * 현재 활성 초대 코드 조회
 */
export async function GET() {
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

    // 사용자의 가구 조회
    const householdId = await getUserHouseholdId(supabase, user.id);

    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    // 활성 초대 코드 조회
    const invitation = await getActiveInvitation(supabase, householdId);

    return NextResponse.json({ data: invitation });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Invitation fetch error:", error);
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
