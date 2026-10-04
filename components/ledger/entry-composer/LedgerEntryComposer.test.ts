import { describe, expect, it } from "vitest";
import {
  createComposerDraft,
  getMissingComposerStep,
  normalizeComposerTypeChange,
} from "@/lib/ledger/composer";
import { ledgerComposerSchema } from "@/schemas/ledger-composer";

const draft = createComposerDraft({
  clientId: "draft-1",
  bookId: "00000000-0000-4000-8000-000000000001",
  date: "2026-06-05",
});

describe("ledger composer draft", () => {
  it("requires category and sources by record type", () => {
    expect(
      getMissingComposerStep({ ...draft, title: "Lunch", amount: "12000" }),
    ).toBe("classification");
    expect(
      getMissingComposerStep({
        ...draft,
        type: "transfer",
        title: "Move",
        amount: "50000",
        fromValue: "acc:a",
        toValue: "acc:a",
      }),
    ).toBe("sources");
  });

  it("keeps unrelated values while clearing type-specific choices", () => {
    expect(
      normalizeComposerTypeChange(
        { ...draft, memo: "keep", categoryId: "cat-a" },
        "income",
      ),
    ).toMatchObject({ memo: "keep", categoryId: "", type: "income" });
  });

  it("parses a valid book-bound expense and rejects an invalid amount", () => {
    const valid = {
      ...draft,
      title: "Lunch",
      amount: "12000",
      categoryId: "cat-a",
    };
    expect(ledgerComposerSchema.safeParse({ items: [valid] }).success).toBe(
      true,
    );
    expect(
      ledgerComposerSchema.safeParse({ items: [{ ...valid, amount: "0" }] })
        .success,
    ).toBe(false);
  });
});
