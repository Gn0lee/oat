import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "./nav-items";

describe("NAV_ITEMS", () => {
  it("4개의 네비게이션 항목을 가진다", () => {
    expect(NAV_ITEMS).toHaveLength(4);
  });

  it("홈, 가계부, 자산, 설정 순서로 정의된다", () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual(["홈", "가계부", "자산", "설정"]);
  });

  it("각 항목이 올바른 경로를 가진다", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toEqual(["/home", "/ledger", "/assets", "/settings"]);
  });

  it("각 항목이 icon 컴포넌트를 가진다", () => {
    for (const item of NAV_ITEMS) {
      expect(item.icon).toBeDefined();
      expect(item.icon.$$typeof).toBeDefined();
    }
  });
});
