"use client";

import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountWithOwner } from "@/lib/api/account";

interface SelectMetaStepProps {
  type: "buy" | "sell";
  defaultDate: string;
  defaultAccountId?: string;
  accounts: AccountWithOwner[];
  isLoadingAccounts?: boolean;
  onNext: (meta: { transactedAt: string; accountId?: string }) => void;
  onBack: () => void;
}

export function SelectMetaStep({
  type,
  defaultDate,
  defaultAccountId,
  accounts,
  isLoadingAccounts,
  onNext,
  onBack,
}: SelectMetaStepProps) {
  const [transactedAt, setTransactedAt] = useState(defaultDate);
  const [accountId, setAccountId] = useState<string>(
    defaultAccountId ?? "__none__",
  );

  const typeText = type === "buy" ? "매수" : "매도";
  const typeColor = type === "buy" ? "text-red-600" : "text-blue-600";

  const handleNext = () => {
    if (!transactedAt) return;
    onNext({
      transactedAt,
      accountId: accountId === "__none__" ? undefined : accountId,
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <span className={`text-sm font-medium ${typeColor}`}>{typeText}</span>
          <h2 className="text-xl font-bold text-gray-900">거래 정보 입력</h2>
        </div>
      </div>

      {/* 거래일 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <Label className="text-gray-700 font-medium">거래일</Label>
        <Input
          type="date"
          value={transactedAt}
          onChange={(e) => setTransactedAt(e.target.value)}
          className="h-12 rounded-xl"
        />
      </div>

      {/* 계좌 선택 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <Label className="text-gray-700 font-medium">거래 계좌</Label>
        {isLoadingAccounts ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : (
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder="계좌 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">계좌 없음</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <span className="flex items-center gap-2">
                    {account.name}
                    {account.broker && ` (${account.broker})`}
                    {account.isDefault && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        기본
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 다음 버튼 */}
      <Button
        onClick={handleNext}
        disabled={!transactedAt}
        className="w-full h-14 rounded-xl text-base font-semibold"
      >
        종목 입력하기
        <ChevronRightIcon className="w-5 h-5 ml-1" />
      </Button>
    </div>
  );
}
