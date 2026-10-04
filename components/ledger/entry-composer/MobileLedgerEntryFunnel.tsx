"use client";

import { useFunnel } from "@use-funnel/browser";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { ComposerStep } from "@/lib/ledger/composer";
import {
  createComposerDraft,
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
  active: boolean;
  initialBookId: string;
  initialDate: string;
  onSave: () => void;
  isSaving: boolean;
  onExit: () => void;
}

export function MobileLedgerEntryFunnel({
  active,
  initialBookId,
  initialDate,
  onSave,
  isSaving,
  onExit,
}: MobileLedgerEntryFunnelProps) {
  const form = useFormContext<LedgerComposerValues>();
  const { append } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const [ready, setReady] = useState(false);
  const funnel = useFunnel<ComposerNavigation>({
    id: "ledger-entry-composer",
    initial: { step: "EntryBasics", context: {} },
  });
  const resetHistory = useRef(funnel.history.replace);

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
      if (!item.title.trim()) {
        form.setError(titlePath, {
          type: "required",
          message: "내용을 입력해주세요.",
        });
        firstInvalid ??= titlePath;
      }
      if (
        !item.amount.trim() ||
        !Number.isFinite(Number(item.amount)) ||
        Number(item.amount) <= 0
      ) {
        form.setError(amountPath, {
          type: "validate",
          message: "금액은 0보다 커야 합니다.",
        });
        firstInvalid ??= amountPath;
      }
    }
    if (firstInvalid) {
      form.setFocus(firstInvalid);
      requestAnimationFrame(() => {
        const order = Number(firstInvalid?.split(".")[1]) + 1;
        const field = firstInvalid?.endsWith(".title") ? "내용" : "금액";
        document
          .querySelector<HTMLInputElement>(
            `input[aria-label="${field} ${order}"]`,
          )
          ?.focus();
      });
    }
    return firstInvalid === null;
  };
  const classificationValid = (clientId?: string) => {
    let invalid: { index: number; path: `items.${number}.categoryId` } | null =
      null;
    for (const [index, item] of items.entries()) {
      if (clientId && item.clientId !== clientId) continue;
      const path = `items.${index}.categoryId` as const;
      form.clearErrors(path);
      if (
        (item.type === "expense" || item.type === "income") &&
        !item.categoryId
      ) {
        form.setError(path, {
          type: "required",
          message: "카테고리를 선택해주세요.",
        });
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
      path: `items.${number}.accountId` | `items.${number}.fromValue`;
    } | null = null;
    for (const [index, item] of items.entries()) {
      if (clientId && item.clientId !== clientId) continue;
      const fromPath = `items.${index}.fromValue` as const;
      const accountPath = `items.${index}.accountId` as const;
      form.clearErrors([
        fromPath,
        accountPath,
        `items.${index}.paymentMethodId`,
      ]);
      if (
        item.type === "transfer" &&
        (!item.fromValue || !item.toValue || item.fromValue === item.toValue)
      ) {
        form.setError(fromPath, {
          type: "required",
          message: "서로 다른 출발지와 도착지를 선택해주세요.",
        });
        invalid ??= { index, label: "출발지", path: fromPath };
      } else if (
        item.type === "non_expense_withdrawal" &&
        !item.accountId &&
        !item.paymentMethodId
      ) {
        form.setError(accountPath, {
          type: "required",
          message: "출금처를 선택해주세요.",
        });
        invalid ??= { index, label: "출금처", path: accountPath };
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
    selected(clientId).every((item) =>
      Boolean(item.transactedAt && item.bookId),
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
      if (!active || !ready) return;
      if (funnel.index > 0) void funnel.history.back();
      else onExit();
    };
    window.addEventListener("oat:ledger-composer-back", handleBack);
    return () =>
      window.removeEventListener("oat:ledger-composer-back", handleBack);
  }, [active, ready, funnel.index, funnel.history, onExit]);

  if (!ready || !active) return <div hidden aria-hidden="true" />;

  return (
    <div
      data-ssgoi-transition={`ledger-composer-${funnel.step}`}
      className="min-h-[calc(100dvh-3.5rem)]"
    >
      <funnel.Render
        EntryBasics={({ context, history }) => (
          <EntryBasicsStep
            date={initialDate}
            bookId={initialBookId}
            editingClientId={context.clientId}
            onNext={() => {
              if (!basicsValid(context.clientId)) {
                toast.error("내용과 금액을 확인해주세요.");
                return;
              }
              if (context.fromReview && context.clientId) {
                nextFromReviewEdit(context.clientId, (step, clientId) => {
                  if (step === "basics")
                    void history.push("EntryBasics", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "classification")
                    void history.push("EntryClassification", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "sources")
                    void history.push("EntryMoneySources", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "datesBooks")
                    void history.push("EntryDatesBooks", {
                      clientId,
                      fromReview: true,
                    });
                  else void history.push("EntryReview", {});
                });
                return;
              }
              if (items.length === 1)
                history.push("SingleEntryDetails", () => ({}));
              else history.push("EntryClassification", () => ({}));
            }}
          />
        )}
        SingleEntryDetails={({ history }) => (
          <SingleEntryDetailsStep
            onBack={() => void history.back()}
            onSave={() => {
              if (!items[0]) {
                toast.error("필수 항목을 확인해주세요.");
                return;
              }
              const missing = getMissingComposerStep(items[0]);
              if (missing === "classification") {
                classificationValid(items[0].clientId);
                toast.error("카테고리를 선택해주세요.");
                return;
              }
              if (missing === "sources") {
                sourcesValid(items[0].clientId);
                toast.error("금융수단을 선택해주세요.");
                return;
              }
              if (missing) {
                toast.error("필수 항목을 확인해주세요.");
                return;
              }
              onSave();
            }}
            isSaving={isSaving}
          />
        )}
        EntryClassification={({ context, history }) => (
          <EntryClassificationStep
            clientId={context.clientId}
            onBack={() => void history.back()}
            onNext={() => {
              if (!classificationValid(context.clientId)) {
                toast.error("카테고리를 선택해주세요.");
                return;
              }
              if (context.fromReview) {
                nextFromReviewEdit(context.clientId, (step, clientId) => {
                  if (step === "basics")
                    void history.push("EntryBasics", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "classification")
                    void history.push("EntryClassification", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "sources")
                    void history.push("EntryMoneySources", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "datesBooks")
                    void history.push("EntryDatesBooks", {
                      clientId,
                      fromReview: true,
                    });
                  else void history.push("EntryReview", {});
                });
                return;
              }
              history.push("EntryMoneySources", () => ({}));
            }}
          />
        )}
        EntryMoneySources={({ context, history }) => (
          <EntryMoneySourcesStep
            clientId={context.clientId}
            onBack={() => void history.back()}
            onNext={() => {
              if (!sourcesValid(context.clientId)) {
                toast.error("금융수단을 확인해주세요.");
                return;
              }
              if (context.fromReview) {
                nextFromReviewEdit(context.clientId, (step, clientId) => {
                  if (step === "basics")
                    void history.push("EntryBasics", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "classification")
                    void history.push("EntryClassification", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "sources")
                    void history.push("EntryMoneySources", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "datesBooks")
                    void history.push("EntryDatesBooks", {
                      clientId,
                      fromReview: true,
                    });
                  else void history.push("EntryReview", {});
                });
                return;
              }
              history.push("EntryDatesBooks", () => ({}));
            }}
          />
        )}
        EntryDatesBooks={({ context, history }) => (
          <EntryDatesBooksStep
            clientId={context.clientId}
            onBack={() => void history.back()}
            onNext={() => {
              if (!datesBooksValid(context.clientId)) {
                toast.error("날짜와 장부를 확인해주세요.");
                return;
              }
              if (context.fromReview && context.clientId) {
                nextFromReviewEdit(context.clientId, (step, clientId) => {
                  if (step === "basics")
                    void history.push("EntryBasics", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "classification")
                    void history.push("EntryClassification", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "sources")
                    void history.push("EntryMoneySources", {
                      clientId,
                      fromReview: true,
                    });
                  else if (step === "datesBooks")
                    void history.push("EntryDatesBooks", {
                      clientId,
                      fromReview: true,
                    });
                  else void history.push("EntryReview", {});
                });
                return;
              }
              history.push("EntryReview", () => ({}));
            }}
          />
        )}
        EntryReview={({ history }) => (
          <EntryReviewStep
            onEdit={(clientId, step) => {
              if (step === "basics")
                void history.push("EntryBasics", () => ({
                  clientId,
                  fromReview: true,
                }));
              else if (step === "classification")
                void history.push("EntryClassification", () => ({
                  clientId,
                  fromReview: true,
                }));
              else if (step === "sources")
                void history.push("EntryMoneySources", () => ({
                  clientId,
                  fromReview: true,
                }));
              else
                void history.push("EntryDatesBooks", () => ({
                  clientId,
                  fromReview: true,
                }));
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
                toast.error("필수 항목을 확인해주세요.");
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
