import { describe, expect, it } from "vitest";
import {
  isLedgerRecordDate,
  isLedgerRecordMonth,
  ledgerMonthAnchorDate,
  ledgerScopeHref,
  safeLedgerReturnTo,
} from "./navigation";

describe("ledger return navigation", () => {
  it("preserves only a ledger destination and its query", () => {
    expect(safeLedgerReturnTo("/ledger/records?book=a&date=2026-10-01")).toBe(
      "/ledger/records?book=a&date=2026-10-01",
    );
    expect(safeLedgerReturnTo("/ledger/search?q=%EC%97%AC%ED%96%89")).toBe(
      "/ledger/search?q=%EC%97%AC%ED%96%89",
    );
  });
  it.each([
    "https://example.com",
    "//example.com",
    "/ledger\\example.com",
    "/ledger/../assets",
    "/ledger%2F..%2Fassets",
    "/ledger-evil",
    "/ledger/records\n",
  ])("rejects unsafe destination %s", (value) => {
    expect(safeLedgerReturnTo(value)).toBe("/ledger");
  });
});

describe("isLedgerRecordDate", () => {
  it.each([
    ["2026-06-16", true],
    ["2026-02-29", false],
    ["2026-02-31", false],
    ["2026-6-16", false],
    [null, false],
  ])("%s → %s", (value, expected) => {
    expect(isLedgerRecordDate(value)).toBe(expected);
  });
});

describe("isLedgerRecordMonth", () => {
  it.each([
    ["2026-06", true],
    ["2026-12", true],
    ["2026-13", false],
    ["2026-00", false],
    ["2026-6", false],
    ["2026-06-16", false],
    [null, false],
  ])("%s → %s", (value, expected) => {
    expect(isLedgerRecordMonth(value)).toBe(expected);
  });
});

describe("ledgerMonthAnchorDate", () => {
  it("지난 달과 다음 달은 그 달의 마지막 날을 고른다", () => {
    expect(ledgerMonthAnchorDate(2026, 5, "2026-10-05")).toBe("2026-05-31");
    expect(ledgerMonthAnchorDate(2026, 2, "2026-10-05")).toBe("2026-02-28");
    expect(ledgerMonthAnchorDate(2026, 11, "2026-10-05")).toBe("2026-11-30");
  });

  it("이번 달은 오늘을 고른다", () => {
    expect(ledgerMonthAnchorDate(2026, 10, "2026-10-05")).toBe("2026-10-05");
  });

  it("연도를 넘는 달 번호를 정규화한다", () => {
    expect(ledgerMonthAnchorDate(2026, 0, "2026-10-05")).toBe("2025-12-31");
    expect(ledgerMonthAnchorDate(2026, 13, "2026-10-05")).toBe("2027-01-31");
  });
});

describe("ledgerScopeHref", () => {
  it("다른 조회 화면으로 갈 때 장부만 넘긴다", () => {
    expect(ledgerScopeHref("/ledger/search", undefined)).toBe("/ledger/search");
    expect(ledgerScopeHref("/ledger/analysis", "book-1")).toBe(
      "/ledger/analysis?book=book-1",
    );
    expect(ledgerScopeHref("/ledger/search", "a&b", { q: "커피" })).toBe(
      "/ledger/search?q=%EC%BB%A4%ED%94%BC&book=a%26b",
    );
  });
});
