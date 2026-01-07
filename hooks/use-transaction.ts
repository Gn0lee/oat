"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  TransactionFilters,
  TransactionWithDetails,
} from "@/lib/api/transaction";
import { queries } from "@/lib/queries/keys";
import type { PaginatedResult } from "@/lib/utils/query";
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/schemas/transaction";
import type { Transaction } from "@/types";

interface TransactionResponse {
  data: Transaction;
}

interface TransactionError {
  error: {
    code: string;
    message: string;
  };
}

interface DeleteTransactionResponse {
  success: boolean;
}

// ============================================================================
// 거래 목록 조회
// ============================================================================

interface UseTransactionsParams {
  filters?: TransactionFilters;
  page?: number;
  pageSize?: number;
}

async function fetchTransactions(
  params: UseTransactionsParams,
): Promise<PaginatedResult<TransactionWithDetails>> {
  const searchParams = new URLSearchParams();
  if (params.filters?.type) searchParams.set("type", params.filters.type);
  if (params.filters?.ownerId)
    searchParams.set("ownerId", params.filters.ownerId);
  if (params.filters?.ticker) searchParams.set("ticker", params.filters.ticker);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const response = await fetch(`/api/transactions?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error("거래 내역 조회에 실패했습니다.");
  }
  return response.json();
}

export function useTransactions(params: UseTransactionsParams = {}) {
  return useQuery({
    queryKey: queries.transactions.list({
      memberId: params.filters?.ownerId,
      stockSymbol: params.filters?.ticker,
    }).queryKey,
    queryFn: () => fetchTransactions(params),
  });
}

// ============================================================================
// 거래 생성
// ============================================================================

async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const response = await fetch("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as TransactionError;
    throw new Error(error.error.message);
  }

  return (json as TransactionResponse).data;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queries.transactions._def });
      queryClient.invalidateQueries({ queryKey: queries.holdings._def });
      queryClient.invalidateQueries({ queryKey: queries.dashboard._def });
    },
  });
}

// ============================================================================
// 거래 수정
// ============================================================================

interface UpdateTransactionParams {
  id: string;
  data: UpdateTransactionInput;
}

async function updateTransaction({
  id,
  data,
}: UpdateTransactionParams): Promise<Transaction> {
  const response = await fetch(`/api/transactions/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as TransactionError;
    throw new Error(error.error.message);
  }

  return (json as TransactionResponse).data;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queries.transactions._def });
      queryClient.invalidateQueries({ queryKey: queries.holdings._def });
      queryClient.invalidateQueries({ queryKey: queries.dashboard._def });
    },
  });
}

// ============================================================================
// 거래 삭제
// ============================================================================

async function deleteTransaction(id: string): Promise<void> {
  const response = await fetch(`/api/transactions/${id}`, {
    method: "DELETE",
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as TransactionError;
    throw new Error(error.error.message);
  }

  // success 응답 확인
  const result = json as DeleteTransactionResponse;
  if (!result.success) {
    throw new Error("거래 삭제에 실패했습니다.");
  }
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queries.transactions._def });
      queryClient.invalidateQueries({ queryKey: queries.holdings._def });
      queryClient.invalidateQueries({ queryKey: queries.dashboard._def });
    },
  });
}
