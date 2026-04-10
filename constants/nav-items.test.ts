import { describe, expect, it } from "vitest";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

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

describe("isNavItemActive", () => {
  const assetsItem = NAV_ITEMS.find((item) => item.href === "/assets")!;
  const settingsItem = NAV_ITEMS.find((item) => item.href === "/settings")!;
  const homeItem = NAV_ITEMS.find((item) => item.href === "/home")!;

  it("정확한 경로에서 활성 상태이다", () => {
    expect(isNavItemActive(assetsItem, "/assets")).toBe(true);
  });

  it("하위 경로에서 활성 상태이다", () => {
    expect(isNavItemActive(assetsItem, "/assets/stock/holdings")).toBe(true);
  });

  it("/home은 정확히 일치할 때만 활성이다", () => {
    expect(isNavItemActive(homeItem, "/home")).toBe(true);
    expect(isNavItemActive(homeItem, "/home/sub")).toBe(false);
  });

  it("/dashboard 경로에서 자산 항목이 활성이다", () => {
    expect(isNavItemActive(assetsItem, "/dashboard")).toBe(true);
    expect(isNavItemActive(assetsItem, "/dashboard/stocks")).toBe(true);
  });

  it("/household 경로에서 설정 항목이 활성이다", () => {
    expect(isNavItemActive(settingsItem, "/household")).toBe(true);
  });

  it("관련 없는 경로에서 비활성이다", () => {
    expect(isNavItemActive(assetsItem, "/home")).toBe(false);
    expect(isNavItemActive(settingsItem, "/ledger")).toBe(false);
  });
});
