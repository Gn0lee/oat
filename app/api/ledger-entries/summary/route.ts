import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerEntrySummary } from "@/lib/api/ledger";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ledger-entries/summary
 * 월간 수입/지출 요약 조회 (홈 화면용)
 *
 * Query params:
 *   ?year=2026&month=4  (없으면 당월)
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
    const now = new Date();
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : now.getUTCFullYear();
    const month = searchParams.get("month")
      ? Number(searchParams.get("month"))
      : now.getUTCMonth() + 1;

    const summary = await getLedgerEntrySummary(
      supabase,
      householdId,
      year,
      month,
    );

    return NextResponse.json({ data: summary });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Ledger summary error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
