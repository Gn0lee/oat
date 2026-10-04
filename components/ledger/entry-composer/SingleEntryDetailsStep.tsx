"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ComposerActionBar } from "./ComposerActionBar";
import { EntryFields } from "./EntryFields";

export function SingleEntryDetailsStep({
  onBack,
  onSave,
  isSaving,
}: {
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const form = useFormContext<LedgerComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const item = items[0];
  if (!item) return null;
  return (
    <section className="space-y-5 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">나머지 정보</h1>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{item.title || "내용 입력"}</p>
          <p className="text-sm text-muted-foreground">
            {item.amount ? formatCurrency(Number(item.amount)) : "금액 입력"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0"
          onClick={onBack}
        >
          내용·금액 수정
        </Button>
      </div>
      <EntryFields
        index={0}
        sections={["classification", "sources", "datesBooks", "memo"]}
        showType
      />
      <ComposerActionBar
        backLabel="이전"
        onBack={onBack}
        label={isSaving ? "저장 중..." : "저장"}
        onClick={onSave}
        disabled={isSaving}
      />
    </section>
  );
}
