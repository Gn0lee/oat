"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentMethodWithDetails } from "@/lib/api/payment-method";
import { queries } from "@/lib/queries/keys";
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from "@/schemas/payment-method";
import type { PaymentMethod } from "@/types";

interface PaymentMethodResponse {
  data: PaymentMethod;
}

interface PaymentMethodListResponse {
  data: PaymentMethodWithDetails[];
}

interface PaymentMethodError {
  error: {
    code: string;
    message: string;
  };
}

// ============================================================================
// 결제수단 목록 조회
// ============================================================================

async function fetchPaymentMethods(): Promise<PaymentMethodWithDetails[]> {
  const response = await fetch("/api/payment-methods");
  const json = await response.json();

  if (!response.ok) {
    const error = json as PaymentMethodError;
    throw new Error(error.error.message);
  }

  return (json as PaymentMethodListResponse).data;
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queries.paymentMethods.list.queryKey,
    queryFn: fetchPaymentMethods,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// 결제수단 생성
// ============================================================================

async function createPaymentMethod(
  input: CreatePaymentMethodInput,
): Promise<PaymentMethod> {
  const response = await fetch("/api/payment-methods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as PaymentMethodError;
    throw new Error(error.error.message);
  }

  return (json as PaymentMethodResponse).data;
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.paymentMethods._def });
    },
  });
}

// ============================================================================
// 결제수단 수정
// ============================================================================

interface UpdatePaymentMethodParams {
  id: string;
  data: UpdatePaymentMethodInput;
}

async function updatePaymentMethod({
  id,
  data,
}: UpdatePaymentMethodParams): Promise<PaymentMethod> {
  const response = await fetch(`/api/payment-methods/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as PaymentMethodError;
    throw new Error(error.error.message);
  }

  return (json as PaymentMethodResponse).data;
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.paymentMethods._def });
    },
  });
}

// ============================================================================
// 결제수단 삭제
// ============================================================================

async function deletePaymentMethod(id: string): Promise<void> {
  const response = await fetch(`/api/payment-methods/${id}`, {
    method: "DELETE",
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as PaymentMethodError;
    throw new Error(error.error.message);
  }
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.paymentMethods._def });
    },
  });
}
