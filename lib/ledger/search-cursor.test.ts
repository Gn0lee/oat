import { describe, expect, it } from "vitest";
import {
  decodeLedgerSearchCursor,
  encodeLedgerSearchCursor,
} from "./search-cursor";

const position = {
  transactedAt: "2026-10-03T01:00:00.123456+00:00",
  createdAt: "2026-10-03T01:00:00+00:00",
  id: "6f1c2a6e-5f7e-4d7c-9a51-2f7c2e0d9b11",
};
const bookId = "0a6b9d64-3a4c-4f61-8d45-3fd3c40d2b0e";

describe("ledger search cursor", () => {
  it("검색어와 장부 범위가 같으면 위치를 그대로 복원한다", () => {
    const cursor = encodeLedgerSearchCursor(position, {
      query: "커피",
      bookId,
    });
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeLedgerSearchCursor(cursor, { query: "커피", bookId })).toEqual(
      position,
    );
  });

  it("전체 범위 커서도 복원한다", () => {
    const cursor = encodeLedgerSearchCursor(position, { query: "커피" });
    expect(decodeLedgerSearchCursor(cursor, { query: "커피" })).toEqual(
      position,
    );
  });

  it.each([
    ["다른 검색어", { query: "점심", bookId }],
    ["다른 장부", { query: "커피", bookId: undefined }],
  ])("%s의 커서는 거절한다", (_label, scope) => {
    const cursor = encodeLedgerSearchCursor(position, {
      query: "커피",
      bookId,
    });
    expect(() => decodeLedgerSearchCursor(cursor, scope)).toThrow(
      expect.objectContaining({
        code: "LEDGER_SEARCH_CURSOR_INVALID",
        statusCode: 400,
      }),
    );
  });

  it.each([
    "not-base64!",
    Buffer.from("{}").toString("base64url"),
    Buffer.from(
      JSON.stringify({ v: 1, t: "x", c: "y", id: "z", q: "커피", b: null }),
    ).toString("base64url"),
  ])("깨진 커서 %s 는 거절한다", (cursor) => {
    expect(() => decodeLedgerSearchCursor(cursor, { query: "커피" })).toThrow(
      expect.objectContaining({ code: "LEDGER_SEARCH_CURSOR_INVALID" }),
    );
  });
});
