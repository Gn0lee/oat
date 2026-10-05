import { describe, expect, it } from "vitest";
import type { ComposerType } from "./composer";
import {
  createComposerDraft,
  getMissingComposerStep,
  normalizeComposerTypeChange,
  selectComposerReturnHref,
  toComposerPayload,
} from "./composer";

const category = { id: "cat", type: "expense" } as never;
const sharedBook = {
  id: "book-a",
  name: "생활비",
  visibility: "shared" as const,
  createdBy: null,
  isDefault: true,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
};

describe("ledger composer helpers", () => {
  it("creates per-entry draft values from entry context", () => {
    expect(
      createComposerDraft({
        clientId: "x",
        bookId: "book-a",
        date: "2026-06-05",
      }),
    ).toMatchObject({
      clientId: "x",
      type: "expense",
      bookId: "book-a",
      transactedAt: "2026-06-05",
    });
  });

  it("normalizes fields when type changes while preserving unrelated values", () => {
    const next = normalizeComposerTypeChange(
      {
        clientId: "x",
        type: "expense",
        bookId: "book-a",
        transactedAt: "2026-06-05",
        amount: "200",
        title: "coffee",
        categoryId: "cat",
        accountId: "a",
        memo: "memo",
      },
      "transfer",
    );
    expect(next).toMatchObject({
      type: "transfer",
      amount: "200",
      title: "coffee",
      bookId: "book-a",
      memo: "memo",
    });
    expect(next.categoryId).toBe("");
    expect(next.accountId).toBeUndefined();
  });

  it("keeps money sources that the new type can still use", () => {
    const base = {
      clientId: "x",
      bookId: "book-a",
      transactedAt: "2026-06-05",
      amount: "200",
      title: "coffee",
      memo: "",
      paymentMethodId: "pm",
      accountId: "acc",
      fromValue: "acc:from",
      toValue: "acc:to",
    };
    const pick = (from: ComposerType, to: ComposerType) => {
      const next = normalizeComposerTypeChange({ ...base, type: from }, to);
      return {
        paymentMethodId: next.paymentMethodId,
        accountId: next.accountId,
        fromValue: next.fromValue,
        toValue: next.toValue,
      };
    };
    const both = {
      paymentMethodId: "pm",
      accountId: "acc",
      fromValue: "",
      toValue: "",
    };
    expect(pick("income", "expense")).toEqual(both);
    expect(pick("expense", "non_expense_withdrawal")).toEqual(both);
    expect(pick("non_expense_withdrawal", "expense")).toEqual(both);
    expect(pick("expense", "income")).toEqual({
      paymentMethodId: undefined,
      accountId: "acc",
      fromValue: "",
      toValue: "",
    });
    expect(pick("expense", "transfer")).toEqual({
      paymentMethodId: undefined,
      accountId: undefined,
      fromValue: "acc:from",
      toValue: "acc:to",
    });
  });

  it("returns the item unchanged when the current type is selected again", () => {
    const item = {
      clientId: "x",
      type: "expense" as const,
      bookId: "book-a",
      transactedAt: "2026-06-05",
      amount: "200",
      title: "coffee",
      categoryId: "cat",
      accountId: "acc",
      memo: "",
    };
    expect(normalizeComposerTypeChange(item, "expense")).toBe(item);
  });

  it("routes a valid payload to selected books and derives visibility from the book", () => {
    const payload = toComposerPayload(
      {
        clientId: "x",
        type: "expense",
        bookId: "book-a",
        transactedAt: "2026-06-05",
        amount: "1200",
        title: "coffee",
        categoryId: "cat",
        paymentMethodId: "pm",
      },
      [sharedBook],
      [category],
    );
    expect(payload).toMatchObject({
      bookId: "book-a",
      type: "expense",
      transactedAt: "2026-06-05T00:00:00.000Z",
    });
    expect(payload).not.toHaveProperty("isShared");
    expect(payload).not.toHaveProperty("tags");
  });

  it("finds the first missing step for the active type", () => {
    expect(
      getMissingComposerStep({
        ...createComposerDraft({
          clientId: "x",
          bookId: "book-a",
          date: "2026-06-05",
        }),
        title: "x",
        amount: "10",
      }),
    ).toBe("classification");
  });

  it("chooses scope and latest KST date from saved payloads", () => {
    expect(
      selectComposerReturnHref({
        sourceBookId: "book-a",
        payloads: [
          { bookId: "book-b", transactedAt: "2026-06-05T15:00:00.000Z" },
          { bookId: "book-b", transactedAt: "2026-06-06T00:00:00.000Z" },
        ],
      }),
    ).toBe("/ledger/records?book=book-b&date=2026-06-06");
    expect(
      selectComposerReturnHref({
        sourceBookId: "book-a",
        payloads: [
          { bookId: "book-b", transactedAt: "2026-06-05T15:00:00.000Z" },
          { bookId: "book-c", transactedAt: "2026-06-06T00:00:00.000Z" },
        ],
      }),
    ).toBe("/ledger/records?date=2026-06-06");
  });
});
