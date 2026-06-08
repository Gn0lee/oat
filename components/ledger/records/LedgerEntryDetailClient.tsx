"use client";

import { MoreVertical } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import { LedgerEntryChangeRequestDialog } from "@/components/ledger/LedgerEntryChangeRequestDialog";
import { LedgerEntryDeleteDialog } from "@/components/ledger/LedgerEntryDeleteDialog";
import { LedgerEntryEditDialog } from "@/components/ledger/LedgerEntryEditDialog";
import { DetailInfoRow } from "@/components/records/DetailInfoRow";
import { RecordMissingState } from "@/components/records/RecordMissingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getServiceRouteMeta,
  resolveServiceParentHref,
} from "@/constants/service-routes";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useLedgerEntry } from "@/hooks/use-ledger-entries";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { formatCurrency } from "@/lib/utils/format";

interface LedgerEntryDetailClientProps {
  entryId: string;
}

type RequestMode = "update" | "delete";

function getTypeLabel(type: LedgerEntryWithDetails["type"]) {
  if (type === "income") return "수입";
  if (type === "transfer") return "이체";
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
    entry.fromPaymentMethodName ?? entry.fromAccountName ?? "결제 위치 없음"
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
  const typeLabel = getTypeLabel(entry.type);
  const typeVariant = entry.type === "expense" ? "default" : "secondary";
  const title = entry.title ?? entry.categoryName ?? typeLabel;
  const iconName =
    entry.type === "transfer" ? "ArrowLeftRight" : entry.categoryIcon;

  const handleRequest = (mode: RequestMode) => {
    setRequestMode(mode);
    setRequestOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100">
              <CategoryIcon
                iconName={iconName}
                className="size-6 text-gray-600"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-500">{typeLabel}</p>
                  <h2 className="mt-1 break-words text-xl font-semibold text-gray-900">
                    {title}
                  </h2>
                </div>
                {hasActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="기록 작업"
                        className="shrink-0 text-gray-500"
                      >
                        <MoreVertical className="size-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isOwner ? (
                        <>
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => setEditOpen(true)}>
                              수정
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteOpen(true)}
                          >
                            삭제
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          {canUpdate && (
                            <DropdownMenuItem
                              onClick={() => handleRequest("update")}
                            >
                              수정 요청
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleRequest("delete")}
                          >
                            삭제 요청
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {formatCurrency(entry.amount)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={typeVariant}>{typeLabel}</Badge>
                <Badge variant="outline">
                  {entry.isShared ? "공용" : "개인"}
                </Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white px-5 py-2 shadow-sm ring-1 ring-gray-100">
          <DetailInfoRow
            label="카테고리"
            value={entry.categoryName ?? "없음"}
          />
          <DetailInfoRow
            label={entry.type === "transfer" ? "돈 이동" : "돈 위치"}
            value={getMoneyLocation(entry)}
          />
          <DetailInfoRow label="작성자" value={entry.ownerName} />
          <DetailInfoRow
            label="거래일"
            value={new Date(entry.transactedAt).toLocaleDateString("ko-KR")}
          />
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">메모</h3>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
            {entry.memo?.trim() || "메모가 없습니다."}
          </p>
        </section>
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
