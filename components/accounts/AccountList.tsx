"use client";

import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts, useUpdateAccount } from "@/hooks/use-accounts";
import type { AccountWithOwner } from "@/lib/api/account";
import { AccountDeleteDialog } from "./AccountDeleteDialog";
import { AccountFormDialog } from "./AccountFormDialog";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  stock: "일반",
  isa: "ISA",
  pension: "연금저축",
  cma: "CMA",
};

export function AccountList() {
  const { data: accounts, isLoading, error } = useAccounts();
  const updateAccount = useUpdateAccount();

  const [editingAccount, setEditingAccount] = useState<AccountWithOwner | null>(
    null,
  );
  const [deletingAccount, setDeletingAccount] =
    useState<AccountWithOwner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSetDefault = async (account: AccountWithOwner) => {
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        data: { isDefault: true },
      });
      toast.success(`${account.name}을(를) 기본 계좌로 설정했습니다.`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("기본 계좌 설정에 실패했습니다.");
      }
    }
  };

  const handleEdit = (account: AccountWithOwner) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleDelete = (account: AccountWithOwner) => {
    setDeletingAccount(account);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-destructive">계좌 목록을 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-gray-500">등록된 계좌가 없습니다.</p>
        <p className="text-sm text-gray-400 mt-1">
          상단의 &quot;계좌 추가&quot; 버튼으로 계좌를 등록해보세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">계좌명</TableHead>
              <TableHead>증권사/은행</TableHead>
              <TableHead>계좌유형</TableHead>
              <TableHead>계좌번호</TableHead>
              <TableHead className="w-12 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium pl-5">
                  <div className="flex items-center gap-2">
                    {account.name}
                    {account.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        기본
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">
                  {account.broker || "-"}
                </TableCell>
                <TableCell className="text-gray-600">
                  {account.accountType
                    ? ACCOUNT_TYPE_LABELS[account.accountType] ||
                      account.accountType
                    : "-"}
                </TableCell>
                <TableCell className="text-gray-600">
                  {account.accountNumber || "-"}
                </TableCell>
                <TableCell className="pr-5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">메뉴 열기</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(account)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      {!account.isDefault && (
                        <DropdownMenuItem
                          onClick={() => handleSetDefault(account)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          기본 계좌로 설정
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(account)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AccountFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        account={editingAccount}
      />

      <AccountDeleteDialog
        account={deletingAccount}
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      />
    </>
  );
}
