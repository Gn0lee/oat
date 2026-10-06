"use client";

import { useFunnel } from "@use-funnel/browser";
import { useEffect, useRef, useState } from "react";
import {
  type UseFieldArrayReturn,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useComposerBack } from "@/components/composer/use-composer-back";
import {
  type ReviewEditContext,
  useReviewEditNavigation,
} from "@/components/composer/use-review-edit-navigation";
import {
  createTradeDraft,
  getMissingTradeStep,
  getTradeStepIssues,
  type TradeComposerStep,
} from "@/lib/stock-trades/composer";
import type {
  StockTradeComposerItem,
  StockTradeComposerValues,
} from "@/schemas/stock-trade-composer";
import { SingleTradeDetailsStep } from "./SingleTradeDetailsStep";
import { TradeBasicsStep } from "./TradeBasicsStep";
import { TradeDateAccountStep } from "./TradeDateAccountStep";
import { TradeReviewStep } from "./TradeReviewStep";

type TradeComposerNavigation = {
  TradeBasics: ReviewEditContext;
  SingleTradeDetails: Record<string, never>;
  TradeDateAccount: ReviewEditContext;
  TradeReview: Record<string, never>;
};

type TradeField = keyof Pick<
  StockTradeComposerItem,
  "type" | "stock" | "quantity" | "price" | "transactedAt" | "accountId"
>;

export const STOCK_TRADE_COMPOSER_FUNNEL_ID = "stock-trade-composer";

const TRANSITION_SEGMENT: Record<keyof TradeComposerNavigation, string> = {
  TradeBasics: "basics",
  SingleTradeDetails: "single-details",
  TradeDateAccount: "date-account",
  TradeReview: "review",
};

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

interface MobileStockTradeFunnelProps {
  itemsArray: UseFieldArrayReturn<StockTradeComposerValues, "items">;
  ownerId: string;
  onSave: () => void;
  isSaving: boolean;
  onExit: () => void;
}

export function MobileStockTradeFunnel({
  itemsArray,
  ownerId,
  onSave,
  isSaving,
  onExit,
}: MobileStockTradeFunnelProps) {
  const form = useFormContext<StockTradeComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const [ready, setReady] = useState(false);
  const funnel = useFunnel<TradeComposerNavigation>({
    id: STOCK_TRADE_COMPOSER_FUNNEL_ID,
    initial: { step: "TradeBasics", context: {} },
  });
  const resetHistory = useRef(funnel.history.replace);
  const reviewEdit = useReviewEditNavigation({
    steps: { basics: "TradeBasics", details: "TradeDateAccount" },
    reviewStep: "TradeReview",
    push: (step, context) => funnel.history.push(step, () => context),
  });

  useEffect(() => {
    resetHistory.current("TradeBasics", () => ({}));
    setReady(true);
    // The flow starts fresh on mount; unsaved drafts are intentionally not restored.
  }, []);

  /**
   * 단계의 누락 값을 행별 필드 오류로 표시하고 첫 누락 필드로 포커스한다.
   * clientId가 있으면 그 거래만 본다.
   */
  const stepValid = (step: TradeComposerStep, clientId?: string) => {
    let firstInvalid: { index: number; field: TradeField } | null = null;
    for (const [index, item] of items.entries()) {
      if (clientId && item.clientId !== clientId) continue;
      for (const issue of getTradeStepIssues(item, step)) {
        const field = issue.path[0] as TradeField;
        form.setError(`items.${index}.${field}`, {
          type: "validate",
          message: issue.message,
        });
        firstInvalid ??= { index, field };
      }
    }
    if (firstInvalid) focusField(firstInvalid.index, firstInvalid.field);
    return firstInvalid === null;
  };

  /** 검토에서 들어간 단계를 마치면 그 거래의 다음 누락 단계나 검토로 간다. */
  const nextFromReviewEdit = (clientId: string) => {
    const target = items.find((item) => item.clientId === clientId);
    if (!target) return;
    reviewEdit.openStep(getMissingTradeStep(target), clientId);
  };

  useComposerBack(() => {
    if (!ready) return;
    if (funnel.index > 0) void funnel.history.back();
    else onExit();
  });

  if (!ready) return <div hidden aria-hidden="true" />;

  return (
    <div
      key={funnel.step}
      data-ssgoi-transition={`/assets/stock/transactions/new/daily/composer-${TRANSITION_SEGMENT[funnel.step]}`}
    >
      <funnel.Render
        TradeBasics={({ context, history }) => (
          <TradeBasicsStep
            itemsArray={itemsArray}
            editingClientId={context.clientId}
            onNext={() => {
              if (!stepValid("basics", context.clientId)) return;
              if (context.fromReview && context.clientId) {
                nextFromReviewEdit(context.clientId);
                return;
              }
              if (items.length === 1)
                history.push("SingleTradeDetails", () => ({}));
              else history.push("TradeDateAccount", () => ({}));
            }}
          />
        )}
        SingleTradeDetails={({ history }) => (
          <SingleTradeDetailsStep
            ownerId={ownerId}
            isSaving={isSaving}
            onSave={() => {
              const item = items[0];
              if (!item) return;
              const missing = getMissingTradeStep(item);
              if (missing === "basics") {
                void history.back();
                return;
              }
              if (missing && !stepValid(missing)) return;
              onSave();
            }}
          />
        )}
        TradeDateAccount={({ context, history }) => (
          <TradeDateAccountStep
            clientId={context.clientId}
            ownerId={ownerId}
            onNext={() => {
              if (context.fromReview && context.clientId) {
                if (!stepValid("details", context.clientId)) return;
                nextFromReviewEdit(context.clientId);
                return;
              }
              // 모든 거래에 적용할 값은 첫 거래 칸에 받는다.
              const [first] = items;
              if (!first || !stepValid("details", first.clientId)) return;
              for (const index of items.keys()) {
                if (index === 0) continue;
                form.setValue(
                  `items.${index}.transactedAt`,
                  first.transactedAt,
                );
                form.setValue(`items.${index}.accountId`, first.accountId);
                form.clearErrors([
                  `items.${index}.transactedAt`,
                  `items.${index}.accountId`,
                ]);
              }
              history.push("TradeReview", () => ({}));
            }}
          />
        )}
        TradeReview={() => (
          <TradeReviewStep
            focusId={reviewEdit.focusId}
            onFocusRestored={reviewEdit.clearFocus}
            onEdit={reviewEdit.editFromReview}
            onAdd={() => {
              // 새 거래는 첫 거래의 거래일·계좌로 시작하고, 그 거래만 입력한 뒤 검토로 돌아온다.
              const clientId = crypto.randomUUID();
              itemsArray.append(
                createTradeDraft({
                  clientId,
                  date: items[0]?.transactedAt ?? "",
                  accountId: items[0]?.accountId,
                }),
              );
              reviewEdit.openStep("basics", clientId);
            }}
            onSave={() => {
              const missing = items
                .map((item) => ({ item, step: getMissingTradeStep(item) }))
                .find(({ step }) => step);
              if (missing?.step) {
                stepValid(missing.step, missing.item.clientId);
                reviewEdit.openStep(missing.step, missing.item.clientId);
                return;
              }
              onSave();
            }}
            isSaving={isSaving}
          />
        )}
      />
    </div>
  );
}
