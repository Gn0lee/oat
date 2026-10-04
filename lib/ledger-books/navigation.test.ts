import { describe, expect, it } from "vitest";
import { safeLedgerReturnTo } from "./navigation";

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
