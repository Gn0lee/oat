import { describe, expect, it } from "vitest";
import { queries } from "@/lib/queries/keys";

describe("ledgerEntries 쿼리 키", () => {
  it("list 쿼리 키가 정의되어 있다", () => {
    expect(queries.ledgerEntries.list().queryKey).toBeDefined();
    expect(Array.isArray(queries.ledgerEntries.list().queryKey)).toBe(true);
  });

  it("_def 키를 prefix로 포함한다", () => {
    const defKey = queries.ledgerEntries._def;
    const listKey = queries.ledgerEntries.list().queryKey;
    expect(listKey.length).toBeGreaterThanOrEqual(defKey.length);
    defKey.forEach((part, i) => {
      expect(listKey[i]).toEqual(part);
    });
  });

  it("summary 쿼리 키가 year/month를 포함한다", () => {
    const key = queries.ledgerEntries.summary(2026, 4).queryKey;
    expect(key).toBeDefined();
    expect(JSON.stringify(key)).toContain("2026");
    expect(JSON.stringify(key)).toContain("4");
  });
});

describe("categories 쿼리 키", () => {
  it("list 쿼리 키가 정의되어 있다", () => {
    expect(queries.categories.list().queryKey).toBeDefined();
    expect(Array.isArray(queries.categories.list().queryKey)).toBe(true);
  });

  it("type 파라미터가 쿼리 키에 반영된다", () => {
    const expenseKey = queries.categories.list("expense").queryKey;
    const incomeKey = queries.categories.list("income").queryKey;
    const allKey = queries.categories.list().queryKey;
    expect(JSON.stringify(expenseKey)).toContain("expense");
    expect(JSON.stringify(incomeKey)).toContain("income");
    expect(expenseKey).not.toEqual(incomeKey);
    expect(expenseKey).not.toEqual(allKey);
  });

  it("_def 키를 prefix로 포함한다", () => {
    const defKey = queries.categories._def;
    const listKey = queries.categories.list("expense").queryKey;
    expect(listKey.length).toBeGreaterThanOrEqual(defKey.length);
    defKey.forEach((part, i) => {
      expect(listKey[i]).toEqual(part);
    });
  });
});
