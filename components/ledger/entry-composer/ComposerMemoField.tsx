"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ledgerFieldClassName } from "./field-styles";

export function ComposerMemoField({ index }: { index: number }) {
  const form = useFormContext<LedgerComposerValues>();
  const value =
    useWatch({ control: form.control, name: `items.${index}.memo` }) ?? "";
  return (
    <div className="space-y-2">
      <Label htmlFor={`entry-memo-${index + 1}`}>메모</Label>
      <Textarea
        id={`entry-memo-${index + 1}`}
        aria-label={`메모 ${index + 1}`}
        className={cn(ledgerFieldClassName, "min-h-20")}
        rows={3}
        maxLength={500}
        placeholder="추가로 남길 내용"
        value={value}
        onChange={(event) =>
          form.setValue(`items.${index}.memo`, event.target.value, {
            shouldDirty: true,
          })
        }
      />
    </div>
  );
}
