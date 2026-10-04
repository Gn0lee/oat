import { describe, expect, it } from "vitest";
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
