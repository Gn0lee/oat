import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseLedgerStatsMonth,
  parseLedgerStatsScope,
} from "./ledger-stats-query";

const BOOK = "00000000-0000-4000-8000-000000000001";

function params(query: string) {
  return new URLSearchParams(query);
}

describe("parseLedgerStatsMonth", () => {
  afterEach(() => vi.useRealTimers());

  it("defaults to the current KST month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T15:30:00.000Z")); // 11/1 00:30 KST
    expect(parseLedgerStatsMonth(params(""))).toEqual({
      year: 2026,
      month: 11,
    });
  });

  it.each(["year=abc&month=1", "year=2026&month=13", "year=2026&month=0"])(
    "rejects an invalid period (%s) with VALIDATION_ERROR",
    (query) => {
      expect(() => parseLedgerStatsMonth(params(query))).toThrow(
        expect.objectContaining({ code: "VALIDATION_ERROR", statusCode: 400 }),
      );
    },
  );
});

describe("parseLedgerStatsScope", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is the all-books scope without parameters", () => {
    expect(parseLedgerStatsScope(params(""), "summary")).toEqual({});
  });

  it("passes a book ID through", () => {
    expect(parseLedgerStatsScope(params(`book=${BOOK}`), "summary")).toEqual({
      bookId: BOOK,
    });
  });

  it("rejects a malformed book ID", () => {
    expect(() =>
      parseLedgerStatsScope(params("book=not-a-uuid"), "summary"),
    ).toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }));
  });

  it("maps a legacy scope to a visibility subset and records the legacy request", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseLedgerStatsScope(params("scope=personal"), "daily")).toEqual({
      visibility: "personal",
    });
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toEqual({
      event: "legacy-ledger-contract",
      contract: "stats-scope",
      route: "daily",
    });
  });

  it("ignores scope=all without logging and lets a book win over a legacy scope", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseLedgerStatsScope(params("scope=all"), "summary")).toEqual({});
    expect(
      parseLedgerStatsScope(params(`book=${BOOK}&scope=shared`), "summary"),
    ).toEqual({ bookId: BOOK });
    expect(warn).not.toHaveBeenCalled();
  });

  it("rejects an unknown scope", () => {
    expect(() =>
      parseLedgerStatsScope(params("scope=everyone"), "summary"),
    ).toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }));
  });
});
