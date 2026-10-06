"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  COMPOSER_BACK_EVENT,
  COMPOSER_CLOSE_EVENT,
  dispatchComposerEvent,
} from "@/components/composer/composer-events";
import { NotificationBell } from "@/components/notifications";
import {
  getServiceRouteMeta,
  resolveServiceParentHref,
} from "@/constants/service-routes";
import { cn } from "@/lib/utils/cn";

const STOCK_TRADE_COMPOSER_PATHS = [
  "/assets/stock/transactions/new/full",
  "/assets/stock/transactions/new/daily",
];

/** 헤더 뒤로가기·닫기를 활성 컴포저에 맡기는 화면 */
function isComposerPath(pathname: string) {
  return (
    pathname.startsWith("/ledger/records/new/") ||
    STOCK_TRADE_COMPOSER_PATHS.includes(pathname)
  );
}

// The records screen's mobile header scrolls away with the list, so it is
// rendered inside the layout's scroll container instead of above it.
const SCROLLING_HEADER_PATHNAME = "/ledger/records";

interface ServiceHeaderProps {
  variant: "mobile" | "desktop";
  // "fixed" (default) sits above the scroll container; "scroll" sits inside it
  // and only renders on the screens that scroll their header away.
  placement?: "fixed" | "scroll";
}

export function ServiceHeader({
  variant,
  placement = "fixed",
}: ServiceHeaderProps) {
  const pathname = usePathname();
  const meta = getServiceRouteMeta(pathname);

  if (
    variant === "mobile" &&
    (pathname === SCROLLING_HEADER_PATHNAME) !== (placement === "scroll")
  ) {
    return null;
  }

  if (variant === "desktop") {
    return <DesktopServiceHeader meta={meta} />;
  }

  return (
    <Suspense
      fallback={
        <MobileServiceHeader
          meta={meta}
          isComposer={isComposerPath(pathname)}
        />
      }
    >
      <MobileServiceHeaderWithQuery
        meta={meta}
        isComposer={isComposerPath(pathname)}
      />
    </Suspense>
  );
}

function MobileServiceHeaderWithQuery({
  meta,
  isComposer,
}: {
  meta: ReturnType<typeof getServiceRouteMeta>;
  isComposer: boolean;
}) {
  const searchParams = useSearchParams();
  const parentHref = resolveServiceParentHref({
    meta,
    searchParams: new URLSearchParams(searchParams.toString()),
  });
  return (
    <MobileServiceHeader
      meta={meta}
      parentHref={parentHref}
      isComposer={isComposer}
    />
  );
}

function MobileServiceHeader({
  meta,
  parentHref,
  isComposer = false,
}: {
  meta: ReturnType<typeof getServiceRouteMeta>;
  parentHref?: string;
  isComposer?: boolean;
}) {
  if (!meta) {
    return null;
  }

  if (meta.mobileVariant === "topLevel") {
    return (
      <header className="absolute inset-x-0 top-0 z-50 bg-gray-50/80 backdrop-blur-md h-14 px-4 flex items-center justify-between lg:hidden">
        <Link href="/home" className="inline-flex items-center">
          <span className="text-xl font-bold text-primary">oat</span>
        </Link>
        <NotificationBell />
      </header>
    );
  }

  return (
    <header className="absolute inset-x-0 top-0 z-50 bg-gray-50/80 backdrop-blur-md h-14 px-1 flex items-center lg:hidden">
      {isComposer ? (
        <IconButton
          label="이전 화면으로 이동"
          onClick={() => dispatchComposerEvent(COMPOSER_BACK_EVENT)}
          className="shrink-0"
        >
          <ChevronLeft className="size-6" />
        </IconButton>
      ) : (
        <IconLink
          href={parentHref}
          label="이전 화면으로 이동"
          className="shrink-0"
        >
          <ChevronLeft className="size-6" />
        </IconLink>
      )}
      <h1 className="min-w-0 flex-1 truncate pr-12 text-base font-semibold text-gray-900">
        {meta.label}
      </h1>
      {isComposer ? (
        <IconButton
          label="작업 닫기"
          onClick={() => dispatchComposerEvent(COMPOSER_CLOSE_EVENT)}
          className="absolute right-1"
        >
          <X className="size-5" />
        </IconButton>
      ) : (
        <IconLink
          href={meta.closeHref}
          label="작업 닫기"
          className="absolute right-1"
        >
          <X className="size-5" />
        </IconLink>
      )}
    </header>
  );
}

function DesktopServiceHeader({
  meta,
}: {
  meta: ReturnType<typeof getServiceRouteMeta>;
}) {
  return (
    <header className="hidden lg:flex h-14 shrink-0 items-center justify-between bg-white border-b border-gray-200 px-4">
      {meta && (
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2"
        >
          {meta.breadcrumb.map((item, index) => {
            const isLast = index === meta.breadcrumb.length - 1;

            return (
              <div key={item.href} className="flex min-w-0 items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="size-4 shrink-0 text-gray-400" />
                )}
                {isLast ? (
                  <span className="truncate text-sm font-medium text-gray-900">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="truncate text-sm text-gray-500 transition-colors hover:text-gray-900"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      )}
      <NotificationBell className="shrink-0" />
    </header>
  );
}

function IconLink({
  href,
  label,
  className,
  children,
}: {
  href?: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return <div className={cn("size-11", className)} />;
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function IconButton({
  label,
  className,
  children,
  onClick,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
