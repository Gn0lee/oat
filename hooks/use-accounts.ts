"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountWithOwner } from "@/lib/api/account";
import { queries } from "@/lib/queries/keys";
import type { CreateAccountInput, UpdateAccountInput } from "@/schemas/account";
import type { Account } from "@/types";

interface AccountResponse {
  data: Account;
}

interface AccountListResponse {
  data: AccountWithOwner[];
}

interface AccountError {
  error: {
    code: string;
    message: string;
  };
}

interface DeleteAccountResponse {
  success: boolean;
}

// ============================================================================
// 계좌 목록 조회
// ============================================================================

async function fetchAccounts(): Promise<AccountWithOwner[]> {
  const response = await fetch("/api/accounts");
  const json = await response.json();

  if (!response.ok) {
    const error = json as AccountError;
    throw new Error(error.error.message);
  }

  return (json as AccountListResponse).data;
}

export function useAccounts() {
  return useQuery({
    queryKey: queries.accounts.list.queryKey,
    queryFn: fetchAccounts,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// ============================================================================
// 계좌 생성
// ============================================================================

async function createAccount(input: CreateAccountInput): Promise<Account> {
  const response = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as AccountError;
    throw new Error(error.error.message);
  }

  return (json as AccountResponse).data;
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.accounts._def });
    },
  });
}

// ============================================================================
// 계좌 수정
// ============================================================================

interface UpdateAccountParams {
  id: string;
  data: UpdateAccountInput;
}

async function updateAccount({
  id,
  data,
}: UpdateAccountParams): Promise<Account> {
  const response = await fetch(`/api/accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as AccountError;
    throw new Error(error.error.message);
  }

  return (json as AccountResponse).data;
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.accounts._def });
    },
  });
}

// ============================================================================
// 계좌 삭제
// ============================================================================

async function deleteAccount(id: string): Promise<void> {
  const response = await fetch(`/api/accounts/${id}`, {
    method: "DELETE",
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as AccountError;
    throw new Error(error.error.message);
  }

  const result = json as DeleteAccountResponse;
  if (!result.success) {
    throw new Error("계좌 삭제에 실패했습니다.");
  }
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.accounts._def });
    },
  });
}
