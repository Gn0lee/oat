import { describe, expect, it } from "vitest";
import {
  getPageTransitionMode,
  getPageTransitionRules,
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
