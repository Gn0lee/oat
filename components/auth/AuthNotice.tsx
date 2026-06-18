import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface AuthNoticeProps {
  tone: "info" | "success" | "error" | "loading";
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function AuthNotice({
  tone,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  className,
}: AuthNoticeProps) {
  let Icon = Mail;
  let iconColorClass = "text-blue-600";
  let iconBgClass = "bg-blue-50";

  switch (tone) {
    case "success":
      Icon = CheckCircle2;
      iconColorClass = "text-green-600";
      iconBgClass = "bg-green-50";
      break;
    case "error":
      Icon = AlertCircle;
      iconColorClass = "text-red-600";
      iconBgClass = "bg-red-50";
      break;
    case "loading":
      Icon = Loader2;
      iconColorClass = "text-gray-600 animate-spin";
      iconBgClass = "bg-gray-50";
      break;
    case "info":
    default:
      Icon = Mail;
      iconColorClass = "text-blue-600";
      iconBgClass = "bg-blue-50";
      break;
  }

  return (
    <div className={cn("text-center", className)}>
      <div
        className={cn(
          "mx-auto flex size-12 items-center justify-center rounded-full",
          iconBgClass,
        )}
      >
        <Icon className={cn("size-6", iconColorClass)} />
      </div>

      <h3 className="mt-4 text-xl font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm leading-6 text-gray-500 [overflow-wrap:anywhere]">
          {description}
        </p>
      )}

      {children && <div className="mt-6">{children}</div>}

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 space-y-3">
          {primaryAction && <div>{primaryAction}</div>}
          {secondaryAction && <div>{secondaryAction}</div>}
        </div>
      )}
    </div>
  );
}
