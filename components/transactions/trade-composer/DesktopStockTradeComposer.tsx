"use client";

import { useState } from "react";
import {
  type UseFieldArrayReturn,
  type UseFormReturn,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import {
  ComposerEditDialog,
  ComposerEditForm,
  useComposerItemSnapshot,
} from "@/components/composer/ComposerEditDialog";
import {
  ComposerList,
  ComposerListRow,
} from "@/components/composer/ComposerList";
import { composerFieldClassName } from "@/components/composer/field-styles";
import { AmountText } from "@/components/layout/screen";
import { AccountSelector } from "@/components/transactions/AccountSelector";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import {
  createTradeDraft,
  getMissingTradeStep,
  getTradeStepIssues,
} from "@/lib/stock-trades/composer";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type {
  StockTradeComposerItem,
  StockTradeComposerValues,
} from "@/schemas/stock-trade-composer";
import { TradeBasicsRow } from "./TradeBasicsStep";

const MAX_TRADES = 20;

type TradeField = keyof Pick<
  StockTradeComposerItem,
  "type" | "stock" | "quantity" | "price" | "transactedAt" | "accountId"
>;

/** 행의 누락 값을 필드 오류로 표시하고 첫 누락 필드를 돌려준다. */
function markMissing(
  form: UseFormReturn<StockTradeComposerValues>,
  index: number,
): TradeField | null {
  const item = form.getValues(`items.${index}`);
  let first: TradeField | null = null;
  for (const step of ["basics", "details"] as const) {
    for (const issue of getTradeStepIssues(item, step)) {
      const field = issue.path[0] as TradeField;
      form.setError(`items.${index}.${field}`, {
        type: "validate",
        message: issue.message,
      });
      first ??= field;
    }
  }
  return first;
}

/** 누락 필드로 포커스를 옮긴다. 버튼형 선택기는 그 트리거로 간다. */
function focusField(index: number, field: TradeField) {
  const row = index + 1;
  const selector = {
    type: `[role="radiogroup"][aria-label="매수/매도 ${row}"] [role="radio"]`,
    stock: `[role="group"][aria-label="종목 ${row}"] button`,
    quantity: `[aria-label="수량 ${row}"]`,
    price: `[aria-label="단가 ${row}"]`,
    transactedAt: `[aria-label="거래일 ${row}"]`,
    accountId: `#trade-account-${row} button`,
  }[field];
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(selector)?.focus(),
  );
}

interface TradeEditDialogProps {
  clientId: string;
  /** 종목 추가로 막 만든 행이면 취소할 때 행을 지운다. */
  isNew: boolean;
  ownerId: string;
  onRemove: (index: number) => void;
  onClose: () => void;
}

/** 한 거래의 모든 필드를 한 화면에서 받는다. 취소하면 열기 전 상태로 돌린다. */
function TradeEditDialog({
  clientId,
  isNew,
  ownerId,
  onRemove,
  onClose,
}: TradeEditDialogProps) {
  const form = useFormContext<StockTradeComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const index = items.findIndex((item) => item.clientId === clientId);
  const item = index >= 0 ? items[index] : undefined;
  const restoreSnapshot = useComposerItemSnapshot({
    item,
    index,
    restore: (snapshot) =>
      form.setValue(`items.${index}`, snapshot, { shouldDirty: true }),
    onMissing: onClose,
  });

  if (!item || index < 0) return null;
  const row = index + 1;
  const dateError = form.getFieldState(
    `items.${index}.transactedAt`,
    form.formState,
  ).error?.message;
  const accountError = form.getFieldState(
    `items.${index}.accountId`,
    form.formState,
  ).error?.message;

  const cancel = () => {
    form.clearErrors(`items.${index}`);
    if (isNew) onRemove(index);
    else restoreSnapshot();
    onClose();
  };
  const confirm = () => {
    const missing = markMissing(form, index);
    if (missing) {
      focusField(index, missing);
      return;
    }
    onClose();
  };

  return (
    <ComposerEditDialog open onClose={cancel}>
      <ComposerEditForm
        title="거래 입력"
        description="매수/매도, 종목, 수량, 단가, 거래일, 계좌, 메모를 입력합니다."
        onCancel={cancel}
        onConfirm={confirm}
      >
        <TradeBasicsRow index={index} showNumber={false} />
        <div className="space-y-2">
          <Label htmlFor={`trade-date-${row}`}>거래일</Label>
          <DatePickerInput
            id={`trade-date-${row}`}
            aria-label={`거래일 ${row}`}
            className={composerFieldClassName}
            value={item.transactedAt}
            onChange={(value) => {
              form.setValue(`items.${index}.transactedAt`, value ?? "", {
                shouldDirty: true,
              });
              if (value) form.clearErrors(`items.${index}.transactedAt`);
            }}
          />
          {dateError && (
            <p role="alert" className="text-sm text-destructive">
              {dateError}
            </p>
          )}
        </div>
        <div id={`trade-account-${row}`}>
          <AccountSelector
            control={form.control}
            name={`items.${index}.accountId`}
            variant="inline"
            placeholder="계좌 선택"
            ownerId={ownerId}
            onChange={(value) => {
              if (value) form.clearErrors(`items.${index}.accountId`);
            }}
          />
          {accountError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {accountError}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`trade-memo-${row}`}>메모</Label>
          <Textarea
            id={`trade-memo-${row}`}
            aria-label={`메모 ${row}`}
            className={cn(composerFieldClassName, "min-h-20")}
            rows={3}
            maxLength={500}
            placeholder="추가로 남길 내용"
            {...form.register(`items.${index}.memo`)}
          />
        </div>
      </ComposerEditForm>
    </ComposerEditDialog>
  );
}

interface DesktopStockTradeComposerProps {
  itemsArray: UseFieldArrayReturn<StockTradeComposerValues, "items">;
  ownerId: string;
  /** 새 행의 거래일. daily 진입이면 그 날짜다. */
  initialDate: string;
  /** 새 행의 계좌 */
  defaultAccountId?: string;
  onSave: () => void;
  isSaving: boolean;
}

/** 데스크톱: 거래를 압축 목록으로 보여주고, 행을 누르면 편집 Dialog를 연다. */
export function DesktopStockTradeComposer({
  itemsArray,
  ownerId,
  initialDate,
  defaultAccountId,
  onSave,
  isSaving,
}: DesktopStockTradeComposerProps) {
  const form = useFormContext<StockTradeComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const { data: accounts = [] } = useAccounts();
  const [editing, setEditing] = useState<{
    clientId: string;
    isNew: boolean;
  } | null>(null);
  const { fields, append, remove } = itemsArray;

  const handleAdd = () => {
    if (fields.length >= MAX_TRADES) {
      toast.error(`한 번에 최대 ${MAX_TRADES}건까지 저장할 수 있습니다.`);
      return;
    }
    const draft = createTradeDraft({
      clientId: crypto.randomUUID(),
      date: initialDate,
      accountId: defaultAccountId,
    });
    append(draft, { shouldFocus: false });
    setEditing({ clientId: draft.clientId, isNew: true });
  };

  const handleSubmit = () => {
    if (isSaving) return;
    const current = form.getValues("items");
    const index = current.findIndex((item) => getMissingTradeStep(item));
    const incomplete = index >= 0 ? current[index] : undefined;
    if (incomplete) {
      const missing = markMissing(form, index);
      setEditing({ clientId: incomplete.clientId, isNew: false });
      if (missing) focusField(index, missing);
      return;
    }
    onSave();
  };

  return (
    <>
      <ComposerList
        title="주식 거래"
        description="매수/매도, 거래일, 계좌는 거래마다 정할 수 있어요."
        addLabel="종목 추가"
        onAdd={handleAdd}
        submitLabel={isSaving ? "저장 중..." : "모두 저장"}
        submitDisabled={isSaving || fields.length === 0}
        onSubmit={handleSubmit}
      >
        {fields.map((field, index) => {
          const item = items[index];
          if (!item) return null;
          const account = accounts.find(
            (candidate) => candidate.id === item.accountId,
          );
          const currency = item.stock?.market === "US" ? "USD" : "KRW";
          const quantity = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          return (
            <ComposerListRow
              key={field.id}
              onEdit={() =>
                setEditing({ clientId: item.clientId, isNew: false })
              }
              deleteLabel={`${index + 1}번째 거래 삭제`}
              onDelete={() => remove(index)}
              trailing={
                <AmountText amount={quantity * price} currency={currency} />
              }
            >
              <span className="block text-xs text-muted-foreground">
                <span
                  className={cn(
                    item.type === "buy" && "text-[#F04452]",
                    item.type === "sell" && "text-[#3182F6]",
                  )}
                >
                  {item.type === "buy"
                    ? "매수"
                    : item.type === "sell"
                      ? "매도"
                      : "매수/매도 미선택"}
                </span>
                {` · ${account?.name ?? "계좌 미선택"} · ${item.transactedAt || "거래일 미선택"}`}
              </span>
              <span className="mt-1 line-clamp-2 break-words font-medium">
                {item.stock?.name ?? "종목을 선택해 주세요"}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {quantity}주 × {formatCurrency(price, currency)}
              </span>
            </ComposerListRow>
          );
        })}
      </ComposerList>
      {editing && (
        <TradeEditDialog
          key={editing.clientId}
          clientId={editing.clientId}
          isNew={editing.isNew}
          ownerId={ownerId}
          onRemove={remove}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
