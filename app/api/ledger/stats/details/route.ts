import type { NextRequest } from "next/server";
import { APIError } from "@/lib/api/error";
import {
  getLedgerStatsDetail,
  type LedgerStatsDetailKind,
} from "@/lib/api/ledger-stats";
import {
  parseLedgerStatsMonth,
  parseLedgerStatsScope,
} from "@/lib/api/ledger-stats-query";
import { respondWithLedgerStats } from "@/lib/api/ledger-stats-route";
import { isLedgerRecordDate } from "@/lib/ledger-books/navigation";

function parseKind(value: string | null): LedgerStatsDetailKind {
  if (value === "category" || value === "payment-method" || value === "daily") {
    return value;
  }
  throw new APIError(
    "VALIDATION_ERROR",
    "kind는 category, payment-method, daily 중 하나여야 합니다.",
    400,
  );
}

/**
 * GET /api/ledger/stats/details
 * 분석 항목을 구성하는 원본 가계부 기록 조회
 *
 * Query params: ?kind=category|payment-method|daily, ?year&month 또는 ?date=YYYY-MM-DD,
 * ?type, ?categoryId, ?childCategoryId, ?categoryBreakdown=direct, ?paymentMethodId,
 * ?limit, ?book=<장부 ID>
 */
export function GET(request: NextRequest) {
  return respondWithLedgerStats(
    request,
    ({ supabase, householdId, searchParams }) => {
      const kind = parseKind(searchParams.get("kind"));
      const date = searchParams.get("date") ?? undefined;
      if (date !== undefined && !isLedgerRecordDate(date)) {
        throw new APIError(
          "VALIDATION_ERROR",
          "유효하지 않은 날짜입니다.",
          400,
        );
      }
      const typeParam = searchParams.get("type");
      const limit = Number(searchParams.get("limit") ?? 20);

      return getLedgerStatsDetail(supabase, householdId, {
        kind,
        ...parseLedgerStatsMonth(searchParams),
        date,
        type:
          typeParam === "income" || typeParam === "expense"
            ? typeParam
            : undefined,
        categoryId: searchParams.get("categoryId") ?? undefined,
        childCategoryId: searchParams.get("childCategoryId") ?? undefined,
        categoryBreakdown:
          searchParams.get("categoryBreakdown") === "direct"
            ? "direct"
            : undefined,
        paymentMethodId: searchParams.get("paymentMethodId") ?? undefined,
        limit: Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20,
        ...parseLedgerStatsScope(searchParams),
      });
    },
  );
}
