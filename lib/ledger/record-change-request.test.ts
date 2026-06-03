import { describe, expect, it } from "vitest";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { buildLedgerRecordUpdateProposedChanges } from "./record-change-request";

const entry: LedgerEntryWithDetails = {
  id: "entry-1",
  householdId: "household-1",
  ownerId: "owner-1",
  ownerName: "소유자",
  type: "expense",
  amount: 12000,
  title: "점심",
  categoryId: "category-1",
  categoryName: "식비",
  categoryIcon: "Utensils",
  fromAccountId: null,
  fromAccountName: null,
  fromPaymentMethodId: "payment-1",
  fromPaymentMethodName: "현대카드",
  toAccountId: null,
  toAccountName: null,
  toPaymentMethodId: null,
  toPaymentMethodName: null,
  isShared: true,
  memo: "김밥",
  transactedAt: "2026-06-02T00:00:00.000Z",
  createdAt: "2026-06-02T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
};

describe("buildLedgerRecordUpdateProposedChanges", () => {
  it("원본과 달라진 필드만 반환한다", () => {
    const result = buildLedgerRecordUpdateProposedChanges(entry, {
      amount: 10000,
      title: "팀 점심",
      categoryId: "category-1",
      moneySourceId: "pm:payment-1",
      transactedAt: "2026-06-02",
      memo: "김밥",
    });

    expect(result).toEqual({
      amount: 10000,
      title: "팀 점심",
    });
  });

  it("결제수단 변경을 fromPaymentMethodId로 반환한다", () => {
    const result = buildLedgerRecordUpdateProposedChanges(entry, {
      amount: 12000,
      title: "점심",
      categoryId: "category-1",
      moneySourceId: "pm:payment-2",
      transactedAt: "2026-06-02",
      memo: "김밥",
    });

    expect(result).toEqual({
      fromAccountId: null,
      fromPaymentMethodId: "payment-2",
    });
  });
});
