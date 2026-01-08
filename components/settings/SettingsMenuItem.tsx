"use client";

import { ChevronRight, Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface SettingsMenuItemProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function SettingsMenuItem({
  icon: Icon,
  label,
  description,
  href,
  onClick,
  disabled = false,
  isLoading = false,
}: SettingsMenuItemProps) {
  const content = (
    <>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-xl bg-gray-100 shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">{label}</p>
          {description && (
            <p className="text-sm text-gray-500 truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        ) : disabled ? (
          <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-full">
            준비 중
          </span>
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </>
  );

  const baseClassName = cn(
    "flex items-center gap-3 w-full p-4 bg-white rounded-2xl shadow-sm transition-colors",
    disabled
      ? "opacity-60 cursor-not-allowed"
      : "hover:bg-gray-50 active:bg-gray-100",
  );

  if (disabled) {
    return <div className={baseClassName}>{content}</div>;
  }

  if (href) {
    return (
      <Link href={href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(baseClassName, "text-left")}
    >
      {content}
    </button>
  );
}
