"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  ComposerEditForm,
  useComposerItemSnapshot,
} from "@/components/composer/ComposerEditDialog";
import { composerFieldClassName } from "@/components/composer/field-styles";
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
  const restoreSnapshot = useComposerItemSnapshot({
    item,
    index,
    restore: (snapshot) =>
      form.setValue(`items.${index}`, snapshot, { shouldDirty: true }),
    onMissing: onBack,
  });

  if (!item || index < 0) return null;
  const cancel = () => {
    restoreSnapshot();
    onBack();
  };
  const confirm = () => {
    const missing = getMissingComposerStep(item);
    if (missing) {
      toast.error(
        missing === "basics"
          ? "내용과 금액을 입력해 주세요."
          : "필수 항목을 확인해 주세요.",
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
    <ComposerEditForm
      title="기록 수정"
      description="기록의 유형과 내용을 수정합니다."
      onCancel={cancel}
      onConfirm={confirm}
    >
      <div className="space-y-2">
        <Label>유형</Label>
        <div className="grid grid-cols-2 gap-2">
          {(
            ["expense", "income", "transfer", "non_expense_withdrawal"] as const
          ).map((type) => (
            <Button
              key={type}
              type="button"
              variant={item.type === type ? "default" : "outline"}
              className="min-h-11 rounded-[12px]"
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
          className={composerFieldClassName}
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
          className={composerFieldClassName}
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
    </ComposerEditForm>
  );
}
