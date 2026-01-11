"use client";

import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { MultiTransactionForm } from "@/components/transactions/MultiTransactionForm";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user";

interface MultiTransactionFormWrapperProps {
  defaultDate: string;
}

export function MultiTransactionFormWrapper({
  defaultDate,
}: MultiTransactionFormWrapperProps) {
  const { userId: currentUserId } = useCurrentUserId();
  const { data: accounts, isLoading } = useAccounts();

  // 본인 계좌만 필터링
  const myAccounts = (accounts ?? []).filter(
    (a) => a.ownerId === currentUserId,
  );

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

  // 본인 계좌가 없으면 계좌 추가 안내
  if (myAccounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center space-y-4">
        <p className="text-gray-700 font-medium">
          거래를 등록하려면 계좌가 필요합니다.
        </p>
        <p className="text-gray-500 text-sm">먼저 계좌를 추가해주세요.</p>
        <Button asChild className="rounded-xl">
          <Link href="/assets/stock/accounts">
            <PlusCircle className="w-4 h-4 mr-2" />
            계좌 추가하기
          </Link>
        </Button>
      </div>
    );
  }

  // 기본 계좌 또는 첫 번째 계좌 (본인 계좌 중에서만)
  const defaultAccount = myAccounts.find((a) => a.isDefault);
  const defaultAccountId = defaultAccount?.id ?? myAccounts[0].id;

  return (
    <MultiTransactionForm
      defaultDate={defaultDate}
      defaultAccountId={defaultAccountId}
    />
  );
}
