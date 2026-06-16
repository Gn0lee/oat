"use client";

import { Pencil, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  AmountDisclosure,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { LedgerEntryChangeRequestDialog } from "@/components/ledger/LedgerEntryChangeRequestDialog";
import { LedgerEntryDeleteDialog } from "@/components/ledger/LedgerEntryDeleteDialog";
import { LedgerEntryEditDialog } from "@/components/ledger/LedgerEntryEditDialog";
import { DetailInfoRow } from "@/components/records/DetailInfoRow";
import { RecordMissingState } from "@/components/records/RecordMissingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getServiceRouteMeta,
  resolveServiceParentHref,
} from "@/constants/service-routes";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useLedgerEntry } from "@/hooks/use-ledger-entries";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";

interface LedgerEntryDetailClientProps {
  entryId: string;
}

type RequestMode = "update" | "delete";

function getTypeLabel(type: LedgerEntryWithDetails["type"]) {
  if (type === "income") return "수입";
  if (type === "transfer") return "내부이체";
  if (type === "non_expense_withdrawal") return "비지출 출금";
  return "지출";
}

function getMoneyLocation(entry: LedgerEntryWithDetails) {
  if (entry.type === "transfer") {
    const from =
      entry.fromAccountName ?? entry.fromPaymentMethodName ?? "어디에서";
    const to = entry.toAccountName ?? entry.toPaymentMethodName ?? "어디로";
    return `${from} -> ${to}`;
  }

  if (entry.type === "income") {
    return entry.toAccountName ?? entry.toPaymentMethodName ?? "입금 위치 없음";
  }

  return (
    entry.fromPaymentMethodName ??
    entry.fromAccountName ??
    (entry.type === "non_expense_withdrawal"
      ? "출금 위치 없음"
      : "결제 위치 없음")
  );
}

export function LedgerEntryDetailClient({
  entryId,
}: LedgerEntryDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userId } = useCurrentUserId();
  const { data: entry, isLoading, error } = useLedgerEntry(entryId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [requestMode, setRequestMode] = useState<RequestMode>("update");
  const [requestOpen, setRequestOpen] = useState(false);

  const parentHref =
    resolveServiceParentHref({
      meta: getServiceRouteMeta(pathname),
      searchParams,
    }) ?? "/ledger/records";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error || !entry) {
    const isMissing =
      error instanceof ApiQueryError &&
      (error.status === 404 || error.isCode("NOT_FOUND"));

    return (
      <RecordMissingState
        title={
          isMissing ? "기록을 찾을 수 없습니다" : "기록을 불러올 수 없습니다"
        }
        description={
          isMissing
            ? "삭제되었거나 접근 권한이 없는 기록입니다."
            : "잠시 후 다시 시도해주세요."
        }
        actionHref={parentHref}
        actionLabel="기록 목록으로 이동"
      />
    );
  }

  const isOwner = Boolean(userId && entry.ownerId === userId);
  const canUpdate = entry.type !== "transfer";
  const canRequest = Boolean(userId && !isOwner && entry.isShared);
  const hasActions = isOwner || canRequest;
  const showUpdateAction = hasActions && canUpdate;
  const showDeleteAction = hasActions;
  const typeLabel = getTypeLabel(entry.type);
  const typeVariant =
    entry.type === "expense" || entry.type === "non_expense_withdrawal"
      ? "default"
      : "secondary";
  const title =
    entry.title ??
    (entry.type === "non_expense_withdrawal"
      ? "비지출 출금"
      : (entry.categoryName ?? typeLabel));
  const iconName =
    entry.type === "transfer"
      ? "ArrowLeftRight"
      : entry.type === "non_expense_withdrawal"
        ? "ArrowUpRight"
        : entry.categoryIcon;

  const handleRequest = (mode: RequestMode) => {
    setRequestMode(mode);
    setRequestOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <ScreenSection className="relative">
          {(showUpdateAction || showDeleteAction) && (
            <div className="absolute top-0 right-0 flex h-5 items-center gap-1 z-10">
              {showUpdateAction && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={isOwner ? "기록 수정" : "기록 수정 요청"}
                      className="h-5 w-7 rounded-md p-0 text-gray-500 hover:text-gray-900"
                      onClick={() =>
                        isOwner ? setEditOpen(true) : handleRequest("update")
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isOwner ? "수정" : "수정 요청"}
                  </TooltipContent>
                </Tooltip>
              )}
              {showDeleteAction && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={isOwner ? "기록 삭제" : "기록 삭제 요청"}
                      className="h-5 w-7 rounded-md p-0 text-gray-400 hover:text-red-500 focus-visible:text-red-500"
                      onClick={() =>
                        isOwner ? setDeleteOpen(true) : handleRequest("delete")
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isOwner ? "삭제" : "삭제 요청"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gray-100">
                <CategoryIcon
                  iconName={iconName}
                  className="size-3.5 text-gray-600"
                />
              </div>
              <p className="truncate text-sm text-gray-500">{typeLabel}</p>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-xl font-semibold text-gray-900">
                {title}
              </h2>
              <AmountDisclosure
                amount={entry.amount}
                sign={
                  entry.type === "transfer"
                    ? ""
                    : entry.type === "income"
                      ? "+"
                      : "-"
                }
                tone={
                  entry.type === "transfer"
                    ? "neutral"
                    : entry.type === "income"
                      ? "income"
                      : "expense"
                }
                align="left"
                className="mt-4 block max-w-full text-2xl font-bold leading-tight sm:text-3xl"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={typeVariant}>{typeLabel}</Badge>
                <Badge variant="outline">
                  {entry.isShared ? "공용" : "개인"}
                </Badge>
              </div>
            </div>
          </div>
        </ScreenSection>

        {/* 인포 로우 목록 */}
        <ScreenSection>
          <GroupedList>
            {entry.type !== "non_expense_withdrawal" && (
              <DetailInfoRow
                label="카테고리"
                value={entry.categoryName ?? "없음"}
              />
            )}
            <DetailInfoRow
              label={
                entry.type === "transfer"
                  ? "돈 이동"
                  : entry.type === "non_expense_withdrawal"
                    ? "출금처"
                    : "돈 위치"
              }
              value={getMoneyLocation(entry)}
            />
            <DetailInfoRow label="작성자" value={entry.ownerName} />
            <DetailInfoRow
              label="거래일"
              value={new Date(entry.transactedAt).toLocaleDateString("ko-KR")}
            />
            {entry.memo?.trim() && (
              <div className="flex flex-col gap-1 border-gray-100 border-b px-4 py-3 sm:px-5 last:border-b-0">
                <span className="shrink-0 text-sm text-gray-500">메모</span>
                <div className="min-w-0 text-left text-sm font-medium text-gray-900 whitespace-pre-wrap break-words leading-6">
                  {entry.memo.trim()}
                </div>
              </div>
            )}
          </GroupedList>
        </ScreenSection>
      </div>

      <LedgerEntryEditDialog
        entry={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <LedgerEntryDeleteDialog
        entry={entry}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.replace(parentHref)}
      />
      <LedgerEntryChangeRequestDialog
        entry={entry}
        mode={requestMode}
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />
    </>
  );
}
