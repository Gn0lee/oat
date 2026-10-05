"use client";

import { useQuery } from "@tanstack/react-query";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { fetchApiData } from "@/lib/api/client";
import type {
  LedgerStatsByCategoryResult,
  LedgerStatsByMemberResult,
  LedgerStatsByPaymentMethodResult,
  LedgerStatsDailyResult,
  LedgerStatsDetailParams,
  LedgerStatsDetailResult,
  LedgerStatsSummary,
  LedgerStatsTrendResult,
} from "@/lib/api/ledger-stats";
import { queries } from "@/lib/queries/keys";

interface MonthParams {
  year: number;
  month: number;
  bookId?: string;
}

type StatsName =
  | "summary"
  | "by-member"
  | "by-category"
  | "by-payment-method"
  | "trend"
  | "daily"
  | "details";

// Every stats request names its book explicitly; no book means all books.
function statsUrl(
  name: StatsName,
  params: Record<string, string | number | null | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "bookId") continue;
    if (value !== undefined && value !== null && value !== "")
      search.set(key, String(value));
  }
  if (params.bookId) search.set("book", String(params.bookId));
  return `/api/ledger/stats/${name}?${search}`;
}

// The cache key carries the viewer so one user's analysis never renders for
// another account on the same device.
function useStatsQuery<T>(
  name: StatsName,
  params: Record<string, string | number | null | undefined>,
  enabled = true,
) {
  const { userId, householdId } = useLedgerIdentity();
  return useQuery({
    queryKey: queries.ledgerStats.query({
      name,
      params,
      userId,
      householdId,
    }).queryKey,
    queryFn: () => fetchApiData<T>(statsUrl(name, params)),
    enabled,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useLedgerStatsSummary(params: MonthParams) {
  return useStatsQuery<LedgerStatsSummary>("summary", { ...params });
}

export function useLedgerStatsByMember(params: MonthParams) {
  return useStatsQuery<LedgerStatsByMemberResult>("by-member", { ...params });
}

export function useLedgerStatsByCategory(
  params: MonthParams & { type: "expense" | "income" },
) {
  return useStatsQuery<LedgerStatsByCategoryResult>("by-category", {
    year: params.year,
    month: params.month,
    type: params.type,
    bookId: params.bookId,
  });
}

export function useLedgerStatsByPaymentMethod(params: MonthParams) {
  return useStatsQuery<LedgerStatsByPaymentMethodResult>("by-payment-method", {
    ...params,
  });
}

export function useLedgerStatsTrend(params: {
  months: number;
  bookId?: string;
}) {
  return useStatsQuery<LedgerStatsTrendResult>("trend", { ...params });
}

export function useLedgerStatsDaily(params: MonthParams) {
  return useStatsQuery<LedgerStatsDailyResult>("daily", { ...params });
}

export function useLedgerStatsDetail(params: LedgerStatsDetailParams | null) {
  return useStatsQuery<LedgerStatsDetailResult>(
    "details",
    params
      ? {
          kind: params.kind,
          year: params.year,
          month: params.month,
          date: params.date,
          type: params.type,
          categoryId: params.categoryId,
          childCategoryId: params.childCategoryId,
          categoryBreakdown: params.categoryBreakdown,
          paymentMethodId: params.paymentMethodId,
          limit: params.limit,
          bookId: params.bookId,
        }
      : {},
    Boolean(params),
  );
}
