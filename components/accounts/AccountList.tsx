"use client";

import {
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccounts } from "@/hooks/use-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user";
import type { AccountWithOwner } from "@/lib/api/account";
import { formatCurrency } from "@/lib/utils/format";
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
  title?: React.ReactNode;
  action?: React.ReactNode;
}

interface AccountCollectionProps {
  accounts: AccountWithOwner[];
  currentUserId: string | null;
  category?: "bank" | "investment";
  onEdit: (account: AccountWithOwner, category?: "bank" | "investment") => void;
  onDelete: (account: AccountWithOwner) => void;
}

function AccountCollection({
  accounts,
  currentUserId,
  category,
  onEdit,
  onDelete,
}: AccountCollectionProps) {
  return (
    <GroupedList>
      {accounts.map((account) => {
        const isOwner = currentUserId === account.ownerId;
        const accountTypeLabel = account.accountType
          ? (ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType)
          : "-";
        const balanceLabel = isInvestmentAccountType(account.accountType)
          ? "예수금"
          : "잔액";

        return (
          <article
            key={account.id}
            className="flex min-h-[96px] items-center gap-3 px-4 py-3.5 sm:px-5"
          >
            <Link
              href={`/assets/accounts/${account.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h4 className="truncate font-semibold text-gray-900">
                    {account.name}
                  </h4>
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
                  {account.lastFour && (
                    <span className="text-gray-400">끝 {account.lastFour}</span>
                  )}
                </div>
                <p className="mt-2 font-semibold text-gray-900 text-sm sm:hidden">
                  {balanceLabel}{" "}
                  {account.balance === null
                    ? "-"
                    : formatCurrency(account.balance)}
                </p>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-gray-400 text-xs">{balanceLabel}</p>
                <p className="font-semibold text-gray-900">
                  {account.balance === null
                    ? "-"
                    : formatCurrency(account.balance)}
                </p>
              </div>
            </Link>

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
    </GroupedList>
  );
}

export function AccountList({ filter, title, action }: AccountListProps) {
  const { data: accounts, isLoading, error } = useAccounts();
  const { userId: currentUserId } = useCurrentUserId();

  const [editingAccount, setEditingAccount] = useState<AccountWithOwner | null>(
    null,
  );
  const [editingCategory, setEditingCategory] = useState<
    "bank" | "investment" | undefined
  >();
  const [deletingAccount, setDeletingAccount] =
    useState<AccountWithOwner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
    return <ScreenState type="loading" title="계좌 목록을 불러오는 중입니다" />;
  }

  if (error) {
    return (
      <ScreenState type="error" title="계좌 목록을 불러오는데 실패했습니다" />
    );
  }

  const allAccounts = accounts ?? [];

  if (filter) {
    const filtered = allAccounts.filter((account) => {
      if (filter === "bank") return isBankAccountType(account.accountType);
      if (filter === "investment")
        return isInvestmentAccountType(account.accountType);
      return true;
    });

    if (filtered.length === 0) {
      return (
        <ScreenSection>
          <SectionHeader
            title={title ?? (filter === "bank" ? "은행 계좌" : "투자 계좌")}
            action={action}
          />
          <ScreenState
            type="empty"
            title="등록된 계좌가 없습니다."
            description="상단의 &quot;계좌 추가&quot; 버튼으로 계좌를 등록해보세요."
          />
        </ScreenSection>
      );
    }

    return (
      <ScreenSection>
        <SectionHeader
          title={title ?? (filter === "bank" ? "은행 계좌" : "투자 계좌")}
          action={action}
        />
        <AccountCollection
          accounts={filtered}
          currentUserId={currentUserId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

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
      </ScreenSection>
    );
  }

  const bankAccounts = allAccounts.filter((a) =>
    isBankAccountType(a.accountType),
  );
  const investmentAccounts = allAccounts.filter((a) =>
    isInvestmentAccountType(a.accountType),
  );
  const hasAnyAccount = allAccounts.length > 0;

  if (!hasAnyAccount) {
    return (
      <ScreenSection>
        <SectionHeader title={title ?? "계좌"} action={action} />
        <ScreenState
          type="empty"
          title="등록된 계좌가 없습니다."
          description="상단의 &quot;계좌 추가&quot; 버튼으로 계좌를 등록해보세요."
        />
      </ScreenSection>
    );
  }

  return (
    <ScreenSection>
      <SectionHeader title={title ?? "계좌"} action={action} />

      <div className="space-y-6">
        {bankAccounts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500 px-1">
              은행 계좌
            </h3>
            <AccountCollection
              accounts={bankAccounts}
              currentUserId={currentUserId}
              category="bank"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        )}

        {investmentAccounts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500 px-1">
              투자 계좌
            </h3>
            <AccountCollection
              accounts={investmentAccounts}
              currentUserId={currentUserId}
              category="investment"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
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
    </ScreenSection>
  );
}
