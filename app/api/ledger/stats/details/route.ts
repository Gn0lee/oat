import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  getLedgerStatsDetail,
  type LedgerStatsDetailKind,
  type StatsScope,
} from "@/lib/api/ledger-stats";
import { createClient } from "@/lib/supabase/server";

function parseScope(value: string | null): StatsScope {
  if (value === "all" || value === "shared" || value === "personal") {
    return value;
  }
  return "shared";
}

function parseKind(value: string | null): LedgerStatsDetailKind {
  if (value === "category" || value === "payment-method" || value === "daily") {
    return value;
  }
  throw new APIError(
    "VALIDATION_ERROR",
    "kind는 category, payment-method, daily 중 하나여야 합니다.",
    400,
  );
}

/**
 * GET /api/ledger/stats/details
 * 분석 항목을 구성하는 원본 가계부 기록 조회
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
    const kind = parseKind(searchParams.get("kind"));
    const typeParam = searchParams.get("type");
    const type =
      typeParam === "income" || typeParam === "expense" ? typeParam : undefined;

    const data = await getLedgerStatsDetail(supabase, householdId, user.id, {
      kind,
      year: Number(searchParams.get("year") ?? now.getFullYear()),
      month: Number(searchParams.get("month") ?? now.getMonth() + 1),
      date: searchParams.get("date") ?? undefined,
      type,
      scope: parseScope(searchParams.get("scope")),
      categoryId: searchParams.get("categoryId") ?? undefined,
      paymentMethodId: searchParams.get("paymentMethodId") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 20),
    });

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
