"use client";

import { ArrowLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getServiceRouteMeta } from "@/constants/service-routes";
import { cn } from "@/lib/utils/cn";

interface ServiceHeaderProps {
  variant: "mobile" | "desktop";
}

export function ServiceHeader({ variant }: ServiceHeaderProps) {
  const pathname = usePathname();
  const [scope, setScope] = useState<string | null>(null);
  const meta = getServiceRouteMeta(pathname);
  const parentHref = getParentHref({
    parentHref: meta?.parentHref,
    pathname,
    scope,
  });

  useEffect(() => {
    if (!pathname) {
      return;
    }
    setScope(new URLSearchParams(window.location.search).get("scope"));
  }, [pathname]);

  if (variant === "desktop") {
    return <DesktopServiceHeader meta={meta} />;
  }

  return <MobileServiceHeader meta={meta} parentHref={parentHref} />;
}

function MobileServiceHeader({
  meta,
  parentHref,
}: {
  meta: ReturnType<typeof getServiceRouteMeta>;
  parentHref?: string;
}) {
  if (!meta) {
    return null;
  }

  if (meta.mobileVariant === "topLevel") {
    return (
      <header className="h-14 px-4 flex items-center lg:hidden">
        <Link href="/home" className="inline-flex items-center">
          <span className="text-xl font-bold text-primary">oat</span>
        </Link>
      </header>
    );
  }

  return (
    <header className="h-14 px-2 grid grid-cols-[44px_1fr_44px] items-center lg:hidden">
      <IconLink
        href={parentHref}
        label="이전 화면으로 이동"
        className="justify-self-start"
      >
        <ArrowLeft className="size-5" />
      </IconLink>
      <h1 className="min-w-0 text-center text-base font-semibold text-gray-900 truncate">
        {meta.label}
      </h1>
      <IconLink
        href={meta.closeHref}
        label="작업 닫기"
        className="justify-self-end"
      >
        <X className="size-5" />
      </IconLink>
    </header>
  );
}

function getParentHref({
  parentHref,
  pathname,
  scope,
}: {
  parentHref?: string;
  pathname: string;
  scope: string | null;
}) {
  if (!parentHref) {
    return undefined;
  }

  if (scope && pathname.startsWith("/ledger/analysis/")) {
    return `${parentHref}?scope=${scope}`;
  }

  return parentHref;
}

function DesktopServiceHeader({
  meta,
}: {
  meta: ReturnType<typeof getServiceRouteMeta>;
}) {
  return (
    <header className="hidden lg:flex h-14 shrink-0 items-center bg-white border-b border-gray-200 px-4">
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
