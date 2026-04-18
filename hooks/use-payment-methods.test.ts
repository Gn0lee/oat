import { describe, expect, it } from "vitest";
import { queries } from "@/lib/queries/keys";

describe("paymentMethods 쿼리 키", () => {
  it("paymentMethods list 쿼리 키가 정의되어 있다", () => {
    expect(queries.paymentMethods.list.queryKey).toBeDefined();
    expect(Array.isArray(queries.paymentMethods.list.queryKey)).toBe(true);
  });

  it("paymentMethods _def 키가 정의되어 있다", () => {
    expect(queries.paymentMethods._def).toBeDefined();
    expect(Array.isArray(queries.paymentMethods._def)).toBe(true);
  });

  it("paymentMethods list 쿼리 키가 _def 키를 prefix로 포함한다", () => {
    const defKey = queries.paymentMethods._def;
    const listKey = queries.paymentMethods.list.queryKey;
    expect(listKey.length).toBeGreaterThanOrEqual(defKey.length);
    defKey.forEach((part, i) => {
      expect(listKey[i]).toEqual(part);
    });
  });
});
