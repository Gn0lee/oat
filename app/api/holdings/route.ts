import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getHoldings, type HoldingsFilters } from "@/lib/api/holdings";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";
import type { AssetType, MarketType } from "@/types";

/**
 * GET /api/holdings
 * 보유 현황 목록 조회
 */
export async function GET(request: NextRequest) {
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

    // Query params 파싱
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get("ownerId");
    const assetType = searchParams.get("assetType") as AssetType | null;
    const market = searchParams.get("market") as MarketType | null;
    const accountId = searchParams.get("accountId");
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const filters: HoldingsFilters = {};
    if (ownerId) filters.ownerId = ownerId;
    if (assetType) filters.assetType = assetType;
    if (market) filters.market = market;
    if (accountId) filters.accountId = accountId;

    // 보유 현황 조회
    const result = await getHoldings(supabase, householdId, {
      filters,
      pagination: { page, pageSize },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Holdings list error:", error);
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
