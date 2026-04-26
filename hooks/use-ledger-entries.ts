"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { queries } from "@/lib/queries/keys";
import type {
  CreateLedgerEntryInput,
  UpdateLedgerEntryInput,
} from "@/schemas/ledger-entry";
import type { LedgerEntry } from "@/types";

interface BatchCreateResponse {
  data: LedgerEntry[];
  count: number;
}

interface LedgerEntryListResponse {
  data: LedgerEntryWithDetails[];
}

interface LedgerEntryResponse {
  data: LedgerEntry;
}

interface LedgerError {
  error: {
    code: string;
    message: string;
  };
}

// ============================================================================
// 가계부 항목 목록 조회
// ============================================================================

interface LedgerEntriesParams {
  year?: number;
  month?: number;
  date?: string;
}

async function fetchLedgerEntries(
  params?: LedgerEntriesParams,
): Promise<LedgerEntryWithDetails[]> {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.month) searchParams.set("month", String(params.month));
  if (params?.date) searchParams.set("date", params.date);

  const url = `/api/ledger-entries${searchParams.toString() ? `?${searchParams}` : ""}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok) {
    const error = json as LedgerError;
    throw new Error(error.error.message);
  }

  return (json as LedgerEntryListResponse).data;
}

export function useLedgerEntries(params?: LedgerEntriesParams) {
  return useQuery({
    queryKey: queries.ledgerEntries.list(params).queryKey,
    queryFn: () => fetchLedgerEntries(params),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// 가계부 항목 일괄 생성
// ============================================================================

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

// ============================================================================
// 가계부 항목 수정
// ============================================================================

interface UpdateLedgerEntryParams {
  id: string;
  data: UpdateLedgerEntryInput;
}

async function updateLedgerEntry({
  id,
  data,
}: UpdateLedgerEntryParams): Promise<LedgerEntry> {
  const response = await fetch(`/api/ledger-entries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as LedgerError;
    throw new Error(error.error.message);
  }

  return (json as LedgerEntryResponse).data;
}

export function useUpdateLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLedgerEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
    },
  });
}

// ============================================================================
// 가계부 항목 삭제
// ============================================================================

async function deleteLedgerEntry(id: string): Promise<void> {
  const response = await fetch(`/api/ledger-entries/${id}`, {
    method: "DELETE",
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as LedgerError;
    throw new Error(error.error.message);
  }
}

export function useDeleteLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLedgerEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
    },
  });
}
