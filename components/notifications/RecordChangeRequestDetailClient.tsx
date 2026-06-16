"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AmountDisclosure,
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { DetailInfoRow } from "@/components/records/DetailInfoRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserId } from "@/hooks/use-current-user";
import {
  useCancelRecordChangeRequest,
  useRecordChangeRequest,
  useResolveRecordChangeRequest,
} from "@/hooks/use-record-change-requests";
import { formatCurrency } from "@/lib/utils/format";
import type { Json, RecordChangeRequest } from "@/types";

interface RecordChangeRequestDetailClientProps {
  requestId: string;
}

function toRecord(value: Json): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function formatValue(value: unknown, key?: string) {
  if (typeof value === "number") {
    if (key === "quantity") return `${value.toLocaleString()}주`;
    return formatCurrency(value);
  }
  if (typeof value === "string") return value || "-";
  if (value === null || value === undefined) return "-";
  return String(value);
}

function getSnapshotTitle(snapshot: Record<string, unknown>) {
  if (snapshot.targetType === "stock_transaction") {
    const ticker =
      typeof snapshot.ticker === "string" ? snapshot.ticker : "주식";
    return `${ticker} 거래`;
  }

  return (
    (typeof snapshot.title === "string" && snapshot.title) ||
    (typeof snapshot.categoryName === "string" && snapshot.categoryName) ||
    "가계부 기록"
  );
}

function getStatusLabel(status: RecordChangeRequest["status"]) {
  switch (status) {
    case "pending":
      return "대기 중";
    case "approved":
      return "승인됨";
    case "rejected":
      return "거절됨";
    case "cancelled":
      return "취소됨";
  }
}

const FIELD_LABELS: Record<string, string> = {
  amount: "금액",
  title: "내용",
  categoryId: "카테고리",
  fromAccountId: "출금 계좌",
  fromPaymentMethodId: "결제 방법",
  toAccountId: "입금 계좌",
  toPaymentMethodId: "입금 결제수단",
  transactedAt: "날짜",
  memo: "메모",
  quantity: "수량",
  price: "단가",
  accountId: "계좌",
};

function getSnapshotMeta(snapshot: Record<string, unknown>) {
  if (snapshot.targetType === "stock_transaction") {
    return [
      {
        label: "거래 유형",
        value: snapshot.type === "buy" ? "매수" : "매도",
      },
      {
        label: "수량",
        value:
          typeof snapshot.quantity === "number"
            ? `${snapshot.quantity.toLocaleString()}주`
            : formatValue(snapshot.quantity),
      },
      {
        label: "단가",
        value: formatValue(snapshot.price),
      },
      {
        label: "거래일",
        value: formatValue(snapshot.transactedAt).slice(0, 10),
      },
    ];
  }

  return [
    { label: "요청 당시 금액", value: formatValue(snapshot.amount) },
    {
      label: "기록일",
      value: formatValue(snapshot.transactedAt).slice(0, 10),
    },
  ];
}

export function RecordChangeRequestDetailClient({
  requestId,
}: RecordChangeRequestDetailClientProps) {
  const { userId } = useCurrentUserId();
  const { data: request, isLoading, error } = useRecordChangeRequest(requestId);
  const cancelMutation = useCancelRecordChangeRequest();
  const resolveMutation = useResolveRecordChangeRequest();
  const [responseMessage, setResponseMessage] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <ScreenState
        type="error"
        title="요청을 불러올 수 없습니다."
        description="잠시 후 다시 시도해주세요."
      />
    );
  }

  const snapshot = toRecord(request.target_snapshot);
  const proposedChanges = toRecord(request.proposed_changes);
  const isOwner = userId === request.target_owner_id;
  const isRequester = userId === request.requester_id;
  const isPending = request.status === "pending";
  const canResolve = isPending && isOwner;
  const canCancel = isPending && isRequester;

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(request.id);
      toast.success("요청을 취소했습니다.");
    } catch (cancelError) {
      toast.error(
        cancelError instanceof Error
          ? cancelError.message
          : "요청 취소에 실패했습니다.",
      );
    }
  };

  const handleResolve = async (decision: "approved" | "rejected") => {
    try {
      await resolveMutation.mutateAsync({
        id: request.id,
        data: {
          decision,
          responseMessage: responseMessage.trim() || undefined,
        },
      });
      toast.success(
        decision === "approved"
          ? "요청을 승인했습니다."
          : "요청을 거절했습니다.",
      );
    } catch (resolveError) {
      toast.error(
        resolveError instanceof Error
          ? resolveError.message
          : "요청 처리에 실패했습니다.",
      );
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <ScreenSection>
        <SectionHeader
          title={getSnapshotTitle(snapshot)}
          description={
            request.request_type === "update" ? "수정 요청" : "삭제 요청"
          }
          action={
            <Badge
              variant={request.status === "pending" ? "default" : "outline"}
            >
              {getStatusLabel(request.status)}
            </Badge>
          }
        />
        <GroupedList>
          {getSnapshotMeta(snapshot).map((item) => (
            <DetailInfoRow
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </GroupedList>
      </ScreenSection>

      {request.request_type === "update" ? (
        <ScreenSection>
          <SectionHeader title="변경 내용" />
          <GroupedList>
            {Object.entries(proposedChanges).map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-[100px_1fr_1fr] gap-4 px-4 py-3 sm:px-5 text-sm"
              >
                <span className="text-gray-500 font-medium">
                  {FIELD_LABELS[key] ?? key}
                </span>
                <span className="text-gray-900">
                  {formatValue(snapshot[key], key)}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatValue(value, key)}
                </span>
              </div>
            ))}
          </GroupedList>
        </ScreenSection>
      ) : (
        <ScreenSection>
          <SectionHeader title="삭제 사유" />
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-sm text-gray-600">
              {request.message || "삭제 사유가 입력되지 않았습니다."}
            </p>
          </div>
        </ScreenSection>
      )}

      {request.message && request.request_type === "update" ? (
        <ScreenSection>
          <SectionHeader title="요청 메시지" />
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-sm text-gray-600">{request.message}</p>
          </div>
        </ScreenSection>
      ) : null}

      {canResolve ? (
        <ScreenSection>
          <SectionHeader title="요청 처리" />
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <Textarea
              value={responseMessage}
              rows={3}
              className="mb-3 resize-none"
              placeholder="응답 메시지 (선택)"
              onChange={(event) => setResponseMessage(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleResolve("rejected")}
                disabled={resolveMutation.isPending}
              >
                <XIcon className="h-4 w-4" />
                거절
              </Button>
              <Button
                type="button"
                onClick={() => handleResolve("approved")}
                disabled={resolveMutation.isPending}
              >
                <CheckIcon className="h-4 w-4" />
                승인
              </Button>
            </div>
          </div>
        </ScreenSection>
      ) : null}

      {canCancel ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
        >
          요청 취소
        </Button>
      ) : null}
    </div>
  );
}
