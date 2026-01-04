"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queries } from "@/lib/queries/keys";
import type { CreateTransactionInput } from "@/schemas/transaction";
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
