import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import type { StatsScope } from "@/lib/api/ledger-stats";
import { getLedgerStatsByCategory } from "@/lib/api/ledger-stats";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ledger/stats/by-category
 * 가계부 통계 대시보드 - 카테고리별 지출/수입 집계
 *
 * Query params:
 *   ?year=2026&month=4   (없으면 당월)
 *   ?type=expense        (expense | income, 기본: expense)
 *   ?scope=all           (all | shared | personal, 기본: all)
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
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    const typeParam = searchParams.get("type") ?? "expense";
    if (typeParam !== "expense" && typeParam !== "income") {
      throw new APIError(
        "VALIDATION_ERROR",
        "type은 expense 또는 income이어야 합니다.",
        400,
      );
    }
    const type = typeParam as "expense" | "income";

    const scopeParam = searchParams.get("scope") ?? "all";
    if (
      scopeParam !== "all" &&
      scopeParam !== "shared" &&
      scopeParam !== "personal"
    ) {
      throw new APIError(
        "VALIDATION_ERROR",
        "scope은 all, shared, personal 중 하나여야 합니다.",
        400,
      );
    }
    const scope = scopeParam as StatsScope;

    const data = await getLedgerStatsByCategory(
      supabase,
      householdId,
      user.id,
      year,
      month,
      type,
      scope,
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
