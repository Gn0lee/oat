"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Loader2,
  Pencil,
  PencilLine,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  AmountDisclosure,
  GroupedList,
  MetricBlock,
  MetricStrip,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useAccountBalanceDetail,
  useCreateBalanceAdjustment,
  usePaymentMethodBalanceDetail,
} from "@/hooks/use-balance-detail";
import { useCurrentUserId } from "@/hooks/use-current-user";
import type { AccountWithOwner } from "@/lib/api/account";
import type {
  AccountBalanceDetail,
  BalanceTimelineItem,
  PaymentMethodBalanceDetail,
} from "@/lib/api/balance-adjustment";
import type { PaymentMethodWithDetails } from "@/lib/api/payment-method";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import { AccountDeleteDialog } from "./AccountDeleteDialog";
import { AccountFormDialog } from "./AccountFormDialog";
import { PaymentMethodDeleteDialog } from "./PaymentMethodDeleteDialog";
import { PaymentMethodFormDialog } from "./PaymentMethodFormDialog";

const AUXILIARY_PAYMENT_METHOD_TYPES = new Set([
  "prepaid",
  "gift_card",
  "cash",
]);

const PAYMENT_METHOD_TYPE_LABELS: Record<string, string> = {
  credit_card: "신용카드",
  debit_card: "체크카드",
  prepaid: "선불페이",
  gift_card: "상품권",
  cash: "현금",
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "입출금",
  savings: "적금",
  deposit: "예금",
  stock: "일반",
  isa: "ISA",
  pension: "연금저축",
  cma: "CMA",
};

interface BalanceDetailClientProps {
  kind: "account" | "payment_method";
  id: string;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getAccountIsInvestment(detail: AccountBalanceDetail) {
  return detail.account.category === "investment";
}

function getPaymentMethodHasBalance(detail: PaymentMethodBalanceDetail) {
  return AUXILIARY_PAYMENT_METHOD_TYPES.has(detail.paymentMethod.type);
}

export function BalanceDetailClient({ kind, id }: BalanceDetailClientProps) {
  if (kind === "account") {
    return <AccountBalanceDetailView id={id} />;
  }
  return <PaymentMethodBalanceDetailView id={id} />;
}

function AccountBalanceDetailView({ id }: { id: string }) {
  const { data, isLoading, error } = useAccountBalanceDetail(id);

  if (isLoading) return <BalanceDetailSkeleton />;
  if (error || !data) return <BalanceDetailError />;

  const isInvestment = getAccountIsInvestment(data);

  return (
    <BalanceDetailLayout
      title={data.account.name}
      subtitle={[
        data.account.ownerName,
        data.account.broker,
        data.account.accountType
          ? ACCOUNT_TYPE_LABELS[data.account.accountType]
          : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      balanceLabel={isInvestment ? "예수금" : "현재 잔액"}
      balance={data.account.balance}
      totalLabel={isInvestment ? "계좌 총액" : null}
      totalValue={isInvestment ? data.totalValue : null}
      stockValue={isInvestment ? data.stockValue : null}
      helperText={
        isInvestment
          ? "예수금은 주식 매수/매도와 가계부 입출금에 따라 변합니다."
          : null
      }
      canAdjust
      actionLabel={isInvestment ? "예수금 맞추기" : "실제 잔액 맞추기"}
      target={{
        targetType: "account",
        accountId: data.account.id,
        currentBalance: data.account.balance ?? 0,
        ownerId: data.account.ownerId,
      }}
      timeline={data.timeline}
      account={data.account}
    />
  );
}

function PaymentMethodBalanceDetailView({ id }: { id: string }) {
  const { data, isLoading, error } = usePaymentMethodBalanceDetail(id);

  if (isLoading) return <BalanceDetailSkeleton />;
  if (error || !data) return <BalanceDetailError />;

  const hasBalance = getPaymentMethodHasBalance(data);

  return (
    <BalanceDetailLayout
      title={data.paymentMethod.name}
      subtitle={[
        data.paymentMethod.ownerName,
        PAYMENT_METHOD_TYPE_LABELS[data.paymentMethod.type],
        data.paymentMethod.type === "credit_card" ||
        data.paymentMethod.type === "debit_card"
          ? data.paymentMethod.issuer
          : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      balanceLabel={hasBalance ? "보조잔액" : "자체 잔액 없음"}
      balance={hasBalance ? data.paymentMethod.balance : null}
      totalLabel={null}
      totalValue={null}
      stockValue={null}
      helperText={
        hasBalance
          ? "선불/상품권/현금 잔액은 가계부용 보조잔액이며 총자산에는 포함되지 않습니다."
          : "신용카드와 체크카드는 지출 내역 중심으로 관리하며 자체 잔액을 갖지 않습니다."
      }
      canAdjust={hasBalance}
      actionLabel="실제 잔액 맞추기"
      target={{
        targetType: "payment_method",
        paymentMethodId: data.paymentMethod.id,
        currentBalance: data.paymentMethod.balance ?? 0,
        ownerId: data.paymentMethod.ownerId,
      }}
      timeline={data.timeline}
      paymentMethod={data.paymentMethod}
    />
  );
}

function BalanceDetailLayout({
  title,
  subtitle,
  balanceLabel,
  balance,
  totalLabel,
  totalValue,
  stockValue,
  helperText,
  canAdjust,
  actionLabel,
  target,
  timeline,
  account,
  paymentMethod,
}: {
  title: string;
  subtitle: string;
  balanceLabel: string;
  balance: number | null;
  totalLabel: string | null;
  totalValue: number | null;
  stockValue: number | null;
  helperText: string | null;
  canAdjust: boolean;
  actionLabel: string;
  target: {
    targetType: "account" | "payment_method";
    accountId?: string;
    paymentMethodId?: string;
    currentBalance: number;
    ownerId: string;
  };
  timeline: BalanceTimelineItem[];
  account?: AccountBalanceDetail["account"];
  paymentMethod?: PaymentMethodBalanceDetail["paymentMethod"];
}) {
  const { userId } = useCurrentUserId();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canCurrentUserAdjust = canAdjust && userId === target.ownerId;
  const isOwner = userId === target.ownerId;

  const accountData = account
    ? ({
        ...account,
        createdAt: "",
        updatedAt: "",
      } as AccountWithOwner)
    : null;

  const paymentMethodData = paymentMethod
    ? ({
        ...paymentMethod,
        createdAt: "",
        updatedAt: "",
      } as PaymentMethodWithDetails)
    : null;

  return (
    <div className="space-y-6">
      <ScreenSection>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Banknote className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold text-gray-900 text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-gray-500 text-sm">{subtitle}</p>
              )}
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                <span className="sr-only">수정</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">삭제</span>
              </Button>
            </div>
          )}
        </div>

        {balance !== null && (
          <div className="mt-6">
            <p className="text-gray-500 text-sm mb-1">{balanceLabel}</p>
            <AmountDisclosure
              amount={balance}
              tone="neutral"
              align="left"
              compactThreshold={Number.POSITIVE_INFINITY}
              className="mt-1 block max-w-full text-3xl font-bold leading-tight"
            />
          </div>
        )}

        {totalLabel && (
          <div className="mt-6">
            <MetricStrip columns={{ base: 2 }}>
              <MetricBlock
                label="보유 주식 평가액"
                value={
                  <AmountDisclosure
                    amount={stockValue ?? 0}
                    tone="neutral"
                    align="left"
                    className="text-base font-semibold"
                  />
                }
              />
              <MetricBlock
                label={totalLabel}
                value={
                  <AmountDisclosure
                    amount={totalValue ?? 0}
                    tone="neutral"
                    align="left"
                    className="text-base font-semibold"
                  />
                }
              />
            </MetricStrip>
          </div>
        )}

        {helperText && (
          <p className="mt-4 text-gray-500 text-sm">{helperText}</p>
        )}

        {canCurrentUserAdjust && (
          <Button
            type="button"
            className="mt-5 w-full"
            onClick={() => setAdjustOpen(true)}
          >
            <PencilLine className="size-4" />
            {actionLabel}
          </Button>
        )}
      </ScreenSection>

      <TimelineSection items={timeline} />

      <BalanceAdjustmentDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        title={actionLabel}
        target={target}
      />

      {isOwner && target.targetType === "account" && accountData && (
        <>
          <AccountFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            account={accountData}
          />
          <AccountDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            account={accountData}
          />
        </>
      )}

      {isOwner &&
        target.targetType === "payment_method" &&
        paymentMethodData && (
          <>
            <PaymentMethodFormDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              paymentMethod={paymentMethodData}
            />
            <PaymentMethodDeleteDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              paymentMethod={paymentMethodData}
            />
          </>
        )}
    </div>
  );
}

function TimelineSection({ items }: { items: BalanceTimelineItem[] }) {
  return (
    <ScreenSection>
      <SectionHeader title="잔액 변화 내역" />
      {items.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">
          아직 표시할 내역이 없습니다.
        </div>
      ) : (
        <GroupedList>
          {items.map((item) => (
            <TimelineRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </GroupedList>
      )}
    </ScreenSection>
  );
}

function TimelineRow({ item }: { item: BalanceTimelineItem }) {
  const isPositive = item.delta >= 0;
  const Icon = isPositive ? ArrowDownLeft : ArrowUpRight;

  return (
    <article className="flex items-center gap-3 px-4 py-3 sm:px-5 hover:bg-gray-50/50 transition-colors">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          isPositive
            ? "bg-green-50 text-green-700"
            : "bg-gray-100 text-gray-600",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-medium text-gray-900 text-sm">
            {item.title}
          </p>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-[11px] text-gray-500">
            {item.label}
          </span>
        </div>
        <p className="mt-1 text-gray-500 text-xs">
          {formatDateTime(item.occurredAt)}
        </p>
      </div>
      <div className="max-w-[42%] min-w-[5rem] flex-shrink-0 text-right">
        <p
          className={cn(
            "font-semibold text-sm whitespace-nowrap",
            isPositive ? "text-green-700" : "text-gray-900",
          )}
        >
          {isPositive ? "+" : "-"}
          {formatCurrency(Math.abs(item.delta))}
        </p>
      </div>
    </article>
  );
}

function BalanceAdjustmentDialog({
  open,
  onOpenChange,
  title,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  target: {
    targetType: "account" | "payment_method";
    accountId?: string;
    paymentMethodId?: string;
    currentBalance: number;
  };
}) {
  const mutation = useCreateBalanceAdjustment();
  const [actualBalance, setActualBalance] = useState(
    String(target.currentBalance),
  );
  const [memo, setMemo] = useState("");

  const delta = useMemo(() => {
    const next = Number(actualBalance);
    return Number.isFinite(next) ? next - target.currentBalance : 0;
  }, [actualBalance, target.currentBalance]);

  const handleSubmit = async () => {
    const nextBalance = Number(actualBalance);
    if (!Number.isFinite(nextBalance)) return;

    await mutation.mutateAsync({
      targetType: target.targetType,
      accountId: target.accountId,
      paymentMethodId: target.paymentMethodId,
      actualBalance: nextBalance,
      memo: memo.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            앱 잔액과 실제 잔액의 차이를 맞춘 기록이에요. 수입/지출 통계에는
            포함되지 않아요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="actual-balance">실제 잔액</Label>
            <Input
              id="actual-balance"
              type="number"
              inputMode="decimal"
              value={actualBalance}
              onChange={(event) => setActualBalance(event.target.value)}
            />
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">현재 앱 잔액</span>
              <span className="font-medium">
                {formatCurrency(target.currentBalance)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-gray-500">조정 차액</span>
              <span className="font-semibold">{formatCurrency(delta)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjustment-memo">메모</Label>
            <Textarea
              id="adjustment-memo"
              rows={3}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              mutation.isPending || !Number.isFinite(Number(actualBalance))
            }
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BalanceDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

function BalanceDetailError() {
  return (
    <ScreenState
      type="error"
      title="상세 정보를 불러오지 못했습니다."
      description="잠시 후 다시 시도해주세요."
    />
  );
}
