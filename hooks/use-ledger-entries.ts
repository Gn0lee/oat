"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { CreateLedgerEntryInput } from "@/schemas/ledger-entry";
import type { LedgerEntry } from "@/types";

interface BatchCreateResponse {
  data: LedgerEntry[];
  count: number;
}

interface LedgerError {
  error: {
    code: string;
    message: string;
  };
}

async function createBatchLedgerEntries(
  entries: CreateLedgerEntryInput[],
): Promise<BatchCreateResponse> {
  const response = await fetch("/api/ledger-entries/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as LedgerError;
    throw new Error(error.error.message);
  }

  return json as BatchCreateResponse;
}

export function useCreateBatchLedgerEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBatchLedgerEntries,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
    },
  });
}
