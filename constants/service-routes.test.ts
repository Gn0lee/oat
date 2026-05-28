import { describe, expect, it } from "vitest";
import { getServiceRouteMeta } from "./service-routes";

describe("getServiceRouteMeta", () => {
  it("mobile top-level 화면을 구분한다", () => {
    expect(getServiceRouteMeta("/assets")).toMatchObject({
      label: "자산",
      mobileVariant: "topLevel",
      parentHref: undefined,
    });
  });

  it("child 화면의 parent와 breadcrumb를 계산한다", () => {
    expect(getServiceRouteMeta("/assets/stock/holdings")).toMatchObject({
      label: "보유 종목",
      mobileVariant: "child",
      parentHref: "/assets/stock",
      breadcrumb: [
        { href: "/assets", label: "자산" },
        { href: "/assets/stock", label: "주식" },
        { href: "/assets/stock/holdings", label: "보유 종목" },
      ],
    });
  });

  it("task 화면의 closeHref를 계산한다", () => {
    expect(getServiceRouteMeta("/ledger/payment-methods/new")).toMatchObject({
      label: "결제수단 추가",
      mobileVariant: "task",
      parentHref: "/ledger/payment-methods",
      closeHref: "/ledger/payment-methods",
    });
  });

  it("query string과 trailing slash를 무시한다", () => {
    expect(
      getServiceRouteMeta("/ledger/payment-methods/new?returnUrl=/ledger"),
    ).toMatchObject({ href: "/ledger/payment-methods/new" });

    expect(getServiceRouteMeta("/settings/mcp/")).toMatchObject({
      href: "/settings/mcp",
    });
  });
});
