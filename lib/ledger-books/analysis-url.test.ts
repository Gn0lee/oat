import { describe, expect, it } from "vitest";
import {
  ledgerAnalysisHref,
  readLedgerAnalysisState,
  withLedgerAnalysisState,
} from "./analysis-url";

const BOOK = "00000000-0000-4000-8000-000000000001";
const TODAY = "2026-10-05";

describe("readLedgerAnalysisState", () => {
  it("reads book, period and type from the URL", () => {
    expect(
      readLedgerAnalysisState(
        new URLSearchParams(`book=${BOOK}&year=2026&month=4&type=income`),
        TODAY,
      ),
    ).toEqual({ bookId: BOOK, year: 2026, month: 4, type: "income" });
  });

  it("falls back to the current KST month and expense for missing or invalid values", () => {
    expect(
      readLedgerAnalysisState(
        new URLSearchParams("year=abc&month=13&type=other"),
        TODAY,
      ),
    ).toEqual({ bookId: undefined, year: 2026, month: 10, type: "expense" });
  });
});

describe("ledgerAnalysisHref", () => {
  it("carries the book and period to another analysis screen", () => {
    expect(
      ledgerAnalysisHref("/ledger/analysis/daily", {
        bookId: BOOK,
        year: 2026,
        month: 4,
        type: "income",
      }),
    ).toBe(`/ledger/analysis/daily?book=${BOOK}&year=2026&month=4`);
  });

  it("omits the book for the all-books scope", () => {
    expect(
      ledgerAnalysisHref("/ledger/analysis", {
        year: 2026,
        month: 10,
        type: "expense",
      }),
    ).toBe("/ledger/analysis?year=2026&month=10");
  });
});

describe("withLedgerAnalysisState", () => {
  it("changes one condition and keeps every other URL parameter", () => {
    const next = withLedgerAnalysisState(
      new URLSearchParams(`book=${BOOK}&year=2026&month=4&type=income`),
      { year: 2026, month: 5 },
    );
    expect(next.toString()).toBe(`book=${BOOK}&year=2026&month=5&type=income`);
  });

  it("switching to all books removes the book and the legacy scope", () => {
    const next = withLedgerAnalysisState(
      new URLSearchParams(`book=${BOOK}&scope=shared&year=2026&month=4`),
      { bookId: undefined },
    );
    expect(next.toString()).toBe("year=2026&month=4");
  });
});
