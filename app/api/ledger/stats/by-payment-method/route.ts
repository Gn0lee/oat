import type { NextRequest } from "next/server";
import { getLedgerStatsByPaymentMethod } from "@/lib/api/ledger-stats";
import {
  parseLedgerStatsMonth,
  parseLedgerStatsScope,
} from "@/lib/api/ledger-stats-query";
import { respondWithLedgerStats } from "@/lib/api/ledger-stats-route";

/**
 * GET /api/ledger/stats/by-payment-method
 * 결제수단별 지출 집계
 *
 * Query params: ?year=2026&month=4, ?book=<장부 ID>
 */
export function GET(request: NextRequest) {
  return respondWithLedgerStats(
    request,
    ({ supabase, householdId, searchParams }) =>
      getLedgerStatsByPaymentMethod(supabase, householdId, {
        ...parseLedgerStatsMonth(searchParams),
        ...parseLedgerStatsScope(searchParams),
      }),
  );
}
