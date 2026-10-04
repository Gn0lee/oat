"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { ApiQueryError, fetchApiData } from "@/lib/api/client";
import { queries } from "@/lib/queries/keys";
import type { LedgerBook, LedgerBookVisibility } from "@/types/ledger-book";

const bookQueryKey = (userId: string | null, householdId: string | null) =>
  ["ledgerBooks", userId, householdId] as const;

export function useLedgerBooks() {
  const { userId, householdId } = useLedgerIdentity();

  return useQuery({
    queryKey: [...bookQueryKey(userId, householdId), "list"],
    queryFn: () => fetchApiData<LedgerBook[]>("/api/ledger-books"),
    enabled: Boolean(userId && householdId),
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useLedgerBook(id: string) {
  const { userId, householdId } = useLedgerIdentity();

  return useQuery({
    queryKey: [...bookQueryKey(userId, householdId), "detail", id],
    queryFn: () => fetchApiData<LedgerBook>(`/api/ledger-books/${id}`),
    enabled: Boolean(userId && householdId && id),
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

type CreateBookInput = { name: string; visibility: LedgerBookVisibility };
type RenameBookInput = { id: string; name: string };
type BookIdInput = { id: string };

async function sendBookMutation<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const json = await response.json();

  if (!response.ok) {
    const error = json as { error?: { code?: string; message?: string } };
    throw new ApiQueryError(
      error.error?.code ?? "UNKNOWN_ERROR",
      error.error?.message ?? "가계부 변경에 실패했어요.",
      response.status,
    );
  }

  return method === "DELETE" ? (json as T) : (json as { data: T }).data;
}

export function useLedgerBookActions() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { userId, householdId } = useLedgerIdentity();
  const rootKey = bookQueryKey(userId, householdId);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ledgerBooks"] }),
      queryClient.invalidateQueries({ queryKey: queries.ledgerEntries._def }),
      queryClient.invalidateQueries({ queryKey: queries.ledgerStats._def }),
    ]);
    router.refresh();
  };

  const create = useMutation({
    mutationFn: (input: CreateBookInput) =>
      sendBookMutation<LedgerBook>("/api/ledger-books", "POST", input),
    onSettled: refresh,
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: RenameBookInput) =>
      sendBookMutation<LedgerBook>(`/api/ledger-books/${id}`, "PATCH", {
        name,
      }),
    onSettled: refresh,
  });
  const archive = useMutation({
    mutationFn: ({ id }: BookIdInput) =>
      sendBookMutation<LedgerBook>(`/api/ledger-books/${id}/archive`, "POST"),
    onSettled: refresh,
  });
  const reactivate = useMutation({
    mutationFn: ({ id }: BookIdInput) =>
      sendBookMutation<LedgerBook>(
        `/api/ledger-books/${id}/reactivate`,
        "POST",
      ),
    onSettled: refresh,
  });
  const makeDefault = useMutation({
    mutationFn: ({ id }: BookIdInput) =>
      sendBookMutation<LedgerBook>(
        `/api/ledger-books/${id}/make-default`,
        "POST",
      ),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: ({ id }: BookIdInput) =>
      sendBookMutation<{ success: true }>(`/api/ledger-books/${id}`, "DELETE"),
    onSettled: refresh,
  });

  return {
    create,
    rename,
    archive,
    reactivate,
    makeDefault,
    remove,
    queryKey: rootKey,
  };
}
