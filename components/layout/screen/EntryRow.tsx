import { ChevronRight, Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type EntryRowAction = "none" | "disclosure";

interface EntryRowProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  action?: EntryRowAction;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  iconClassName?: string;
  iconContainerClassName?: string;
}

export function EntryRow({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  trailing,
  action,
  disabled = false,
  isLoading = false,
  className,
  iconClassName,
  iconContainerClassName,
}: EntryRowProps) {
  const showDisclosure =
    !isLoading && !disabled && (action === "disclosure" || (!action && href));

  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {Icon && (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100",
              iconContainerClassName,
            )}
          >
            <Icon className={cn("size-5 text-gray-600", iconClassName)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{title}</p>
          {description && (
            <p className="mt-0.5 truncate text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {(trailing || isLoading || showDisclosure) && (
        <div className="flex shrink-0 items-center gap-2">
          {trailing && <div className="min-w-0 text-right">{trailing}</div>}
          {isLoading ? (
            <Loader2 className="size-5 animate-spin text-gray-400" />
          ) : showDisclosure ? (
            <ChevronRight className="size-5 text-gray-400" />
          ) : null}
        </div>
      )}
    </>
  );

  const baseClassName = cn(
    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
    disabled
      ? "cursor-not-allowed opacity-60"
      : "hover:bg-gray-50 active:bg-gray-100",
    className,
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={baseClassName}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClassName}>{content}</div>;
}
