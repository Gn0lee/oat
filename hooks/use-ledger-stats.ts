"use client";

import { useQuery } from "@tanstack/react-query";
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

interface StatsError {
  error: { code: string; message: string };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok) {
    const err = json as StatsError;
    throw new Error(err.error?.message ?? "통계 조회에 실패했습니다.");
  }
  return (json as { data: T }).data;
}

export function useLedgerStatsSummary(year: number, month: number) {
  return useQuery({
    queryKey: queries.ledgerStats.summary(year, month).queryKey,
    queryFn: () =>
      fetchJson<LedgerStatsSummary>(
        `/api/ledger/stats/summary?year=${year}&month=${month}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLedgerStatsByMember(year: number, month: number) {
  return useQuery({
    queryKey: queries.ledgerStats.byMember(year, month).queryKey,
    queryFn: () =>
      fetchJson<LedgerStatsByMemberResult>(
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
      fetchJson<LedgerStatsByCategoryResult>(
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
      fetchJson<LedgerStatsByPaymentMethodResult>(
        `/api/ledger/stats/by-payment-method?year=${year}&month=${month}&scope=${scope}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLedgerStatsTrend(months = 6) {
  return useQuery({
    queryKey: queries.ledgerStats.trend(months).queryKey,
    queryFn: () =>
      fetchJson<LedgerStatsTrendResult>(
        `/api/ledger/stats/trend?months=${months}`,
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
      fetchJson<LedgerStatsDailyResult>(
        `/api/ledger/stats/daily?year=${year}&month=${month}&scope=${scope}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}
