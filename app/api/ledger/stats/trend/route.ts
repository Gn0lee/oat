import type { NextRequest } from "next/server";
import { getLedgerStatsTrend } from "@/lib/api/ledger-stats";
import { parseLedgerStatsScope } from "@/lib/api/ledger-stats-query";
import { respondWithLedgerStats } from "@/lib/api/ledger-stats-route";

/**
 * GET /api/ledger/stats/trend
 * KST 당월까지 최근 N개월 수입·지출 추이
 *
 * Query params: ?months=6 (1~12), ?book=<장부 ID>
 */
export function GET(request: NextRequest) {
  return respondWithLedgerStats(
    request,
    ({ supabase, householdId, searchParams }) => {
      const requested = Number(searchParams.get("months") ?? 6);
      const months = Number.isInteger(requested)
        ? Math.min(Math.max(requested, 1), 12)
        : 6;
      return getLedgerStatsTrend(supabase, householdId, {
        months,
        ...parseLedgerStatsScope(searchParams, "trend"),
      });
    },
  );
}
