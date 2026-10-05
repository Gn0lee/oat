"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeComposerTypeChange } from "@/lib/ledger/composer";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ComposerMemoField } from "./ComposerMemoField";
import { EntryCategoryField } from "./EntryCategoryField";
import { EntryDateBookFields } from "./EntryDateBookFields";
import { EntryMoneySourceFields } from "./EntryMoneySourceFields";
import { ledgerFieldClassName } from "./field-styles";

type FieldSection = "classification" | "sources" | "datesBooks" | "memo";

export function EntryFields({
  index,
  sections,
  showType = false,
}: {
  index: number;
  sections: FieldSection[];
  showType?: boolean;
}) {
  const form = useFormContext<LedgerComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  if (!item) return null;

  return (
    <div className="space-y-5">
      {showType && (
        <div className="space-y-2">
          <Label>유형</Label>
          <Select
            value={item.type}
            onValueChange={(value) => {
              const current = form.getValues(`items.${index}`);
              form.setValue(
                `items.${index}`,
                normalizeComposerTypeChange(current, value as typeof item.type),
                { shouldDirty: true, shouldValidate: true },
              );
            }}
          >
            <SelectTrigger
              className={ledgerFieldClassName}
              aria-label={`기록 유형 ${index + 1}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">지출</SelectItem>
              <SelectItem value="income">수입</SelectItem>
              <SelectItem value="transfer">내부이체</SelectItem>
              <SelectItem value="non_expense_withdrawal">
                비지출 출금
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {sections.includes("classification") && (
        <EntryCategoryField index={index} />
      )}
      {sections.includes("sources") && <EntryMoneySourceFields index={index} />}
      {sections.includes("datesBooks") && <EntryDateBookFields index={index} />}
      {sections.includes("memo") && <ComposerMemoField index={index} />}
    </div>
  );
}
