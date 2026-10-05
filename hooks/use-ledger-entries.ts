"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { ApiQueryError, fetchApiData } from "@/lib/api/client";
import type {
  LedgerEntryScopedSearchResult,
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

interface MutationEnvelope<T> {
  data: T;
}

interface MutationErrorEnvelope {
  error?: { code?: string; message?: string };
}

interface LedgerError {
  error: { code: string; message: string };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readMutationBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const error =
      isObject(body) && isObject(body.error)
        ? (body.error as MutationErrorEnvelope["error"])
        : undefined;
    throw new ApiQueryError(
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "요청에 실패했습니다.",
      response.status,
    );
  }
  return body;
}

async function readMutationData<T>(response: Response): Promise<T> {
  const body = await readMutationBody(response);
  if (!isObject(body) || !("data" in body)) {
    throw new ApiQueryError(
      "INVALID_RESPONSE",
      "응답을 처리할 수 없습니다.",
      response.status,
    );
  }
  return (body as unknown as MutationEnvelope<T>).data;
}
export type CreateBatchLedgerEntriesInput =
  | CreateLedgerEntryInput[]
  | { entries: CreateLedgerEntryInput[]; requestId?: string };

// ============================================================================
// 가계부 항목 목록 조회
// ============================================================================

interface LedgerEntriesParams {
  bookId?: string;
  enabled?: boolean;
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
  if (params?.bookId) searchParams.set("book", params.bookId);
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
    throw new ApiQueryError(
      error.error.code,
      error.error.message,
      response.status,
    );
  }

  return (json as LedgerEntryListResponse).data;
}

export function useLedgerEntries(params?: LedgerEntriesParams) {
  const queryClient = useQueryClient();
  const identity = useLedgerIdentity();

  return useQuery({
    queryKey: queries.ledgerEntries.list({
      ...params,
      userId: identity.userId,
      householdId: identity.householdId,
    }).queryKey,
    enabled: params?.enabled,
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
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useLedgerEntrySearch(query: string, bookId?: string) {
  const normalizedQuery = query.trim();
  const identity = useLedgerIdentity();

  return useInfiniteQuery({
    queryKey: queries.ledgerEntries.search({
      query: normalizedQuery,
      bookId,
      userId: identity.userId,
      householdId: identity.householdId,
    }).queryKey,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ q: normalizedQuery });
      if (bookId) params.set("book", bookId);
      if (pageParam) params.set("cursor", pageParam);
      return fetchApiData<LedgerEntryScopedSearchResult>(
        `/api/ledger-entries/search?${params.toString()}`,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: normalizedQuery.replace(/\s/g, "").length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

async function fetchLedgerEntry(id: string): Promise<LedgerEntryWithDetails> {
  return fetchApiData<LedgerEntryWithDetails>(`/api/ledger-entries/${id}`);
}

export function useLedgerEntry(id: string) {
  const queryClient = useQueryClient();
  const identity = useLedgerIdentity();

  return useQuery({
    queryKey: [
      ...queries.ledgerEntries.detail(id).queryKey,
      identity.userId,
      identity.householdId,
    ],
    queryFn: async () => {
      const entry = await fetchLedgerEntry(id);
      void queryClient.invalidateQueries({
        queryKey: queries.notifications._def,
      });
      return entry;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// 월간 수입/지출 요약 조회
// ============================================================================

export function useLedgerEntrySummary(
  year: number,
  month: number,
  scope: "shared" | "personal" | "all" = "shared",
) {
  const identity = useLedgerIdentity();
  return useQuery({
    queryKey: [
      ...queries.ledgerEntries.summary(year, month, scope).queryKey,
      identity.userId,
      identity.householdId,
    ],
    queryFn: () =>
      fetchApiData<LedgerEntrySummary>(
        `/api/ledger-entries/summary?year=${year}&month=${month}&scope=${scope}`,
      ),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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
  return readMutationData<LedgerEntry>(response);
}

function invalidateLedgerBalanceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ["ledgerBooks"] });
  queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def });
  queryClient.invalidateQueries({ queryKey: queries.accounts._def });
  queryClient.invalidateQueries({ queryKey: queries.paymentMethods._def });
  queryClient.invalidateQueries({ queryKey: queries.ledgerTags._def });
  queryClient.invalidateQueries({ queryKey: queries.ledgerStats._def });
  queryClient.invalidateQueries({ queryKey: queries.home._def });
  queryClient.invalidateQueries({
    queryKey: queries.recordChangeRequests._def,
  });
  queryClient.invalidateQueries({ queryKey: queries.notifications._def });
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
  input: CreateBatchLedgerEntriesInput,
): Promise<BatchCreateResponse> {
  const payload = Array.isArray(input) ? { entries: input } : input;
  const response = await fetch("/api/ledger-entries/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readMutationBody(response);
  if (
    !isObject(body) ||
    !Array.isArray(body.data) ||
    typeof body.count !== "number"
  ) {
    throw new ApiQueryError(
      "INVALID_RESPONSE",
      "응답을 처리할 수 없습니다.",
      response.status,
    );
  }
  return { data: body.data as LedgerEntry[], count: body.count };
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
  return readMutationData<LedgerEntry>(response);
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

type DeleteLedgerEntryInput =
  | string
  | { id: string; expectedUpdatedAt?: string };

async function deleteLedgerEntry(input: DeleteLedgerEntryInput): Promise<void> {
  const id = typeof input === "string" ? input : input.id;
  const expectedUpdatedAt =
    typeof input === "string" ? undefined : input.expectedUpdatedAt;
  const response = await fetch(`/api/ledger-entries/${id}`, {
    method: "DELETE",
    ...(expectedUpdatedAt && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt }),
    }),
  });
  await readMutationBody(response);
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
