import { describe, expect, it } from "vitest";
import { ledgerComposerSchema } from "./ledger-composer";

const item = {
  clientId: "client-1",
  type: "expense" as const,
  bookId: "11111111-1111-4111-8111-111111111111",
  amount: "12000",
  title: "커피",
  categoryId: "category-1",
  paymentMethodId: "pm-1",
  transactedAt: "2026-06-05",
  memo: "",
};

describe("ledgerComposerSchema", () => {
  it("requires stable client and book IDs without legacy visibility or tags", () => {
    expect(ledgerComposerSchema.safeParse({ items: [item] }).success).toBe(
      true,
    );
    expect(
      ledgerComposerSchema.safeParse({
        items: [{ ...item, clientId: undefined }],
      }).success,
    ).toBe(false);
    expect(
      ledgerComposerSchema.safeParse({
        items: [{ ...item, bookId: undefined }],
      }).success,
    ).toBe(false);
    expect(
      ledgerComposerSchema.safeParse({
        items: [{ ...item, bookId: "bad" }],
      }).success,
    ).toBe(false);
  });

  it("requires type-specific fields while preserving memo and independent book/date", () => {
    expect(
      ledgerComposerSchema.safeParse({
        items: [
          item,
          {
            ...item,
            clientId: "client-2",
            bookId: "22222222-2222-4222-8222-222222222222",
            transactedAt: "2026-06-06",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      ledgerComposerSchema.safeParse({
        items: [{ ...item, categoryId: "" }],
      }).success,
    ).toBe(false);
  });
});
