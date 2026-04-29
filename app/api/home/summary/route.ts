import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { buildHomeSummary } from "@/lib/api/home-summary";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerStatsSummary } from "@/lib/api/ledger-stats";
import { getPortfolioSummary } from "@/lib/api/portfolio";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/home/summary
 * 홈 화면 집계 데이터 - 현금흐름 요약 + 포트폴리오 요약
 *
 * Query params:
 *   ?year=2026&month=4  (없으면 당월)
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    const [cashFlow, portfolio] = await Promise.all([
      householdId
        ? getLedgerStatsSummary(supabase, householdId, user.id, year, month)
        : null,
      householdId ? getPortfolioSummary(supabase, householdId) : null,
    ]);

    const data = buildHomeSummary(cashFlow, portfolio);

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
