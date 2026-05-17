import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/api/account";
import { buildAssetsSummary } from "@/lib/api/assets-summary";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getPortfolioSummary } from "@/lib/api/portfolio";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/assets/summary
 * 자산 메인 화면 요약 데이터 - 포트폴리오 요약 + 계좌 수
 */
export async function GET() {
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
      return NextResponse.json({ data: buildAssetsSummary(null, 0) });
    }

    const [portfolio, accounts] = await Promise.all([
      getPortfolioSummary(supabase, householdId),
      getAccounts(supabase, householdId),
    ]);

    return NextResponse.json({
      data: buildAssetsSummary(portfolio, accounts.length),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Assets summary error:", error);
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
