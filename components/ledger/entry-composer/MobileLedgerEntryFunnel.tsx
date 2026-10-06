"use client";

import { useFunnel } from "@use-funnel/browser";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type UseFieldArrayReturn,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import type { ComposerStep } from "@/lib/ledger/composer";
import {
  createComposerDraft,
  getComposerStepIssues,
  getMissingComposerStep,
} from "@/lib/ledger/composer";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { EntryBasicsStep } from "./EntryBasicsStep";
import { EntryClassificationStep } from "./EntryClassificationStep";
import { EntryDatesBooksStep } from "./EntryDatesBooksStep";
import { EntryMoneySourcesStep } from "./EntryMoneySourcesStep";
import { EntryReviewStep } from "./EntryReviewStep";
import { SingleEntryDetailsStep } from "./SingleEntryDetailsStep";

type ComposerNavigation = {
  EntryBasics: { clientId?: string; fromReview?: boolean };
  SingleEntryDetails: Record<string, never>;
  EntryClassification: { clientId?: string; fromReview?: boolean };
  EntryMoneySources: { clientId?: string; fromReview?: boolean };
  EntryDatesBooks: { clientId?: string; fromReview?: boolean };
  EntryReview: Record<string, never>;
};

interface MobileLedgerEntryFunnelProps {
  itemsArray: UseFieldArrayReturn<LedgerComposerValues, "items">;
  active: boolean;
  initialBookId: string;
  initialDate: string;
  onSave: () => void;
  isSaving: boolean;
  onExit: () => void;
}

export function MobileLedgerEntryFunnel({
  itemsArray,
  active,
  initialBookId,
  initialDate,
  onSave,
  isSaving,
  onExit,
}: MobileLedgerEntryFunnelProps) {
  const form = useFormContext<LedgerComposerValues>();
  const { append } = itemsArray;
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const [ready, setReady] = useState(false);
  const reviewFocusId = useRef<string | undefined>(undefined);
  const clearReviewFocus = useCallback(() => {
    reviewFocusId.current = undefined;
  }, []);
  const funnel = useFunnel<ComposerNavigation>({
    id: "ledger-entry-composer",
    initial: { step: "EntryBasics", context: {} },
  });
  const resetHistory = useRef(funnel.history.replace);

  const pushEditStep = (step: ComposerStep, clientId?: string) => {
    if (step === "basics")
      return funnel.history.push("EntryBasics", () => ({
        clientId,
        fromReview: true,
      }));
    if (step === "classification")
      return funnel.history.push("EntryClassification", () => ({
        clientId,
        fromReview: true,
      }));
    if (step === "sources")
      return funnel.history.push("EntryMoneySources", () => ({
        clientId,
        fromReview: true,
      }));
    if (step === "datesBooks")
      return funnel.history.push("EntryDatesBooks", () => ({
        clientId,
        fromReview: true,
      }));
    return funnel.history.push("EntryReview", () => ({}));
  };

  useEffect(() => {
    resetHistory.current("EntryBasics", () => ({}));
    setReady(true);
    // The flow starts fresh on mount; unsaved drafts are intentionally not restored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = (clientId?: string) =>
    items.filter((item) => !clientId || item.clientId === clientId);
  const basicsValid = (clientId?: string) => {
    let firstInvalid:
      | `items.${number}.title`
      | `items.${number}.amount`
      | null = null;
    for (const [index, item] of items.entries()) {
      if (clientId && item.clientId !== clientId) continue;
      const titlePath = `items.${index}.title` as const;
      const amountPath = `items.${index}.amount` as const;
      form.clearErrors([titlePath, amountPath]);
      for (const issue of getComposerStepIssues(item, "basics")) {
        const path = issue.path[0] === "title" ? titlePath : amountPath;
        form.setError(path, { type: "validate", message: issue.message });
        firstInvalid ??= path;
      }
    }
    if (firstInvalid) form.setFocus(firstInvalid);
    return firstInvalid === null;
  };
  const classificationValid = (clientId?: string) => {
    let invalid: { index: number; path: `items.${number}.categoryId` } | null =
      null;
    for (const [index, item] of items.entries()) {
      if (clientId && item.clientId !== clientId) continue;
      const path = `items.${index}.categoryId` as const;
      form.clearErrors(path);
      for (const issue of getComposerStepIssues(item, "classification")) {
        form.setError(path, { type: "validate", message: issue.message });
        invalid ??= { index, path };
      }
    }
    if (invalid) {
      const target = invalid;
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(
            `button[aria-label="카테고리 ${target.index + 1}"]`,
          )
          ?.focus(),
      );
    }
    return invalid === null;
  };
  const sourcesValid = (clientId?: string) => {
    let invalid: {
      index: number;
      label: string;
      path:
        | `items.${number}.accountId`
        | `items.${number}.fromValue`
        | `items.${number}.toValue`;
    } | null = null;
    for (const [index, item] of items.entries()) {
      if (clientId && item.clientId !== clientId) continue;
      const fromPath = `items.${index}.fromValue` as const;
      const toPath = `items.${index}.toValue` as const;
      const accountPath = `items.${index}.accountId` as const;
      form.clearErrors([
        fromPath,
        toPath,
        accountPath,
        `items.${index}.paymentMethodId`,
      ]);
      for (const issue of getComposerStepIssues(item, "sources")) {
        const field = issue.path[0];
        const path =
          field === "fromValue"
            ? fromPath
            : field === "toValue"
              ? toPath
              : accountPath;
        const label =
          field === "fromValue"
            ? "출발지"
            : field === "toValue"
              ? "도착지"
              : item.type === "income"
                ? "입금 계좌"
                : "출금처";
        form.setError(path, { type: "validate", message: issue.message });
        invalid ??= { index, label, path };
      }
    }
    if (invalid) {
      const target = invalid;
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(
            `button[aria-label="${target.label} ${target.index + 1}"]`,
          )
          ?.focus(),
      );
    }
    return invalid === null;
  };
  const datesBooksValid = (clientId?: string) =>
    selected(clientId).every(
      (item) => getComposerStepIssues(item, "datesBooks").length === 0,
    );

  const nextFromReviewEdit = (
    clientId: string | undefined,
    push: (step: ComposerStep, clientId?: string) => void,
  ) => {
    const target = selected(clientId)[0];
    if (!target) return;
    const missing = getMissingComposerStep(target);
    if (
      missing === "basics" ||
      missing === "classification" ||
      missing === "sources" ||
      missing === "datesBooks"
    ) {
      push(missing, clientId);
      return;
    }
    push("review");
  };

  useEffect(() => {
    const handleBack = () => {
      if (!ready || !active) return;
      if (funnel.index > 0) void funnel.history.back();
      else onExit();
    };
    window.addEventListener("oat:ledger-composer-back", handleBack);
    return () =>
      window.removeEventListener("oat:ledger-composer-back", handleBack);
  }, [active, ready, funnel.index, funnel.history, onExit]);

  if (!ready || !active) return <div hidden aria-hidden="true" />;
  const transitionSegment = {
    EntryBasics: "basics",
    SingleEntryDetails: "single-details",
    EntryClassification: "classification",
    EntryMoneySources: "money-sources",
    EntryDatesBooks: "dates-books",
    EntryReview: "review",
  }[funnel.step];

  return (
    <div
      key={funnel.step}
      data-ssgoi-transition={`/ledger/records/new/daily/composer-${transitionSegment}`}
    >
      <funnel.Render
        EntryBasics={({ context, history }) => (
          <EntryBasicsStep
            itemsArray={itemsArray}
            date={initialDate}
            bookId={initialBookId}
            editingClientId={context.clientId}
            onNext={() => {
              if (!basicsValid(context.clientId)) {
                return;
              }
              if (context.fromReview && context.clientId) {
                nextFromReviewEdit(context.clientId, (step, clientId) =>
                  pushEditStep(step, clientId),
                );
                return;
              }
              if (items.length === 1)
                history.push("SingleEntryDetails", () => ({}));
              else history.push("EntryClassification", () => ({}));
            }}
          />
        )}
        SingleEntryDetails={() => (
          <SingleEntryDetailsStep
            onSave={() => {
              if (!items[0]) {
                toast.error("필수 항목을 확인해 주세요.");
                return;
              }
              const missing = getMissingComposerStep(items[0]);
              if (missing === "classification") {
                classificationValid(items[0].clientId);
                return;
              }
              if (missing === "sources") {
                sourcesValid(items[0].clientId);
                return;
              }
              if (missing) return;
              onSave();
            }}
            isSaving={isSaving}
          />
        )}
        EntryClassification={({ context, history }) => (
          <EntryClassificationStep
            clientId={context.clientId}
            onNext={() => {
              if (!classificationValid(context.clientId)) {
                return;
              }
              if (context.fromReview) {
                nextFromReviewEdit(context.clientId, (step, clientId) =>
                  pushEditStep(step, clientId),
                );
                return;
              }
              history.push("EntryMoneySources", () => ({}));
            }}
          />
        )}
        EntryMoneySources={({ context, history }) => (
          <EntryMoneySourcesStep
            clientId={context.clientId}
            onNext={() => {
              if (!sourcesValid(context.clientId)) {
                return;
              }
              if (context.fromReview) {
                nextFromReviewEdit(context.clientId, (step, clientId) =>
                  pushEditStep(step, clientId),
                );
                return;
              }
              history.push("EntryDatesBooks", () => ({}));
            }}
          />
        )}
        EntryDatesBooks={({ context, history }) => (
          <EntryDatesBooksStep
            clientId={context.clientId}
            onNext={() => {
              if (!datesBooksValid(context.clientId)) {
                toast.error("날짜와 장부를 확인해 주세요.");
                return;
              }
              if (context.fromReview && context.clientId) {
                nextFromReviewEdit(context.clientId, (step, clientId) =>
                  pushEditStep(step, clientId),
                );
                return;
              }
              history.push("EntryReview", () => ({}));
            }}
          />
        )}
        EntryReview={({ history }) => (
          <EntryReviewStep
            focusId={reviewFocusId.current}
            onFocusRestored={clearReviewFocus}
            onEdit={(clientId, step, anchorId) => {
              reviewFocusId.current = anchorId;
              void pushEditStep(step, clientId);
            }}
            onAdd={() => {
              const clientId = crypto.randomUUID();
              append(
                createComposerDraft({
                  clientId,
                  bookId: initialBookId,
                  date: initialDate,
                }),
              );
              void history.push("EntryBasics", () => ({}));
            }}
            onSave={() => {
              const parsed = form.getValues();
              if (
                parsed.items.length === 0 ||
                parsed.items.some((item) => getMissingComposerStep(item))
              ) {
                const item = parsed.items.find((candidate) =>
                  getMissingComposerStep(candidate),
                );
                const missing = item && getMissingComposerStep(item);
                if (item && missing) pushEditStep(missing, item.clientId);
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
