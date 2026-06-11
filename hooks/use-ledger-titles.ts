"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queries } from "@/lib/queries/keys";

interface LedgerTitlesResponse {
  data: {
    titles: string[];
    hasMore: boolean;
  };
}

interface LedgerTitlesError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchLedgerTitles(
  query: string,
): Promise<{ titles: string[]; hasMore: boolean }> {
  if (query.trim().length < 2) {
    return { titles: [], hasMore: false };
  }

  const response = await fetch(
    `/api/ledger-entries/titles?query=${encodeURIComponent(query)}`,
  );
  const json = await response.json();

  if (!response.ok) {
    const error = json as LedgerTitlesError;
    throw new Error(error.error.message);
  }

  return (json as LedgerTitlesResponse).data;
}

export function useLedgerTitles(query: string) {
  const debouncedQuery = useDebouncedValue(query, 300);

  return useQuery({
    queryKey: queries.ledgerEntries.titles(debouncedQuery).queryKey,
    queryFn: () => fetchLedgerTitles(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60, // 1 minute stale time is reasonable for autocompletion
  });
}
