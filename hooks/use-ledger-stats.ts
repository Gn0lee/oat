"use client";

import { useQuery } from "@tanstack/react-query";
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
  StatsScope,
} from "@/lib/api/ledger-stats";
import { queries } from "@/lib/queries/keys";

export function useLedgerStatsSummary(year: number, month: number) {
  return useQuery({
    queryKey: queries.ledgerStats.summary(year, month).queryKey,
    queryFn: () =>
      fetchApiData<LedgerStatsSummary>(
        `/api/ledger/stats/summary?year=${year}&month=${month}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLedgerStatsByMember(year: number, month: number) {
  return useQuery({
    queryKey: queries.ledgerStats.byMember(year, month).queryKey,
    queryFn: () =>
      fetchApiData<LedgerStatsByMemberResult>(
        `/api/ledger/stats/by-member?year=${year}&month=${month}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLedgerStatsByCategory(
  year: number,
  month: number,
  type: "expense" | "income",
  scope: StatsScope,
) {
  return useQuery({
    queryKey: queries.ledgerStats.byCategory(year, month, type, scope).queryKey,
    queryFn: () =>
      fetchApiData<LedgerStatsByCategoryResult>(
        `/api/ledger/stats/by-category?year=${year}&month=${month}&type=${type}&scope=${scope}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLedgerStatsByPaymentMethod(
  year: number,
  month: number,
  scope: StatsScope,
) {
  return useQuery({
    queryKey: queries.ledgerStats.byPaymentMethod(year, month, scope).queryKey,
    queryFn: () =>
      fetchApiData<LedgerStatsByPaymentMethodResult>(
        `/api/ledger/stats/by-payment-method?year=${year}&month=${month}&scope=${scope}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLedgerStatsTrend(months = 6, scope?: string) {
  return useQuery({
    queryKey: queries.ledgerStats.trend(months, scope).queryKey,
    queryFn: () =>
      fetchApiData<LedgerStatsTrendResult>(
        `/api/ledger/stats/trend?months=${months}${scope ? `&scope=${scope}` : ""}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLedgerStatsDaily(
  year: number,
  month: number,
  scope: StatsScope,
) {
  return useQuery({
    queryKey: queries.ledgerStats.daily(year, month, scope).queryKey,
    queryFn: () =>
      fetchApiData<LedgerStatsDailyResult>(
        `/api/ledger/stats/daily?year=${year}&month=${month}&scope=${scope}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLedgerStatsDetail(params: LedgerStatsDetailParams | null) {
  return useQuery({
    queryKey: queries.ledgerStats.detail(params ?? undefined).queryKey,
    queryFn: () => {
      if (!params) {
        throw new Error("상세 조회 조건이 필요합니다.");
      }
      const searchParams = new URLSearchParams({
        kind: params.kind,
        scope: params.scope,
      });
      if (params.year) searchParams.set("year", String(params.year));
      if (params.month) searchParams.set("month", String(params.month));
      if (params.date) searchParams.set("date", params.date);
      if (params.type) searchParams.set("type", params.type);
      if (params.categoryId) searchParams.set("categoryId", params.categoryId);
      if (params.paymentMethodId) {
        searchParams.set("paymentMethodId", params.paymentMethodId);
      }
      if (params.limit) searchParams.set("limit", String(params.limit));
      return fetchApiData<LedgerStatsDetailResult>(
        `/api/ledger/stats/details?${searchParams.toString()}`,
      );
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 5,
  });
}
