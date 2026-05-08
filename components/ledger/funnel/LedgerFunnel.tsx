"use client";

import { useFunnel } from "@use-funnel/browser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useCreateBatchLedgerEntries,
  useCreateLedgerEntry,
} from "@/hooks/use-ledger-entries";
import type {
  LedgerItemFormData,
  TransferItemFormData,
} from "@/lib/api/ledger";
import {
  buildLedgerEntryPayload,
  buildTransferLedgerEntryPayload,
} from "@/lib/api/ledger";
import { AddItemsStep } from "./AddItemsStep";
import { AddTransferStep } from "./AddTransferStep";
import { ConfirmStep } from "./ConfirmStep";
import { SelectPrivacyStep } from "./SelectPrivacyStep";
import { SelectTypeStep } from "./SelectTypeStep";

type LedgerFunnelContext = {
  SelectPrivacy: Record<string, never>;
  SelectType: {
    isShared: boolean;
  };
  AddItems: {
    type: "expense" | "income";
    isShared: boolean;
  };
  AddTransfer: {
    isShared: boolean;
  };
  Confirm: {
    type: "expense" | "income" | "transfer";
    isShared: boolean;
    items?: LedgerItemFormData[];
    transferItem?: TransferItemFormData;
  };
};

export function LedgerFunnel() {
  const router = useRouter();
  const createBatch = useCreateBatchLedgerEntries();
  const createSingle = useCreateLedgerEntry();

  const funnel = useFunnel<LedgerFunnelContext>({
    id: "ledger-funnel",
    initial: {
      step: "SelectPrivacy",
      context: {},
    },
  });

  const handleSubmit = async (context: LedgerFunnelContext["Confirm"]) => {
    try {
      if (context.type === "transfer") {
        if (!context.transferItem) return;
        await createSingle.mutateAsync(
          buildTransferLedgerEntryPayload(
            context.isShared,
            context.transferItem,
          ),
        );
        toast.success("1건의 내역이 저장되었습니다.");
      } else {
        const entryType = context.type;
        const entries = (context.items ?? []).map((item) =>
          buildLedgerEntryPayload(entryType, context.isShared, item),
        );
        const result = await createBatch.mutateAsync(entries);
        toast.success(`${result.count}건의 내역이 저장되었습니다.`);
      }
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
      SelectPrivacy={({ history }) => (
        <SelectPrivacyStep
          onNext={(isShared) => {
            history.push("SelectType", () => ({ isShared }));
          }}
          onBack={() => router.push("/ledger")}
        />
      )}
      SelectType={({ history }) => (
        <SelectTypeStep
          onSelect={(type) => {
            if (type === "transfer") {
              history.push("AddTransfer", (prev) => ({
                isShared: prev.isShared,
              }));
            } else {
              history.push("AddItems", (prev) => ({ ...prev, type }));
            }
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
      AddTransfer={({ history }) => (
        <AddTransferStep
          onNext={(transferItem) => {
            history.push("Confirm", (prev) => ({
              ...prev,
              type: "transfer",
              transferItem,
            }));
          }}
          onBack={() => history.back()}
        />
      )}
      Confirm={({ context, history }) => (
        <ConfirmStep
          type={context.type}
          isShared={context.isShared}
          items={context.items}
          transferItem={context.transferItem}
          onSubmit={() => handleSubmit(context)}
          onBack={() => history.back()}
          isSubmitting={createBatch.isPending || createSingle.isPending}
        />
      )}
    />
  );
}
