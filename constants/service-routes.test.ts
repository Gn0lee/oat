import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMcpEnabled } from "@/lib/mcp/feature-flags";
import {
  getServiceRouteMeta,
  resolveServiceParentHref,
} from "./service-routes";

describe("getServiceRouteMeta", () => {
  it("mobile top-level 화면을 구분한다", () => {
    expect(getServiceRouteMeta("/assets", { mcpEnabled: true })).toMatchObject({
      label: "자산",
      mobileVariant: "topLevel",
      parentHref: undefined,
    });
  });

  it("child 화면의 parent와 breadcrumb를 계산한다", () => {
    expect(
      getServiceRouteMeta("/assets/stock/holdings", { mcpEnabled: true }),
    ).toMatchObject({
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
    expect(
      getServiceRouteMeta("/ledger/payment-methods/new", { mcpEnabled: true }),
    ).toMatchObject({
      label: "결제수단 추가",
      mobileVariant: "task",
      parentHref: "/ledger/payment-methods",
      closeHref: "/ledger/payment-methods",
    });
  });

  it("가계부 Entry Composer route를 task 화면으로 계산한다", () => {
    expect(
      getServiceRouteMeta("/ledger/records/new/full", { mcpEnabled: true }),
    ).toMatchObject({
      label: "기록 추가",
      mobileVariant: "task",
      parentHref: "/ledger",
      closeHref: "/ledger",
    });

    expect(
      getServiceRouteMeta("/ledger/records/new/daily?date=2026-05-29", {
        mcpEnabled: true,
      }),
    ).toMatchObject({
      label: "하루 기록 추가",
      mobileVariant: "task",
      parentHref: "/ledger/records",
      closeHref: "/ledger/records",
    });
  });

  it("가계부 기록 조회 route는 선택 날짜 query를 보존한다", () => {
    expect(
      getServiceRouteMeta("/ledger/records", { mcpEnabled: true }),
    ).toMatchObject({
      label: "기록 조회",
      preserveSearchParams: ["date"],
    });
  });

  it("주식 거래 Entry Composer route를 task 화면으로 계산한다", () => {
    expect(
      getServiceRouteMeta("/assets/stock/transactions/new/full", {
        mcpEnabled: true,
      }),
    ).toMatchObject({
      label: "거래 등록",
      mobileVariant: "task",
      parentHref: "/assets/stock/transactions",
      closeHref: "/assets/stock/transactions",
    });

    expect(
      getServiceRouteMeta(
        "/assets/stock/transactions/new/account?accountId=account-123",
        { mcpEnabled: true },
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
        { mcpEnabled: true },
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
      getServiceRouteMeta("/assets/stock/records?date=2026-05-29", {
        mcpEnabled: true,
      }),
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

  it("주식 분석 hub와 하위 분석 route를 계산한다", () => {
    expect(
      getServiceRouteMeta("/assets/stock/analysis", { mcpEnabled: true }),
    ).toMatchObject({
      label: "주식 분석",
      mobileVariant: "child",
      parentHref: "/assets/stock",
      breadcrumb: [
        { href: "/assets", label: "자산" },
        { href: "/assets/stock", label: "주식" },
        { href: "/assets/stock/analysis", label: "주식 분석" },
      ],
    });

    expect(
      getServiceRouteMeta("/assets/stock/analysis/overview", {
        mcpEnabled: true,
      }),
    ).toMatchObject({
      label: "종합 분석",
      parentHref: "/assets/stock/analysis",
      breadcrumb: [
        { href: "/assets", label: "자산" },
        { href: "/assets/stock", label: "주식" },
        { href: "/assets/stock/analysis", label: "주식 분석" },
        { href: "/assets/stock/analysis/overview", label: "종합 분석" },
      ],
    });

    expect(
      getServiceRouteMeta("/assets/stock/analysis/by-owner", {
        mcpEnabled: true,
      }),
    ).toMatchObject({
      label: "소유자별",
      parentHref: "/assets/stock/analysis",
    });

    expect(
      getServiceRouteMeta("/assets/stock/analysis/by-risk", {
        mcpEnabled: true,
      }),
    ).toMatchObject({
      label: "위험도별",
      parentHref: "/assets/stock/analysis",
    });
  });

  it("일몰된 전체 자산 분석 route는 metadata를 제공하지 않는다", () => {
    expect(
      getServiceRouteMeta("/assets/analysis", { mcpEnabled: true }),
    ).toBeNull();
    expect(
      getServiceRouteMeta("/assets/analysis/by-owner", { mcpEnabled: true }),
    ).toBeNull();
  });

  it("query string과 trailing slash를 무시한다", () => {
    expect(
      getServiceRouteMeta("/ledger/payment-methods/new?returnUrl=/ledger", {
        mcpEnabled: true,
      }),
    ).toMatchObject({ href: "/ledger/payment-methods/new" });

    expect(
      getServiceRouteMeta("/settings/mcp/", { mcpEnabled: true }),
    ).toMatchObject({
      href: "/settings/mcp",
    });
  });

  it("MCP가 비활성화된 경우 /settings/mcp는 null을 반환한다", () => {
    expect(
      getServiceRouteMeta("/settings/mcp/", { mcpEnabled: false }),
    ).toBeNull();
  });

  it("path parameter 패턴 route를 매칭한다", () => {
    expect(
      getServiceRouteMeta("/assets/accounts/account-123", { mcpEnabled: true }),
    ).toMatchObject({
      href: "/assets/accounts/[accountId]",
      pattern: "/assets/accounts/[accountId]",
      label: "계좌 상세",
      parentHref: "/assets/accounts",
    });
  });

  it("new route를 상세 동적 route로 오인하지 않는다", () => {
    expect(
      getServiceRouteMeta("/assets/accounts/new", { mcpEnabled: true }),
    ).toMatchObject({
      href: "/assets/accounts/new",
      label: "계좌 추가",
    });

    expect(
      getServiceRouteMeta("/assets/stock/transactions/new", {
        mcpEnabled: true,
      }),
    ).toMatchObject({
      href: "/assets/stock/transactions/new",
      label: "거래 등록",
    });
  });

  it("가계부 기록 상세는 일간조회 날짜로 돌아간다", () => {
    const meta = getServiceRouteMeta("/ledger/records/entry-123", {
      mcpEnabled: true,
    });

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams("from=records&date=2026-06-08"),
      }),
    ).toBe("/ledger/records?date=2026-06-08");

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams("from=notification"),
      }),
    ).toBe("/notifications");
  });

  it("주식 거래 상세는 진입한 collection으로 돌아간다", () => {
    const meta = getServiceRouteMeta("/assets/stock/transactions/tx-123", {
      mcpEnabled: true,
    });

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams("from=records&date=2026-06-08"),
      }),
    ).toBe("/assets/stock/records?date=2026-06-08");

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams(
          "from=transactions&page=2&type=buy&ticker=AAPL",
        ),
      }),
    ).toBe("/assets/stock/transactions?page=2&type=buy&ticker=AAPL");

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams("from=notification"),
      }),
    ).toBe("/notifications");
  });
});
