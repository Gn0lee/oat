import type * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface AuthShellProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
}: AuthShellProps) {
  return (
    <div className={cn("min-h-screen bg-white px-4 py-10 sm:px-6", className)}>
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">oat</h1>
          <p className="mt-2 text-sm text-gray-500">가족 자산 통합 관리</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-2 text-sm leading-6 text-gray-500 [overflow-wrap:anywhere]">
              {description}
            </p>
          )}
          <div className={cn("mt-6", contentClassName)}>{children}</div>
          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
