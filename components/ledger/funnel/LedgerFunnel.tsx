"use client";

import { useFunnel } from "@use-funnel/browser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateBatchLedgerEntries } from "@/hooks/use-ledger-entries";
import type { LedgerItemFormData } from "@/lib/api/ledger";
import { buildLedgerEntryPayload } from "@/lib/api/ledger";
import { AddItemsStep } from "./AddItemsStep";
import { ConfirmStep } from "./ConfirmStep";
import { SelectPrivacyStep } from "./SelectPrivacyStep";
import { SelectTypeStep } from "./SelectTypeStep";

type LedgerFunnelContext = {
  SelectType: Record<string, never>;
  SelectPrivacy: {
    type: "expense" | "income";
  };
  AddItems: {
    type: "expense" | "income";
    isShared: boolean;
  };
  Confirm: {
    type: "expense" | "income";
    isShared: boolean;
    items: LedgerItemFormData[];
  };
};

export function LedgerFunnel() {
  const router = useRouter();
  const createBatch = useCreateBatchLedgerEntries();

  const funnel = useFunnel<LedgerFunnelContext>({
    id: "ledger-funnel",
    initial: {
      step: "SelectType",
      context: {},
    },
  });

  const handleSubmit = async (context: LedgerFunnelContext["Confirm"]) => {
    const entries = context.items.map((item) =>
      buildLedgerEntryPayload(context.type, context.isShared, item),
    );

    try {
      const result = await createBatch.mutateAsync(entries);
      toast.success(`${result.count}건의 내역이 저장되었습니다.`);
      router.push("/ledger");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("저장에 실패했습니다.");
      }
    }
  };

  return (
    <funnel.Render
      SelectType={({ history }) => (
        <SelectTypeStep
          onSelect={(type) => {
            if (type === "income") {
              // 수입은 공개 범위 선택 skip → 항상 공용
              history.push("AddItems", () => ({ type, isShared: true }));
            } else {
              history.push("SelectPrivacy", () => ({ type }));
            }
          }}
        />
      )}
      SelectPrivacy={({ history }) => (
        <SelectPrivacyStep
          onNext={(isShared) => {
            history.push("AddItems", (prev) => ({ ...prev, isShared }));
          }}
          onBack={() => history.back()}
        />
      )}
      AddItems={({ context, history }) => (
        <AddItemsStep
          type={context.type}
          onNext={(items) => {
            history.push("Confirm", (prev) => ({ ...prev, items }));
          }}
          onBack={() => history.back()}
        />
      )}
      Confirm={({ context, history }) => (
        <ConfirmStep
          type={context.type}
          isShared={context.isShared}
          items={context.items}
          onSubmit={() => handleSubmit(context)}
          onBack={() => history.back()}
          isSubmitting={createBatch.isPending}
        />
      )}
    />
  );
}
