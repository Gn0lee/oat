export type PageTransitionMode = "initial" | "mobile" | "desktop" | "reduced";

export type PageTransitionRule =
  | {
      kind: "fade";
      paths: readonly string[];
      speed?: "default" | "fast";
    }
  | {
      kind: "axis";
      paths: readonly string[];
      type: "x";
      variant?: "default" | "snappy";
    }
  | {
      kind: "axis";
      paths: readonly string[];
      type: "y";
      variant?: "default" | "non-directional";
    }
  | {
      kind: "axis";
      paths: readonly string[];
      type: "z";
      variant?: "default";
    }
  | {
      kind: "sheet" | "drill";
      enter: string;
      exit: string;
      type?: "static" | "scale" | "parallax" | "slide";
    };

const TOP_LEVEL_ROUTES = [
  "/home",
  "/ledger",
  "/assets",
  "/settings",
  "/household",
] as const;

export function getPageTransitionMode({
  hasMounted,
  isDesktop,
  prefersReducedMotion,
}: {
  hasMounted: boolean;
  isDesktop: boolean;
  prefersReducedMotion: boolean;
}): PageTransitionMode {
  if (!hasMounted) {
    return "initial";
  }
  if (prefersReducedMotion) {
    return "reduced";
  }
  return isDesktop ? "desktop" : "mobile";
}

export function getPageTransitionRules(
  mode: PageTransitionMode,
): PageTransitionRule[] {
  switch (mode) {
    case "mobile":
      return [
        { kind: "fade", paths: TOP_LEVEL_ROUTES },
        {
          kind: "drill",
          enter: "/ledger/*",
          exit: "/ledger",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/ledger/analysis/*",
          exit: "/ledger/analysis",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/ledger/payment-methods/*",
          exit: "/ledger/payment-methods",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/assets/*",
          exit: "/assets",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/assets/accounts/*",
          exit: "/assets/accounts",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/assets/analysis/*",
          exit: "/assets/analysis",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/assets/stock/*",
          exit: "/assets/stock",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/assets/stock/transactions/*",
          exit: "/assets/stock/transactions",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/settings/*",
          exit: "/settings",
          type: "parallax",
        },
        {
          kind: "drill",
          enter: "/household/*",
          exit: "/household",
          type: "parallax",
        },
      ];
    case "desktop":
      return [
        { kind: "fade", paths: TOP_LEVEL_ROUTES, speed: "fast" },
        { kind: "fade", paths: ["/ledger", "/ledger/new"], speed: "fast" },
      ];
    case "reduced":
    case "initial":
      return [
        { kind: "fade", paths: TOP_LEVEL_ROUTES },
        { kind: "fade", paths: ["/ledger", "/ledger/new"] },
      ];
  }
}
