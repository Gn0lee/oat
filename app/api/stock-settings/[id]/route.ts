import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { updateStockSetting } from "@/lib/api/stock-settings";
import { createClient } from "@/lib/supabase/server";
import { updateStockSettingSchema } from "@/schemas/stock-setting";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/stock-settings/[id]
 * 종목 설정 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // 요청 body 파싱 및 검증
    const body = await request.json();
    const result = updateStockSettingSchema.safeParse(body);

    if (!result.success) {
      throw new APIError(
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        400,
      );
    }

    // 종목 설정 수정
    const updated = await updateStockSetting(supabase, id, householdId, {
      riskLevel: result.data.riskLevel,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Stock setting update error:", error);
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
