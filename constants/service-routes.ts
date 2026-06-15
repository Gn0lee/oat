export type MobileHeaderVariant = "topLevel" | "child" | "task";

export interface BreadcrumbItem {
  href: string;
  label: string;
}

export interface ServiceRouteMeta {
  href: string;
  pattern: string;
  label: string;
  mobileVariant: MobileHeaderVariant;
  parentHref?: string;
  closeHref?: string;
  breadcrumb: BreadcrumbItem[];
  preserveSearchParams: string[];
  parentResolver?: "ledgerRecordDetail" | "stockTransactionDetail";
}

interface ServiceRouteNode {
  href: string;
  pattern?: string;
  label: string;
  mobile?: MobileHeaderVariant;
  closeHref?: string;
  preserveSearchParams?: readonly string[];
  parentResolver?: ServiceRouteMeta["parentResolver"];
  children?: readonly ServiceRouteNode[];
}

export function getServiceRouteTree(options?: {
  mcpEnabled?: boolean;
}): readonly ServiceRouteNode[] {
  return [
    {
      href: "/home",
      label: "홈",
      mobile: "topLevel",
      children: [{ href: "/notifications", label: "알림함" }],
    },
    {
      href: "/ledger",
      label: "가계부",
      mobile: "topLevel",
      children: [
        {
          href: "/ledger/records/new/full",
          label: "기록 추가",
          mobile: "task",
          closeHref: "/ledger",
        },
        {
          href: "/ledger/records",
          label: "기록 조회",
          preserveSearchParams: ["date"],
          children: [
            {
              href: "/ledger/records/[entryId]",
              pattern: "/ledger/records/[entryId]",
              label: "기록 상세",
              parentResolver: "ledgerRecordDetail",
            },
            {
              href: "/ledger/records/new/daily",
              label: "하루 기록 추가",
              mobile: "task",
              closeHref: "/ledger/records",
            },
          ],
        },
        {
          href: "/ledger/payment-methods",
          label: "결제수단 관리",
          children: [
            {
              href: "/ledger/payment-methods/new",
              label: "결제수단 추가",
              mobile: "task",
              closeHref: "/ledger/payment-methods",
            },
            {
              href: "/ledger/payment-methods/[paymentMethodId]",
              pattern: "/ledger/payment-methods/[paymentMethodId]",
              label: "결제수단 상세",
            },
          ],
        },
        { href: "/ledger/categories", label: "카테고리 관리" },
        {
          href: "/ledger/analysis",
          label: "통계",
          children: [
            {
              href: "/ledger/analysis/trend",
              label: "월별 추이",
              preserveSearchParams: ["scope"],
            },
            {
              href: "/ledger/analysis/daily",
              label: "일별 지출 현황",
              preserveSearchParams: ["scope"],
            },
            {
              href: "/ledger/analysis/by-category",
              label: "카테고리별 지출",
              preserveSearchParams: ["scope"],
            },
            {
              href: "/ledger/analysis/by-payment-method",
              label: "결제수단별 지출",
              preserveSearchParams: ["scope"],
            },
            {
              href: "/ledger/analysis/by-member",
              label: "구성원별 지출",
              preserveSearchParams: ["scope"],
            },
          ],
        },
      ],
    },
    {
      href: "/assets",
      label: "자산",
      mobile: "topLevel",
      children: [
        {
          href: "/assets/accounts",
          label: "계좌 관리",
          children: [
            {
              href: "/assets/accounts/new",
              label: "계좌 추가",
              mobile: "task",
              closeHref: "/assets/accounts",
            },
            {
              href: "/assets/accounts/[accountId]",
              pattern: "/assets/accounts/[accountId]",
              label: "계좌 상세",
            },
          ],
        },
        {
          href: "/assets/stock",
          label: "주식",
          children: [
            { href: "/assets/stock/holdings", label: "보유 종목" },
            {
              href: "/assets/stock/records",
              label: "일별 기록",
              preserveSearchParams: ["date"],
              children: [
                {
                  href: "/assets/stock/transactions/new/daily",
                  label: "하루 거래 등록",
                  mobile: "task",
                  closeHref: "/assets/stock/records",
                },
              ],
            },
            {
              href: "/assets/stock/transactions",
              label: "거래 내역",
              children: [
                {
                  href: "/assets/stock/transactions/new",
                  label: "거래 등록",
                  mobile: "task",
                  closeHref: "/assets/stock/transactions",
                },
                {
                  href: "/assets/stock/transactions/[transactionId]",
                  pattern: "/assets/stock/transactions/[transactionId]",
                  label: "거래 상세",
                  parentResolver: "stockTransactionDetail",
                },
                {
                  href: "/assets/stock/transactions/new/full",
                  label: "거래 등록",
                  mobile: "task",
                  closeHref: "/assets/stock/transactions",
                },
                {
                  href: "/assets/stock/transactions/new/account",
                  label: "계좌 거래 등록",
                  mobile: "task",
                  closeHref: "/assets/stock/transactions",
                },
              ],
            },
            { href: "/assets/stock/accounts", label: "증권 계좌" },
            { href: "/assets/stock/settings", label: "종목 설정" },
            {
              href: "/assets/stock/analysis",
              label: "주식 분석",
              children: [
                {
                  href: "/assets/stock/analysis/overview",
                  label: "종합 분석",
                },
                {
                  href: "/assets/stock/analysis/by-owner",
                  label: "소유자별",
                },
                {
                  href: "/assets/stock/analysis/by-risk",
                  label: "위험도별",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      href: "/settings",
      label: "설정",
      mobile: "topLevel",
      children: [
        { href: "/settings/household", label: "가구 관리" },
        ...(options?.mcpEnabled
          ? [{ href: "/settings/mcp", label: "MCP 연결" } as const]
          : []),
        { href: "/settings/notifications", label: "알림 설정" },
      ],
    },
  ] as const satisfies readonly ServiceRouteNode[];
}

export function getRouteMeta(options?: { mcpEnabled?: boolean }) {
  return flattenServiceRoutes(getServiceRouteTree(options));
}

function normalizePathname(pathname: string): string {
  const [path] = pathname.split("?");
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function flattenServiceRoutes(
  routes: readonly ServiceRouteNode[],
  parent?: ServiceRouteNode,
  ancestors: BreadcrumbItem[] = [],
): ServiceRouteMeta[] {
  return routes.flatMap((route) => {
    const breadcrumb = [...ancestors, { href: route.href, label: route.label }];
    const meta: ServiceRouteMeta = {
      href: route.href,
      pattern: route.pattern ?? route.href,
      label: route.label,
      mobileVariant: route.mobile ?? "child",
      parentHref: parent?.href,
      closeHref: route.closeHref,
      breadcrumb,
      preserveSearchParams: [...(route.preserveSearchParams ?? [])],
      parentResolver: route.parentResolver,
    };

    return [
      meta,
      ...flattenServiceRoutes(route.children ?? [], route, breadcrumb),
    ];
  });
}

export function resolveServiceParentHref({
  meta,
  searchParams,
}: {
  meta: ServiceRouteMeta | null;
  searchParams: URLSearchParams | null;
}): string | undefined {
  if (!meta) {
    return undefined;
  }

  if (meta.parentResolver === "ledgerRecordDetail") {
    const from = searchParams?.get("from");
    if (from === "notification") {
      return "/notifications";
    }
    if (from === "records") {
      return appendAllowedSearchParams("/ledger/records", searchParams, [
        "date",
      ]);
    }
  }

  if (meta.parentResolver === "stockTransactionDetail") {
    const from = searchParams?.get("from");
    if (from === "notification") {
      return "/notifications";
    }
    if (from === "records") {
      return appendAllowedSearchParams("/assets/stock/records", searchParams, [
        "date",
      ]);
    }
    if (from === "transactions") {
      return appendAllowedSearchParams(
        "/assets/stock/transactions",
        searchParams,
        ["page", "type", "ownerId", "accountId", "ticker", "search"],
      );
    }
  }

  return appendAllowedSearchParams(
    meta.parentHref,
    searchParams,
    meta.preserveSearchParams,
  );
}

function appendAllowedSearchParams(
  href: string | undefined,
  searchParams: URLSearchParams | null,
  allowedKeys: string[],
) {
  if (!href) {
    return undefined;
  }

  const preservedParams = new URLSearchParams();
  for (const key of allowedKeys) {
    const value = searchParams?.get(key);
    if (value) {
      preservedParams.set(key, value);
    }
  }

  const queryString = preservedParams.toString();
  return queryString ? `${href}?${queryString}` : href;
}

export function getServiceRouteMeta(
  pathname: string,
  options?: { mcpEnabled?: boolean },
): ServiceRouteMeta | null {
  const normalizedPathname = normalizePathname(pathname);
  return (
    getRouteMeta(options).find((route) =>
      matchesRoutePath(route, normalizedPathname),
    ) ?? null
  );
}

function matchesRoutePath(route: ServiceRouteMeta, pathname: string): boolean {
  if (route.href === pathname) {
    return true;
  }

  if (!route.pattern.includes("[")) {
    return false;
  }

  const routeSegments = route.pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (routeSegments.length !== pathSegments.length) {
    return false;
  }

  return routeSegments.every((segment, index) => {
    if (segment.startsWith("[") && segment.endsWith("]")) {
      return pathSegments[index].length > 0;
    }
    return segment === pathSegments[index];
  });
}
