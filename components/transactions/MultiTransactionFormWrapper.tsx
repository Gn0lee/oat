"use client";

import { MultiTransactionForm } from "@/components/transactions/MultiTransactionForm";
import { useAccounts } from "@/hooks/use-accounts";

interface MultiTransactionFormWrapperProps {
  defaultDate: string;
}

export function MultiTransactionFormWrapper({
  defaultDate,
}: MultiTransactionFormWrapperProps) {
  const { data: accounts, isLoading } = useAccounts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const defaultAccountId = accounts?.find((a) => a.isDefault)?.id;

  return (
    <MultiTransactionForm
      defaultDate={defaultDate}
      defaultAccountId={defaultAccountId}
    />
  );
}
