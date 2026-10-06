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

type TradeComposerNavigation = {
  TradeBasics: Record<string, never>;
  SingleTradeDetails: Record<string, never>;
};

type TradeField = keyof Pick<
  StockTradeComposerItem,
  "type" | "stock" | "quantity" | "price" | "transactedAt" | "accountId"
>;

export const STOCK_TRADE_COMPOSER_FUNNEL_ID = "stock-trade-composer";

const TRANSITION_SEGMENT: Record<keyof TradeComposerNavigation, string> = {
  TradeBasics: "basics",
  SingleTradeDetails: "single-details",
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

  useEffect(() => {
    resetHistory.current("TradeBasics", () => ({}));
    setReady(true);
    // The flow starts fresh on mount; unsaved drafts are intentionally not restored.
  }, []);

  /** 단계의 누락 값을 행별 필드 오류로 표시하고 첫 누락 필드로 포커스한다. */
  const stepValid = (step: TradeComposerStep) => {
    let firstInvalid: { index: number; field: TradeField } | null = null;
    for (const [index, item] of items.entries()) {
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
        TradeBasics={({ history }) => (
          <TradeBasicsStep
            itemsArray={itemsArray}
            onNext={() => {
              if (!stepValid("basics")) return;
              history.push("SingleTradeDetails", () => ({}));
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
      />
    </div>
  );
}
