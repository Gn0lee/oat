"use client";

import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { LedgerTag } from "@/types";

interface LedgerTagListResponse {
  data: LedgerTag[];
}

interface LedgerTagError {
  error: {
    code: string;
    message: string;
  };
}

async function fetchLedgerTags(params?: {
  scope?: "shared" | "personal";
}): Promise<LedgerTag[]> {
  const url = params?.scope
    ? `/api/ledger-tags?scope=${params.scope}`
    : "/api/ledger-tags";
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok) {
    const error = json as LedgerTagError;
    throw new Error(error.error.message);
  }

  return (json as LedgerTagListResponse).data;
}

export function useLedgerTags(params?: { scope?: "shared" | "personal" }) {
  return useQuery({
    queryKey: queries.ledgerTags.list(params).queryKey,
    queryFn: () => fetchLedgerTags(params),
    staleTime: 1000 * 60 * 5,
  });
}
