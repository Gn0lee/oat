import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerEntrySummary } from "@/lib/api/ledger";
import { getKstNow } from "@/lib/date";
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
    const now = getKstNow();
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : now.getUTCFullYear();
    const month = searchParams.get("month")
      ? Number(searchParams.get("month"))
      : now.getUTCMonth() + 1;
    const scopeParam = searchParams.get("scope");
    if (
      scopeParam !== null &&
      !["all", "shared", "personal"].includes(scopeParam)
    ) {
      throw new APIError(
        "VALIDATION_ERROR",
        "유효하지 않은 조회 범위입니다.",
        400,
      );
    }
    const bookId = searchParams.get("book") ?? undefined;
    if (bookId !== undefined && !z.uuid().safeParse(bookId).success) {
      throw new APIError(
        "VALIDATION_ERROR",
        "유효하지 않은 장부 ID입니다.",
        400,
      );
    }
    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 9999 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new APIError(
        "VALIDATION_ERROR",
        "유효하지 않은 조회 기간입니다.",
        400,
      );
    }
    const scope =
      !bookId && (scopeParam === "personal" || scopeParam === "shared")
        ? scopeParam
        : "all";

    const summary = await getLedgerEntrySummary(
      supabase,
      householdId,
      year,
      month,
      scope,
      user.id,
      bookId,
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
