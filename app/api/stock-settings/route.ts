import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  getStockSettings,
  type StockSettingsFilters,
} from "@/lib/api/stock-settings";
import { createClient } from "@/lib/supabase/server";
import type { AssetType, MarketType, RiskLevel } from "@/types";

/**
 * GET /api/stock-settings
 * 종목 설정 목록 조회
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
    const assetType = searchParams.get("assetType") as AssetType | null;
    const riskLevel = searchParams.get("riskLevel") as
      | RiskLevel
      | "null"
      | null;
    const market = searchParams.get("market") as MarketType | null;
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const filters: StockSettingsFilters = {};
    if (assetType) filters.assetType = assetType;
    if (riskLevel) filters.riskLevel = riskLevel;
    if (market) filters.market = market;

    // 종목 설정 조회
    const result = await getStockSettings(supabase, householdId, {
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

    console.error("Stock settings list error:", error);
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
