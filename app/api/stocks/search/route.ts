import { type NextRequest, NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { searchStocks } from "@/lib/api/stocks";
import { createClient } from "@/lib/supabase/server";
import type { MarketType } from "@/types";

/**
 * GET /api/stocks/search?q=삼성&market=KR&limit=20
 * 종목 검색 API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const market = searchParams.get("market") as MarketType | null;
    const limit = Number(searchParams.get("limit")) || 20;

    if (!query.trim()) {
      return NextResponse.json({ data: [] });
    }

    const supabase = await createClient();

    const stocks = await searchStocks(supabase, {
      query,
      market: market ?? undefined,
      limit,
    });

    return NextResponse.json({ data: stocks });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    console.error("Stock search error:", error);
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
