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

async function fetchLedgerTags(): Promise<LedgerTag[]> {
  const response = await fetch("/api/ledger-tags");
  const json = await response.json();

  if (!response.ok) {
    const error = json as LedgerTagError;
    throw new Error(error.error.message);
  }

  return (json as LedgerTagListResponse).data;
}

export function useLedgerTags() {
  return useQuery({
    queryKey: queries.ledgerTags.list.queryKey,
    queryFn: fetchLedgerTags,
    staleTime: 1000 * 60 * 5,
  });
}
