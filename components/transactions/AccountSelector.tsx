"use client";

import { PlusCircle } from "lucide-react";
import Link from "next/link";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useController } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";

interface AccountSelectorProps<T extends FieldValues> {
  control: Control<T>;
  name?: Path<T>;
}

export function AccountSelector<T extends FieldValues & { accountId: string }>({
  control,
  name = "accountId" as Path<T>,
}: AccountSelectorProps<T>) {
  const { data: accounts, isLoading } = useAccounts();
  const { field } = useController({
    control,
    name,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <Label className="text-gray-700">거래 계좌</Label>
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <Label className="text-gray-700">거래 계좌</Label>
        <div className="text-center py-4 space-y-3">
          <p className="text-gray-500 text-sm">
            거래를 등록하려면 계좌가 필요합니다.
          </p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/assets/stock/accounts">
              <PlusCircle className="w-4 h-4 mr-2" />
              계좌 추가하기
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <Label className="text-gray-700">거래 계좌</Label>
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger className="h-12 rounded-xl w-full">
          <SelectValue placeholder="계좌를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <span className="flex items-center gap-2">
                {account.name}
                {account.broker && (
                  <span className="text-gray-400 text-xs">
                    ({account.broker})
                  </span>
                )}
                {account.isDefault && (
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                    기본
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
