import type { NextRequest } from "next/server";
import { getLedgerStatsDaily } from "@/lib/api/ledger-stats";
import {
  parseLedgerStatsMonth,
  parseLedgerStatsScope,
} from "@/lib/api/ledger-stats-query";
import { respondWithLedgerStats } from "@/lib/api/ledger-stats-route";

/**
 * GET /api/ledger/stats/daily
 * KST 일별 수입·지출
 *
 * Query params: ?year=2026&month=4, ?book=<장부 ID>
 */
export function GET(request: NextRequest) {
  return respondWithLedgerStats(
    request,
    ({ supabase, householdId, searchParams }) =>
      getLedgerStatsDaily(supabase, householdId, {
        ...parseLedgerStatsMonth(searchParams),
        ...parseLedgerStatsScope(searchParams),
      }),
  );
}
