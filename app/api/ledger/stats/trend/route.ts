import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerStatsTrend } from "@/lib/api/ledger-stats";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ledger/stats/trend
 * 가계부 통계 대시보드 - 최근 N개월 월별 수입/지출 추이
 *
 * Query params:
 *   ?months=6  (기본: 6, 최대: 12)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("AUTH_UNAUTHORIZED", "로그인이 필요합니다.", 401);
    }

    const householdId = await getUserHouseholdId(supabase, user.id);
    if (!householdId) {
      throw new APIError(
        "HOUSEHOLD_NOT_FOUND",
        "가구 정보를 찾을 수 없습니다.",
        404,
      );
    }

    const { searchParams } = request.nextUrl;
    const monthsParam = Number(searchParams.get("months") ?? 6);
    const months = Math.min(Math.max(monthsParam, 1), 12);

    const data = await getLedgerStatsTrend(
      supabase,
      householdId,
      user.id,
      months,
    );

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
