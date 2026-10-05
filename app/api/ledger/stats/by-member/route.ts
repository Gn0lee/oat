import type { NextRequest } from "next/server";
import { getLedgerStatsByMember } from "@/lib/api/ledger-stats";
import {
  parseLedgerStatsMonth,
  parseLedgerStatsScope,
} from "@/lib/api/ledger-stats-query";
import { respondWithLedgerStats } from "@/lib/api/ledger-stats-route";

/**
 * GET /api/ledger/stats/by-member
 * 구성원별 공용 지출·수입과 본인 개인 지출. 다른 구성원의 개인 지출은 비공개(null)
 *
 * Query params: ?year=2026&month=4, ?book=<장부 ID>
 */
export function GET(request: NextRequest) {
  return respondWithLedgerStats(
    request,
    ({ supabase, householdId, userId, searchParams }) => {
      // Member rows are always split by book visibility; a legacy scope has no
      // meaning here and is ignored.
      const { bookId } = parseLedgerStatsScope(searchParams, "by-member");
      return getLedgerStatsByMember(supabase, householdId, userId, {
        ...parseLedgerStatsMonth(searchParams),
        ...(bookId ? { bookId } : {}),
      });
    },
  );
}
