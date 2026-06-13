import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import type { LedgerRecordUpdateProposedChanges } from "@/schemas/record-change-request";

export interface LedgerRecordUpdateRequestFormValues {
  amount: number;
  title: string;
  categoryId: string | null;
  moneySourceId: string;
  transactedAt: string;
  memo: string | null;
}

function toIsoDateStart(value: string) {
  return value.includes("T") ? value : `${value}T00:00:00.000Z`;
}

function getOriginalMoneySourceId(entry: LedgerEntryWithDetails) {
  if (entry.type === "expense" || entry.type === "non_expense_withdrawal") {
    if (entry.fromPaymentMethodId) return `pm:${entry.fromPaymentMethodId}`;
    if (entry.fromAccountId) return `acc:${entry.fromAccountId}`;
  }

  if (entry.toPaymentMethodId) return `pm:${entry.toPaymentMethodId}`;
  if (entry.toAccountId) return `acc:${entry.toAccountId}`;

  return "none";
}

function applyMoneySourceChange(
  entry: LedgerEntryWithDetails,
  value: string,
  changes: LedgerRecordUpdateProposedChanges,
) {
  if (value === getOriginalMoneySourceId(entry)) return;

  const isPaymentMethod = value.startsWith("pm:");
  const isAccount = value.startsWith("acc:");
  const id = isPaymentMethod
    ? value.slice(3)
    : isAccount
      ? value.slice(4)
      : null;

  if (entry.type === "expense" || entry.type === "non_expense_withdrawal") {
    changes.fromPaymentMethodId = isPaymentMethod ? id : null;
    changes.fromAccountId = isAccount ? id : null;
    return;
  }

  changes.toPaymentMethodId = isPaymentMethod ? id : null;
  changes.toAccountId = isAccount ? id : null;
}

export function buildLedgerRecordUpdateProposedChanges(
  entry: LedgerEntryWithDetails,
  values: LedgerRecordUpdateRequestFormValues,
): LedgerRecordUpdateProposedChanges {
  const changes: LedgerRecordUpdateProposedChanges = {};
  const transactedAt = toIsoDateStart(values.transactedAt);
  const memo = values.memo || null;

  if (values.amount !== entry.amount) changes.amount = values.amount;
  if (values.title !== (entry.title ?? "")) changes.title = values.title;
  if (
    entry.type !== "non_expense_withdrawal" &&
    values.categoryId !== entry.categoryId
  ) {
    changes.categoryId = values.categoryId;
  }

  if (transactedAt !== entry.transactedAt) changes.transactedAt = transactedAt;
  if (memo !== entry.memo) changes.memo = memo;

  applyMoneySourceChange(entry, values.moneySourceId, changes);

  return changes;
}
