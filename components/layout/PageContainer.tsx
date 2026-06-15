import { cn } from "@/lib/utils/cn";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "default" | "narrow" | "medium";
  className?: string;
}

const maxWidthClasses = {
  default: "max-w-5xl",
  narrow: "max-w-xl",
  medium: "max-w-3xl",
};

export function PageContainer({
  children,
  maxWidth = "default",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-6",
        maxWidthClasses[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
}
