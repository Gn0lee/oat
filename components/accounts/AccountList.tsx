"use client";

import {
  Building2,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
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
import { useAccounts, useUpdateAccount } from "@/hooks/use-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user";
import type { AccountWithOwner } from "@/lib/api/account";
import { AccountDeleteDialog } from "./AccountDeleteDialog";
import { AccountFormDialog } from "./AccountFormDialog";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "입출금",
  savings: "적금",
  deposit: "예금",
  stock: "일반",
  isa: "ISA",
  pension: "연금저축",
  cma: "CMA",
};

const BANK_ACCOUNT_TYPES = ["checking", "savings", "deposit"] as const;
const INVESTMENT_ACCOUNT_TYPES = ["stock", "isa", "pension", "cma"] as const;

type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];
type InvestmentAccountType = (typeof INVESTMENT_ACCOUNT_TYPES)[number];

function isBankAccountType(type: string | null): type is BankAccountType {
  return BANK_ACCOUNT_TYPES.includes(type as BankAccountType);
}

function isInvestmentAccountType(
  type: string | null,
): type is InvestmentAccountType {
  return INVESTMENT_ACCOUNT_TYPES.includes(type as InvestmentAccountType);
}

interface AccountListProps {
  filter?: "bank" | "investment";
}

interface AccountCollectionProps {
  accounts: AccountWithOwner[];
  currentUserId: string | null;
  category?: "bank" | "investment";
  onEdit: (account: AccountWithOwner, category?: "bank" | "investment") => void;
  onDelete: (account: AccountWithOwner) => void;
  onSetDefault: (account: AccountWithOwner) => void;
}

function AccountCollection({
  accounts,
  currentUserId,
  category,
  onEdit,
  onDelete,
  onSetDefault,
}: AccountCollectionProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      {accounts.map((account) => {
        const isOwner = currentUserId === account.ownerId;
        const accountTypeLabel = account.accountType
          ? (ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType)
          : "-";

        return (
          <article
            key={account.id}
            className="flex min-h-[96px] items-center gap-3 border-gray-100 border-t px-4 py-4 first:border-t-0 sm:px-5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <CreditCard className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h4 className="truncate font-semibold text-gray-900">
                  {account.name}
                </h4>
                {account.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    기본
                  </Badge>
                )}
                <Badge variant="outline">{accountTypeLabel}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-sm">
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-4" />
                  {account.ownerName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-4" />
                  {account.broker || "기관 미입력"}
                </span>
                {account.accountNumber && (
                  <span className="text-gray-400">{account.accountNumber}</span>
                )}
              </div>
            </div>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-9">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">메뉴 열기</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(account, category)}>
                    <Pencil className="mr-2 size-4" />
                    수정
                  </DropdownMenuItem>
                  {account.isDefault && (
                    <DropdownMenuItem disabled>
                      <Star className="mr-2 size-4" />
                      기본 계좌
                    </DropdownMenuItem>
                  )}
                  {!account.isDefault && (
                    <DropdownMenuItem onClick={() => onSetDefault(account)}>
                      <Star className="mr-2 size-4" />
                      기본 계좌로 설정
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(account)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function AccountList({ filter }: AccountListProps) {
  const { data: accounts, isLoading, error } = useAccounts();
  const { userId: currentUserId } = useCurrentUserId();
  const updateAccount = useUpdateAccount();

  const [editingAccount, setEditingAccount] = useState<AccountWithOwner | null>(
    null,
  );
  const [editingCategory, setEditingCategory] = useState<
    "bank" | "investment" | undefined
  >();
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

  const handleEdit = (
    account: AccountWithOwner,
    category?: "bank" | "investment",
  ) => {
    setEditingAccount(account);
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = (account: AccountWithOwner) => {
    setDeletingAccount(account);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
    setEditingCategory(undefined);
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

  const allAccounts = accounts ?? [];

  // filter prop이 있으면 필터링만 (서브그룹핑 없음)
  if (filter) {
    const filtered = allAccounts.filter((account) => {
      if (filter === "bank") return isBankAccountType(account.accountType);
      if (filter === "investment")
        return isInvestmentAccountType(account.accountType);
      return true;
    });

    if (filtered.length === 0) {
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
        <div>
          <AccountCollection
            accounts={filtered}
            currentUserId={currentUserId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
          />
        </div>

        <AccountFormDialog
          open={isFormOpen}
          onOpenChange={handleFormClose}
          account={editingAccount}
          category={filter}
        />

        <AccountDeleteDialog
          account={deletingAccount}
          open={!!deletingAccount}
          onOpenChange={(open) => !open && setDeletingAccount(null)}
        />
      </>
    );
  }

  // filter 없으면 bank/investment 서브그룹핑
  const bankAccounts = allAccounts.filter((a) =>
    isBankAccountType(a.accountType),
  );
  const investmentAccounts = allAccounts.filter((a) =>
    isInvestmentAccountType(a.accountType),
  );
  const hasAnyAccount = allAccounts.length > 0;

  if (!hasAnyAccount) {
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
      <div className="space-y-4">
        {bankAccounts.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 px-1">
              은행 계좌
            </h3>
            <div>
              <AccountCollection
                accounts={bankAccounts}
                currentUserId={currentUserId}
                category="bank"
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            </div>
          </div>
        )}

        {investmentAccounts.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 px-1">
              투자 계좌
            </h3>
            <div>
              <AccountCollection
                accounts={investmentAccounts}
                currentUserId={currentUserId}
                category="investment"
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            </div>
          </div>
        )}
      </div>

      <AccountFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        account={editingAccount}
        category={editingCategory}
      />

      <AccountDeleteDialog
        account={deletingAccount}
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      />
    </>
  );
}
