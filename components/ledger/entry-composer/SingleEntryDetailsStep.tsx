"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { formatCurrency } from "@/lib/utils/format";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ComposerActionBar } from "./ComposerActionBar";
import { EntryFields } from "./EntryFields";

export function SingleEntryDetailsStep({
  onSave,
  isSaving,
}: {
  onSave: () => void;
  isSaving: boolean;
}) {
  const form = useFormContext<LedgerComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const item = items[0];
  if (!item) return null;
  return (
    <section className="space-y-5 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">상세 입력</h1>
      <div className="space-y-1 rounded-[12px] border border-border bg-card p-3 text-foreground">
        <div className="min-w-0">
          <p className="break-words font-medium">{item.title || "내용 입력"}</p>
          <p className="text-base text-foreground">
            {item.amount ? formatCurrency(Number(item.amount)) : "금액 입력"}
          </p>
        </div>
      </div>
      <EntryFields
        index={0}
        sections={["classification", "sources", "datesBooks", "memo"]}
        showType
      />
      <ComposerActionBar
        label={isSaving ? "저장 중..." : "저장"}
        onClick={onSave}
        disabled={isSaving}
      />
    </section>
  );
}
