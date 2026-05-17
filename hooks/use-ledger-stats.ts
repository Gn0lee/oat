"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApiData } from "@/lib/api/client";
import type {
  LedgerStatsByCategoryResult,
  LedgerStatsByMemberResult,
  LedgerStatsByPaymentMethodResult,
  LedgerStatsDailyResult,
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
