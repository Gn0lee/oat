import type { NextRequest } from "next/server";
import { getLedgerStatsSummary } from "@/lib/api/ledger-stats";
import {
  parseLedgerStatsMonth,
  parseLedgerStatsScope,
} from "@/lib/api/ledger-stats-query";
import { respondWithLedgerStats } from "@/lib/api/ledger-stats-route";

/**
 * GET /api/ledger/stats/summary
 * 수입·지출·차액과 공용/내 개인 하위 합계
 *
 * Query params: ?year=2026&month=4 (없으면 KST 당월), ?book=<장부 ID> (없으면 전체 장부)
 */
export function GET(request: NextRequest) {
  return respondWithLedgerStats(
    request,
    ({ supabase, householdId, searchParams }) =>
      getLedgerStatsSummary(supabase, householdId, {
        ...parseLedgerStatsMonth(searchParams),
        ...parseLedgerStatsScope(searchParams),
      }),
  );
}
