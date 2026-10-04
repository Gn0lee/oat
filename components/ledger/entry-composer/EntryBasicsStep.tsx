"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createComposerDraft } from "@/lib/ledger/composer";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ComposerActionBar } from "./ComposerActionBar";

interface EntryBasicsStepProps {
  date: string;
  bookId: string;
  editingClientId?: string;
  onNext: () => void;
}

export function EntryBasicsStep({
  date,
  bookId,
  editingClientId,
  onNext,
}: EntryBasicsStepProps) {
  const form = useFormContext<LedgerComposerValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const visible = fields
    .map((field, index) => ({ field, index }))
    .filter(
      ({ index }) =>
        !editingClientId || items[index]?.clientId === editingClientId,
    );

  return (
    <section
      aria-labelledby="entry-basics-heading"
      className="flex min-h-full flex-col gap-5 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4"
    >
      <h1 id="entry-basics-heading" className="sr-only">
        기록 내용과 금액
      </h1>
      <div className="space-y-5">
        {visible.map(({ field, index }, order) => (
          <div
            key={field.id}
            className="relative space-y-3 border-b border-gray-100 pb-5"
          >
            {(() => {
              const titlePath = `items.${index}.title` as const;
              const amountPath = `items.${index}.amount` as const;
              const titleError = form.getFieldState(titlePath, form.formState)
                .error?.message;
              const amountError = form.getFieldState(amountPath, form.formState)
                .error?.message;
              return (
                <>
                  {visible.length > 1 && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {order + 1}번째 기록
                    </p>
                  )}
                  <div className="space-y-2">
                    <label
                      htmlFor={`entry-title-${field.id}`}
                      className="text-sm font-medium"
                    >
                      내용
                    </label>
                    <Input
                      id={`entry-title-${field.id}`}
                      aria-label={`내용 ${order + 1}`}
                      aria-invalid={Boolean(titleError)}
                      aria-describedby={
                        titleError ? `entry-title-error-${field.id}` : undefined
                      }
                      autoComplete="off"
                      placeholder="예: 점심, 커피"
                      value={items[index]?.title ?? ""}
                      onChange={(event) => {
                        form.setValue(titlePath, event.target.value, {
                          shouldDirty: true,
                        });
                        if (event.target.value.trim())
                          form.clearErrors(titlePath);
                      }}
                      className="h-12 text-base"
                    />
                    {titleError && (
                      <p
                        id={`entry-title-error-${field.id}`}
                        role="alert"
                        className="text-sm text-destructive"
                      >
                        {titleError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`entry-amount-${field.id}`}
                      className="text-sm font-medium"
                    >
                      금액 (원)
                    </label>
                    <Input
                      id={`entry-amount-${field.id}`}
                      aria-label={`금액 ${order + 1}`}
                      aria-invalid={Boolean(amountError)}
                      aria-describedby={
                        amountError
                          ? `entry-amount-error-${field.id}`
                          : undefined
                      }
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={items[index]?.amount ?? ""}
                      onChange={(event) => {
                        form.setValue(amountPath, event.target.value, {
                          shouldDirty: true,
                        });
                        if (Number(event.target.value) > 0)
                          form.clearErrors(amountPath);
                      }}
                      className="h-14 text-2xl font-semibold"
                    />
                    {amountError && (
                      <p
                        id={`entry-amount-error-${field.id}`}
                        role="alert"
                        className="text-sm text-destructive"
                      >
                        {amountError}
                      </p>
                    )}
                  </div>
                  {!editingClientId && fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`${order + 1}번째 기록 삭제`}
                      className="min-h-11"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      삭제
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
        ))}
      </div>
      {!editingClientId && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          onClick={() =>
            append(
              createComposerDraft({
                clientId: crypto.randomUUID(),
                bookId,
                date,
              }),
            )
          }
        >
          <Plus className="mr-2 size-4" />
          내역 추가
        </Button>
      )}
      <ComposerActionBar label="다음" onClick={onNext} />
    </section>
  );
}
