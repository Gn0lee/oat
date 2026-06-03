"use client";

import { MultiTransactionForm } from "@/components/transactions/MultiTransactionForm";
import { useAccounts } from "@/hooks/use-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user";

interface MultiTransactionFormWrapperProps {
  defaultDate?: string;
  defaultAccountId?: string;
  mode?: "full" | "daily";
}

export function MultiTransactionFormWrapper({
  defaultDate,
  defaultAccountId,
  mode = "full",
}: MultiTransactionFormWrapperProps) {
  const { userId: currentUserId, isLoading: isLoadingCurrentUser } =
    useCurrentUserId();
  const { data: accounts, isLoading } = useAccounts();

  // 본인 계좌만 필터링
  const myAccounts = (accounts ?? []).filter(
    (a) => a.ownerId === currentUserId,
  );

  if (isLoading || isLoadingCurrentUser) {
    return (
      <div className="space-y-4">
        <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const selectedDefaultAccountId =
    defaultAccountId &&
    myAccounts.some((account) => account.id === defaultAccountId)
      ? defaultAccountId
      : myAccounts[0]?.id;

  return (
    <MultiTransactionForm
      mode={mode}
      defaultDate={defaultDate}
      defaultAccountId={selectedDefaultAccountId}
      ownerId={currentUserId ?? ""}
    />
  );
}
