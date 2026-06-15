import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ScreenStateType = "empty" | "error" | "loading";

interface ScreenStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  type: ScreenStateType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

const typeIcon = {
  empty: Inbox,
  error: AlertCircle,
  loading: Loader2,
};

const typeIconClassName: Record<ScreenStateType, string> = {
  empty: "text-gray-300",
  error: "text-red-400",
  loading: "animate-spin text-gray-300",
};

export function ScreenState({
  type,
  title,
  description,
  action,
  className,
  ...props
}: ScreenStateProps) {
  const Icon = typeIcon[type];

  return (
    <div
      data-testid="screen-state"
      className={cn(
        "flex min-h-48 flex-col items-center justify-center rounded-xl border border-gray-100 bg-white px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      <Icon className={cn("size-8", typeIconClassName[type])} />
      <h2 className="mt-3 text-base font-semibold text-gray-900">{title}</h2>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
