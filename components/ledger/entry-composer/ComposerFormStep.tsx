"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMissingComposerStep,
  normalizeComposerTypeChange,
} from "@/lib/ledger/composer";
import type {
  LedgerComposerItem,
  LedgerComposerValues,
} from "@/schemas/ledger-composer";
import { EntryFields } from "./EntryFields";

interface ComposerFormStepProps {
  clientId: string;
  onBack: () => void;
}

export function ComposerFormStep({ clientId, onBack }: ComposerFormStepProps) {
  const form = useFormContext<LedgerComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const index = items.findIndex((item) => item.clientId === clientId);
  const item = index >= 0 ? items[index] : undefined;
  const [snapshot] = useState<LedgerComposerItem | undefined>(() =>
    item ? structuredClone(item) : undefined,
  );

  useEffect(() => {
    if (index < 0) onBack();
  }, [index, onBack]);

  if (!item || index < 0) return null;
  const cancel = () => {
    if (snapshot)
      form.setValue(`items.${index}`, snapshot, { shouldDirty: true });
    onBack();
  };
  const confirm = () => {
    const missing = getMissingComposerStep(item);
    if (missing) {
      toast.error(
        missing === "basics"
          ? "내용과 금액을 입력해주세요."
          : "필수 항목을 확인해주세요.",
      );
      return;
    }
    onBack();
  };
  const changeType = (type: LedgerComposerItem["type"]) => {
    form.setValue(`items.${index}`, normalizeComposerTypeChange(item, type), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="max-h-[85dvh] overflow-y-auto p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">기록 수정</h2>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={cancel}
        >
          취소
        </Button>
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>유형</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                "expense",
                "income",
                "transfer",
                "non_expense_withdrawal",
              ] as const
            ).map((type) => (
              <Button
                key={type}
                type="button"
                variant={item.type === type ? "default" : "outline"}
                className="min-h-11"
                onClick={() => changeType(type)}
              >
                {type === "expense"
                  ? "지출"
                  : type === "income"
                    ? "수입"
                    : type === "transfer"
                      ? "이체"
                      : "비지출 출금"}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`desktop-title-${clientId}`}>내용</Label>
          <Input
            id={`desktop-title-${clientId}`}
            value={item.title}
            onChange={(event) =>
              form.setValue(`items.${index}.title`, event.target.value, {
                shouldDirty: true,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`desktop-amount-${clientId}`}>금액 (원)</Label>
          <Input
            id={`desktop-amount-${clientId}`}
            type="number"
            inputMode="numeric"
            value={item.amount}
            onChange={(event) =>
              form.setValue(`items.${index}.amount`, event.target.value, {
                shouldDirty: true,
              })
            }
          />
        </div>
        <EntryFields
          index={index}
          sections={["classification", "sources", "datesBooks", "memo"]}
        />
        <Button type="button" className="min-h-12 w-full" onClick={confirm}>
          완료
        </Button>
      </div>
    </div>
  );
}
