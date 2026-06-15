import { cn } from "@/lib/utils/cn";

export function ScreenSection({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return <section className={cn("space-y-3", className)} {...props} />;
}

interface SectionHeaderProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-3 px-1", className)}
      {...props}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
