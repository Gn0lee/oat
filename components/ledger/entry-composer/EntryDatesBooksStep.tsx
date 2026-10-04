"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ComposerActionBar } from "./ComposerActionBar";
import { EntryFields } from "./EntryFields";

export function EntryDatesBooksStep({
  clientId,
  onBack,
  onNext,
}: {
  clientId?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const form = useFormContext<LedgerComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !clientId || item.clientId === clientId);
  return (
    <section className="space-y-5 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">날짜와 장부</h1>
      {visible.map(({ item, index }) => (
        <div key={item.clientId} className="space-y-3 border-b pb-5">
          <p className="text-sm text-muted-foreground">
            {item.title || "새 기록"}
          </p>
          <EntryFields index={index} sections={["datesBooks"]} />
        </div>
      ))}
      <ComposerActionBar
        backLabel="이전"
        onBack={onBack}
        label="확인"
        onClick={onNext}
      />
    </section>
  );
}
