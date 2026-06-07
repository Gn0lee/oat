"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  AccountBalanceDetail,
  PaymentMethodBalanceDetail,
} from "@/lib/api/balance-adjustment";
import { queries } from "@/lib/queries/keys";
import type { BalanceAdjustmentTargetType } from "@/types";

interface ApiDataResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

export interface CreateBalanceAdjustmentClientInput {
  targetType: BalanceAdjustmentTargetType;
  accountId?: string;
  paymentMethodId?: string;
  actualBalance: number;
  adjustedAt?: string;
  memo?: string;
}

async function readApiJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiDataResponse<T> | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      (json as ApiErrorResponse).error?.message ?? "요청에 실패했습니다.",
    );
  }

  return (json as ApiDataResponse<T>).data;
}

async function fetchAccountDetail(id: string) {
  const response = await fetch(`/api/accounts/${id}`);
  return readApiJson<AccountBalanceDetail>(response);
}

async function fetchPaymentMethodDetail(id: string) {
  const response = await fetch(`/api/payment-methods/${id}`);
  return readApiJson<PaymentMethodBalanceDetail>(response);
}

async function createBalanceAdjustment(
  input: CreateBalanceAdjustmentClientInput,
) {
  const response = await fetch("/api/balance-adjustments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readApiJson(response);
}

export function useAccountBalanceDetail(id: string) {
  return useQuery({
    queryKey: queries.accounts.detail(id).queryKey,
    queryFn: () => fetchAccountDetail(id),
  });
}

export function usePaymentMethodBalanceDetail(id: string) {
  return useQuery({
    queryKey: queries.paymentMethods.detail(id).queryKey,
    queryFn: () => fetchPaymentMethodDetail(id),
  });
}

export function useCreateBalanceAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBalanceAdjustment,
    onSuccess: (_data, variables) => {
      toast.success("잔액을 맞췄습니다.");
      queryClient.invalidateQueries({
        queryKey: queries.accounts.all.queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: queries.paymentMethods.all.queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: queries.assets.summary.queryKey,
      });
      if (variables.accountId) {
        queryClient.invalidateQueries({
          queryKey: queries.accounts.detail(variables.accountId).queryKey,
        });
      }
      if (variables.paymentMethodId) {
        queryClient.invalidateQueries({
          queryKey: queries.paymentMethods.detail(variables.paymentMethodId)
            .queryKey,
        });
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "잔액 조정에 실패했습니다.",
      );
    },
  });
}
