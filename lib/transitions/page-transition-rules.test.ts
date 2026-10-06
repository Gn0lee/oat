import { describe, expect, it } from "vitest";
import {
  getPageTransitionMode,
  getPageTransitionRules,
  LEDGER_COMPOSER_STEP_PATHS,
  STOCK_TRADE_COMPOSER_STEP_PATHS,
} from "./page-transition-rules";

describe("page transition rules", () => {
  it("첫 렌더에서는 viewport와 무관하게 initial 모드를 사용한다", () => {
    expect(
      getPageTransitionMode({
        hasMounted: false,
        isDesktop: true,
        prefersReducedMotion: false,
      }),
    ).toBe("initial");

    expect(
      getPageTransitionMode({
        hasMounted: false,
        isDesktop: false,
        prefersReducedMotion: false,
      }),
    ).toBe("initial");
  });

  it("reduced motion 사용자는 reduced 모드를 사용한다", () => {
    expect(
      getPageTransitionMode({
        hasMounted: true,
        isDesktop: false,
        prefersReducedMotion: true,
      }),
    ).toBe("reduced");
  });

  it("composer steps use scoped ordered transitions", () => {
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "axis",
      paths: LEDGER_COMPOSER_STEP_PATHS,
      type: "x",
      variant: "snappy",
    });
    expect(LEDGER_COMPOSER_STEP_PATHS[0]).toContain("composer-basics");
    expect(LEDGER_COMPOSER_STEP_PATHS.at(-1)).toContain("composer-review");
    expect(getPageTransitionRules("reduced")).toContainEqual({
      kind: "fade",
      paths: LEDGER_COMPOSER_STEP_PATHS,
    });
  });

  it("stock trade composer steps use the same x-axis transition as the ledger composer", () => {
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "axis",
      paths: STOCK_TRADE_COMPOSER_STEP_PATHS,
      type: "x",
      variant: "snappy",
    });
    expect(STOCK_TRADE_COMPOSER_STEP_PATHS[0]).toContain("composer-basics");
    expect(STOCK_TRADE_COMPOSER_STEP_PATHS).toContain(
      "/assets/stock/transactions/new/daily/composer-single-details",
    );
    const mobile = getPageTransitionRules("mobile");
    const axisIndex = mobile.findIndex(
      (rule) =>
        rule.kind === "axis" && rule.paths === STOCK_TRADE_COMPOSER_STEP_PATHS,
    );
    const drillIndex = mobile.findIndex(
      (rule) =>
        rule.kind === "drill" && rule.enter === "/assets/stock/transactions/*",
    );
    expect(axisIndex).toBeLessThan(drillIndex);
    expect(getPageTransitionRules("reduced")).toContainEqual({
      kind: "fade",
      paths: STOCK_TRADE_COMPOSER_STEP_PATHS,
    });
  });

  it("mount 이후 viewport에 따라 mobile과 desktop 모드를 구분한다", () => {
    expect(
      getPageTransitionMode({
        hasMounted: true,
        isDesktop: false,
        prefersReducedMotion: false,
      }),
    ).toBe("mobile");

    expect(
      getPageTransitionMode({
        hasMounted: true,
        isDesktop: true,
        prefersReducedMotion: false,
      }),
    ).toBe("desktop");
  });

  it("mobile 모드는 parent to child 이동에 명시적인 drill 전환을 적용한다", () => {
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/ledger/*",
      exit: "/ledger",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/assets/*",
      exit: "/assets",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/assets/stock/*",
      exit: "/assets/stock",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/assets/stock/transactions/*",
      exit: "/assets/stock/transactions",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/assets/stock/analysis/*",
      exit: "/assets/stock/analysis",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/ledger/analysis/*",
      exit: "/ledger/analysis",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/ledger/records/*",
      exit: "/ledger/records",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/ledger/categories/*",
      exit: "/ledger/categories",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).toContainEqual({
      kind: "drill",
      enter: "/assets/stock/transactions/*",
      exit: "/assets/stock/records",
      type: "parallax",
    });
    expect(getPageTransitionRules("mobile")).not.toContainEqual({
      kind: "drill",
      enter: "*",
      exit: "*",
      type: "parallax",
    });
  });

  it("desktop 모드는 강한 화면 이동 대신 fade 전환만 사용한다", () => {
    const rules = getPageTransitionRules("desktop");

    expect(rules.every((rule) => rule.kind === "fade")).toBe(true);
    expect(rules).toContainEqual({
      kind: "fade",
      paths: ["/ledger", "/ledger/records/new/full"],
      speed: "fast",
    });
  });
});
