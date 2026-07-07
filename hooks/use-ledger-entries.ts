"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApiData } from "@/lib/api/client";
import type {
  LedgerEntrySummary,
  LedgerEntryWithDetails,
} from "@/lib/api/ledger";
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
  scope?: "shared" | "personal";
  tagIds?: string[];
  categoryId?: string | null;
  childCategoryId?: string | null;
  categoryBreakdown?: "direct";
}

async function fetchLedgerEntries(
  params?: LedgerEntriesParams,
): Promise<LedgerEntryWithDetails[]> {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.month) searchParams.set("month", String(params.month));
  if (params?.date) searchParams.set("date", params.date);
  if (params?.scope) searchParams.set("scope", params.scope);
  if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params?.childCategoryId) {
    searchParams.set("childCategoryId", params.childCategoryId);
  }
  if (params?.categoryBreakdown) {
    searchParams.set("categoryBreakdown", params.categoryBreakdown);
  }
  if (params?.tagIds) {
    for (const tagId of params.tagIds) {
      searchParams.append("tagId", tagId);
    }
  }

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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queries.ledgerEntries.list(params).queryKey,
    queryFn: async () => {
      const entries = await fetchLedgerEntries(params);
      if (params?.date) {
        void queryClient.invalidateQueries({
          queryKey: queries.notifications._def,
        });
      }
      return entries;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: params?.date ? "always" : undefined,
  });
}

async function fetchLedgerEntry(id: string): Promise<LedgerEntryWithDetails> {
  return fetchApiData<LedgerEntryWithDetails>(`/api/ledger-entries/${id}`);
}

export function useLedgerEntry(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queries.ledgerEntries.detail(id).queryKey,
    queryFn: async () => {
      const entry = await fetchLedgerEntry(id);
      void queryClient.invalidateQueries({
        queryKey: queries.notifications._def,
      });
      return entry;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });
}

// ============================================================================
// 월간 수입/지출 요약 조회
// ============================================================================

export function useLedgerEntrySummary(
  year: number,
  month: number,
  scope: "shared" | "personal" = "shared",
) {
  return useQuery({
    queryKey: queries.ledgerEntries.summary(year, month, scope).queryKey,
    queryFn: () =>
      fetchApiData<LedgerEntrySummary>(
        `/api/ledger-entries/summary?year=${year}&month=${month}&scope=${scope}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// 가계부 항목 생성
// ============================================================================

async function createLedgerEntry(
  input: CreateLedgerEntryInput,
): Promise<LedgerEntry> {
  const response = await fetch("/api/ledger-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as LedgerError;
    throw new Error(error.error.message);
  }

  return (json as LedgerEntryResponse).data;
}

function invalidateLedgerBalanceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
  queryClient.invalidateQueries({ queryKey: queries.accounts._def });
  queryClient.invalidateQueries({ queryKey: queries.paymentMethods._def });
  queryClient.invalidateQueries({ queryKey: queries.ledgerTags._def });
  queryClient.invalidateQueries({ queryKey: queries.ledgerStats._def });
  queryClient.invalidateQueries({ queryKey: queries.home._def });
}

export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLedgerEntry,
    onSuccess: () => {
      invalidateLedgerBalanceQueries(queryClient);
    },
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
      invalidateLedgerBalanceQueries(queryClient);
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
      invalidateLedgerBalanceQueries(queryClient);
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
      invalidateLedgerBalanceQueries(queryClient);
    },
  });
}
