"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";
import { ComposerActionBar } from "./ComposerActionBar";
import { EntryFields } from "./EntryFields";

export function EntryMoneySourcesStep({
  clientId,
  onNext,
}: {
  clientId?: string;
  onNext: () => void;
}) {
  const form = useFormContext<LedgerComposerValues>();
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !clientId || item.clientId === clientId);
  return (
    <section className="space-y-5 px-4 pb-28 pt-4">
      <h1 className="text-lg font-semibold">금융수단</h1>
      {visible.map(({ item, index }) => (
        <div key={item.clientId} className="space-y-3 border-b pb-5">
          <p className="text-sm text-muted-foreground">
            {item.title || "새 기록"}
          </p>
          <EntryFields index={index} sections={["sources"]} />
        </div>
      ))}
      <ComposerActionBar label="다음" onClick={onNext} />
    </section>
  );
}
