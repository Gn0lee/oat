"use client";

import { Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DetailInfoRow } from "@/components/records/DetailInfoRow";
import { RecordMissingState } from "@/components/records/RecordMissingState";
import { TransactionChangeRequestDialog } from "@/components/transactions/TransactionChangeRequestDialog";
import { TransactionDeleteDialog } from "@/components/transactions/TransactionDeleteDialog";
import { TransactionEditDialog } from "@/components/transactions/TransactionEditDialog";
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
import { useTransaction } from "@/hooks/use-transaction";
import { ApiQueryError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

interface TransactionDetailClientProps {
  transactionId: string;
}

type RequestMode = "update" | "delete";

export function TransactionDetailClient({
  transactionId,
}: TransactionDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userId } = useCurrentUserId();
  const { data: transaction, isLoading, error } = useTransaction(transactionId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [requestMode, setRequestMode] = useState<RequestMode>("update");
  const [requestOpen, setRequestOpen] = useState(false);

  const parentHref =
    resolveServiceParentHref({
      meta: getServiceRouteMeta(pathname),
      searchParams,
    }) ?? "/assets/stock/transactions";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error || !transaction) {
    const isMissing =
      error instanceof ApiQueryError &&
      (error.status === 404 || error.isCode("NOT_FOUND"));

    return (
      <RecordMissingState
        title={
          isMissing ? "거래를 찾을 수 없습니다" : "거래를 불러올 수 없습니다"
        }
        description={
          isMissing
            ? "삭제되었거나 접근 권한이 없는 거래입니다."
            : "잠시 후 다시 시도해주세요."
        }
        actionHref={parentHref}
        actionLabel="거래 목록으로 이동"
      />
    );
  }

  const isOwner = Boolean(userId && transaction.owner.id === userId);
  const hasActions = Boolean(userId);
  const isBuy = transaction.type === "buy";
  const typeLabel = isBuy ? "매수" : "매도";
  const Icon = isBuy ? TrendingUp : TrendingDown;

  const handleRequest = (mode: RequestMode) => {
    setRequestMode(mode);
    setRequestOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        <section className="relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          {hasActions && (
            <div className="absolute top-5 right-5 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isOwner ? "거래 수정" : "거래 수정 요청"}
                    className="text-gray-500 hover:text-gray-900"
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isOwner ? "거래 삭제" : "거래 삭제 요청"}
                    className="text-gray-400 hover:text-red-500 focus-visible:text-red-500"
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
            </div>
          )}
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                isBuy ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500",
              )}
            >
              <Icon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate pr-20 text-sm text-gray-500">
                {transaction.ticker}
              </p>
              <h2 className="mt-1 break-words text-xl font-semibold text-gray-900">
                {transaction.stockName}
              </h2>
              <p className="mt-4 max-w-full text-2xl font-bold leading-tight text-gray-900 [overflow-wrap:anywhere] sm:text-3xl">
                {formatCurrency(transaction.totalAmount, transaction.currency)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={isBuy ? "default" : "secondary"}>
                  {typeLabel}
                </Badge>
                <Badge variant="outline">{transaction.currency}</Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white px-5 py-2 shadow-sm ring-1 ring-gray-100">
          <DetailInfoRow
            label="수량"
            value={`${transaction.quantity.toLocaleString()}주`}
          />
          <DetailInfoRow
            label="단가"
            value={formatCurrency(transaction.price, transaction.currency)}
          />
          <DetailInfoRow
            label="투자 계좌"
            value={transaction.accountName ?? "계좌 없음"}
          />
          <DetailInfoRow label="작성자" value={transaction.owner.name} />
          <DetailInfoRow
            label="거래일"
            value={new Date(transaction.transactedAt).toLocaleDateString(
              "ko-KR",
            )}
          />
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">메모</h3>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
            {transaction.memo?.trim() || "메모가 없습니다."}
          </p>
        </section>
      </div>

      <TransactionEditDialog
        transaction={transaction}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <TransactionDeleteDialog
        transaction={transaction}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.replace(parentHref)}
      />
      <TransactionChangeRequestDialog
        transaction={transaction}
        mode={requestMode}
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />
    </>
  );
}
