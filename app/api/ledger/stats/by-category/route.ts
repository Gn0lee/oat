import type { NextRequest } from "next/server";
import { APIError } from "@/lib/api/error";
import { getLedgerStatsByCategory } from "@/lib/api/ledger-stats";
import {
  parseLedgerStatsMonth,
  parseLedgerStatsScope,
} from "@/lib/api/ledger-stats-query";
import { respondWithLedgerStats } from "@/lib/api/ledger-stats-route";

/**
 * GET /api/ledger/stats/by-category
 * 카테고리별 지출/수입 집계
 *
 * Query params: ?year=2026&month=4, ?type=expense|income (기본 expense), ?book=<장부 ID>
 */
export function GET(request: NextRequest) {
  return respondWithLedgerStats(
    request,
    ({ supabase, householdId, searchParams }) => {
      const type = searchParams.get("type") ?? "expense";
      if (type !== "expense" && type !== "income") {
        throw new APIError(
          "VALIDATION_ERROR",
          "type은 expense 또는 income이어야 합니다.",
          400,
        );
      }
      return getLedgerStatsByCategory(supabase, householdId, {
        ...parseLedgerStatsMonth(searchParams),
        type,
        ...parseLedgerStatsScope(searchParams, "by-category"),
      });
    },
  );
}
