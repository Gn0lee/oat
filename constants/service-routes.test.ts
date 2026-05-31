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

  it("가계부 Entry Composer route를 task 화면으로 계산한다", () => {
    expect(getServiceRouteMeta("/ledger/records/new/full")).toMatchObject({
      label: "기록 추가",
      mobileVariant: "task",
      parentHref: "/ledger",
      closeHref: "/ledger",
    });

    expect(
      getServiceRouteMeta("/ledger/records/new/daily?date=2026-05-29"),
    ).toMatchObject({
      label: "하루 기록 추가",
      mobileVariant: "task",
      parentHref: "/ledger/records",
      closeHref: "/ledger/records",
    });
  });

  it("가계부 기록 조회 route는 선택 날짜 query를 보존한다", () => {
    expect(getServiceRouteMeta("/ledger/records")).toMatchObject({
      label: "기록 조회",
      preserveSearchParams: ["date"],
    });
  });

  it("주식 거래 Entry Composer route를 task 화면으로 계산한다", () => {
    expect(
      getServiceRouteMeta("/assets/stock/transactions/new/full"),
    ).toMatchObject({
      label: "거래 등록",
      mobileVariant: "task",
      parentHref: "/assets/stock/transactions",
      closeHref: "/assets/stock/transactions",
    });

    expect(
      getServiceRouteMeta(
        "/assets/stock/transactions/new/account?accountId=account-123",
      ),
    ).toMatchObject({
      label: "계좌 거래 등록",
      mobileVariant: "task",
      parentHref: "/assets/stock/transactions",
      closeHref: "/assets/stock/transactions",
    });

    expect(
      getServiceRouteMeta(
        "/assets/stock/transactions/new/daily?date=2026-05-29",
      ),
    ).toMatchObject({
      label: "하루 거래 등록",
      mobileVariant: "task",
      parentHref: "/assets/stock/records",
      closeHref: "/assets/stock/records",
    });
  });

  it("주식 일별 기록 route를 계산하고 선택 날짜 query를 보존한다", () => {
    expect(
      getServiceRouteMeta("/assets/stock/records?date=2026-05-29"),
    ).toMatchObject({
      label: "일별 기록",
      mobileVariant: "child",
      parentHref: "/assets/stock",
      preserveSearchParams: ["date"],
      breadcrumb: [
        { href: "/assets", label: "자산" },
        { href: "/assets/stock", label: "주식" },
        { href: "/assets/stock/records", label: "일별 기록" },
      ],
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

  it("path parameter 패턴 route를 매칭한다", () => {
    expect(getServiceRouteMeta("/assets/accounts/account-123")).toMatchObject({
      href: "/assets/accounts/[accountId]",
      pattern: "/assets/accounts/[accountId]",
      label: "계좌 상세",
      parentHref: "/assets/accounts",
    });
  });
});
