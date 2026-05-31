import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { buildHomeSummary } from "@/lib/api/home-summary";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getOwnLedgerActivity } from "@/lib/api/ledger";
import {
  getLedgerStatsByCategory,
  getLedgerStatsSummary,
} from "@/lib/api/ledger-stats";
import { getKstNow } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

async function getHomeAssetSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
) {
  const pageSize = 1000;
  let page = 1;
  let holdingCount = 0;
  let totalInvested = 0;
  const exchangeRateResult = await getExchangeRateSafe(supabase, "USD", "KRW");
  const exchangeRate = exchangeRateResult?.rate ?? 1300;

  while (true) {
    const holdings = await getHoldings(supabase, householdId, {
      pagination: { page, pageSize },
    });

    holdingCount = holdings.total;
    totalInvested += holdings.data.reduce((sum, holding) => {
      const invested =
        holding.currency === "USD"
          ? holding.totalInvested * exchangeRate
          : holding.totalInvested;

      return sum + invested;
    }, 0);

    if (page * pageSize >= holdings.total || holdings.data.length === 0) {
      break;
    }

    page += 1;
  }

  return {
    holdingCount,
    totalInvested,
  };
}

/**
 * GET /api/home/summary
 * 홈 화면 집계 데이터 - 현금흐름 요약 + 기록 기반 자산 요약
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
    const now = getKstNow();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    const [cashFlow, assets, topCategories, ledgerActivity, profileResult] =
      await Promise.all([
        householdId
          ? getLedgerStatsSummary(supabase, householdId, user.id, year, month)
          : null,
        householdId ? getHomeAssetSummary(supabase, householdId) : null,
        householdId
          ? getLedgerStatsByCategory(
              supabase,
              householdId,
              user.id,
              year,
              month,
              "expense",
              "shared",
            )
          : null,
        householdId
          ? getOwnLedgerActivity(supabase, householdId, user.id)
          : null,
        supabase.from("profiles").select("name").eq("id", user.id).single(),
      ]);

    const userName =
      profileResult.data?.name ?? user.email?.split("@")[0] ?? "사용자";

    const data = buildHomeSummary(
      cashFlow,
      assets,
      topCategories,
      householdId
        ? {
            hasRecentOwnLedgerActivity:
              ledgerActivity?.hasRecentOwnLedgerActivity ?? false,
            lastOwnLedgerEntryCreatedAt:
              ledgerActivity?.lastOwnLedgerEntryCreatedAt ?? null,
          }
        : null,
      userName,
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
