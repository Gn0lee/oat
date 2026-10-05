import { describe, expect, it } from "vitest";
import {
  getServiceRouteMeta,
  resolveServiceParentHref,
} from "./service-routes";

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

  it("카테고리 상세 화면의 parent와 breadcrumb를 계산한다", () => {
    expect(getServiceRouteMeta("/ledger/categories/parent-1")).toMatchObject({
      label: "세부 카테고리",
      mobileVariant: "child",
      parentHref: "/ledger/categories",
      breadcrumb: [
        { href: "/ledger", label: "가계부" },
        { href: "/ledger/categories", label: "카테고리 관리" },
        {
          href: "/ledger/categories/[parentId]",
          label: "세부 카테고리",
        },
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

  it("가계부 내역 검색 route는 검색 조건을 보존한다", () => {
    expect(getServiceRouteMeta("/ledger/search")).toMatchObject({
      label: "내역 검색",
      parentHref: "/ledger",
      preserveSearchParams: [],
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

  it("주식 분석 hub와 하위 분석 route를 계산한다", () => {
    expect(getServiceRouteMeta("/assets/stock/analysis")).toMatchObject({
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
      getServiceRouteMeta("/assets/stock/analysis/overview"),
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
      getServiceRouteMeta("/assets/stock/analysis/by-owner"),
    ).toMatchObject({
      label: "소유자별",
      parentHref: "/assets/stock/analysis",
    });

    expect(getServiceRouteMeta("/assets/stock/analysis/by-risk")).toMatchObject(
      {
        label: "위험도별",
        parentHref: "/assets/stock/analysis",
      },
    );
  });

  it("일몰된 전체 자산 분석 route는 metadata를 제공하지 않는다", () => {
    expect(getServiceRouteMeta("/assets/analysis")).toBeNull();
    expect(getServiceRouteMeta("/assets/analysis/by-owner")).toBeNull();
  });

  it("query string과 trailing slash를 무시한다", () => {
    expect(
      getServiceRouteMeta("/ledger/payment-methods/new?returnUrl=/ledger"),
    ).toMatchObject({ href: "/ledger/payment-methods/new" });
  });

  it("path parameter 패턴 route를 매칭한다", () => {
    expect(getServiceRouteMeta("/assets/accounts/account-123")).toMatchObject({
      href: "/assets/accounts/[accountId]",
      pattern: "/assets/accounts/[accountId]",
      label: "계좌 상세",
      parentHref: "/assets/accounts",
    });
  });

  it("new route를 상세 동적 route로 오인하지 않는다", () => {
    expect(getServiceRouteMeta("/assets/accounts/new")).toMatchObject({
      href: "/assets/accounts/new",
      label: "계좌 추가",
    });

    expect(getServiceRouteMeta("/assets/stock/transactions/new")).toMatchObject(
      {
        href: "/assets/stock/transactions/new",
        label: "거래 등록",
      },
    );
  });

  it("가계부 기록 상세는 일간조회 날짜로 돌아간다", () => {
    const meta = getServiceRouteMeta("/ledger/records/entry-123");

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

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams(
          "from=search&q=%EC%83%9D%EC%9D%BC&scope=personal",
        ),
      }),
    ).toBe("/ledger/search?q=%EC%83%9D%EC%9D%BC&scope=personal");

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams(
          "from=search&q=%EC%BB%A4%ED%94%BC&book=book-1&cursor=x",
        ),
      }),
    ).toBe("/ledger/search?q=%EC%BB%A4%ED%94%BC&book=book-1");

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams(
          "from=records&date=2026-06-08&book=book-1&view=month",
        ),
      }),
    ).toBe("/ledger/records?date=2026-06-08&book=book-1&view=month");
  });

  it("주식 거래 상세는 진입한 collection으로 돌아간다", () => {
    const meta = getServiceRouteMeta("/assets/stock/transactions/tx-123");

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

  it("가계부 분석 하위 화면은 장부와 기간을 유지한 채 분석 허브로 돌아간다", () => {
    const meta = getServiceRouteMeta("/ledger/analysis/daily");

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams(
          "book=book-1&year=2026&month=4&scope=shared",
        ),
      }),
    ).toBe("/ledger/analysis?book=book-1&year=2026&month=4");
  });

  it("분석에서 연 기록 상세는 유형·결제수단 조건을 유지해 달력으로 돌아간다", () => {
    const meta = getServiceRouteMeta("/ledger/records/entry-1");

    expect(
      resolveServiceParentHref({
        meta,
        searchParams: new URLSearchParams(
          "from=records&date=2026-10-31&type=expense&paymentMethodId=__none__",
        ),
      }),
    ).toBe(
      "/ledger/records?date=2026-10-31&type=expense&paymentMethodId=__none__",
    );
  });
});
