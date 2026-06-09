"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notifications";
import {
  getServiceRouteMeta,
  resolveServiceParentHref,
} from "@/constants/service-routes";
import { cn } from "@/lib/utils/cn";

interface ServiceHeaderProps {
  variant: "mobile" | "desktop";
}

export function ServiceHeader({ variant }: ServiceHeaderProps) {
  const pathname = usePathname();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(
    null,
  );
  const meta = getServiceRouteMeta(pathname);
  const parentHref = resolveServiceParentHref({
    meta,
    searchParams,
  });

  useEffect(() => {
    if (!pathname) {
      return;
    }
    setSearchParams(new URLSearchParams(window.location.search));
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
      <IconLink
        href={parentHref}
        label="이전 화면으로 이동"
        className="shrink-0"
      >
        <ChevronLeft className="size-6" />
      </IconLink>
      <h1 className="min-w-0 flex-1 truncate pr-12 text-base font-semibold text-gray-900">
        {meta.label}
      </h1>
      <IconLink
        href={meta.closeHref}
        label="작업 닫기"
        className="absolute right-1"
      >
        <X className="size-5" />
      </IconLink>
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
