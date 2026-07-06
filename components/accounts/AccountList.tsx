"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { useAccounts } from "@/hooks/use-accounts";
import { useCurrentUserId } from "@/hooks/use-current-user";
import type { AccountWithOwner } from "@/lib/api/account";
import { formatCurrency } from "@/lib/utils/format";

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
}

function AccountCollection({
  accounts,
  currentUserId,
}: AccountCollectionProps) {
  return (
    <GroupedList>
      {accounts.map((account) => {
        const _isOwner = currentUserId === account.ownerId;
        const accountTypeLabel = account.accountType
          ? (ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType)
          : "-";
        const balanceLabel = isInvestmentAccountType(account.accountType)
          ? "예수금"
          : "잔액";

        const detailSegments: string[] = [];
        if (account.ownerName) detailSegments.push(account.ownerName);
        if (account.broker) detailSegments.push(account.broker);
        if (account.lastFour) detailSegments.push(`끝 ${account.lastFour}`);
        const detailText = detailSegments.join(" · ");

        return (
          <article
            key={account.id}
            className="border-b last:border-b-0 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <Link
              href={`/assets/accounts/${account.id}`}
              className="group flex flex-col gap-1 px-4 py-3 sm:px-5"
            >
              {/* Top Row: accountTypeLabel on left, chevron on right */}
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <span>{accountTypeLabel}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                    {account.isHouseholdUsable
                      ? "가구원 사용 허용"
                      : "소유자 전용"}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
              </div>

              {/* Title/Name Row */}
              <div className="mt-0.5">
                <h4 className="line-clamp-2 min-w-0 break-words font-semibold text-gray-900 text-sm leading-5">
                  {account.name}
                </h4>
              </div>

              {/* Detail Row: text-only */}
              <div className="mt-1 text-xs text-gray-500 break-words">
                {detailText}
              </div>

              {/* Bottom Row: balance label + full balance */}
              <div className="mt-1 flex items-end justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>{balanceLabel}</span>
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap text-right ml-auto">
                  {account.balance === null
                    ? "-"
                    : formatCurrency(account.balance)}
                </span>
              </div>
            </Link>
          </article>
        );
      })}
    </GroupedList>
  );
}

export function AccountList({ filter, title, action }: AccountListProps) {
  const { data: accounts, isLoading, error } = useAccounts();
  const { userId: currentUserId } = useCurrentUserId();

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
        <AccountCollection accounts={filtered} currentUserId={currentUserId} />
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
            />
          </div>
        )}
      </div>
    </ScreenSection>
  );
}
