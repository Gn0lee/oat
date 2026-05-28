import { cn } from "@/lib/utils/cn";

interface PageActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function PageActions({ children, className }: PageActionsProps) {
  return (
    <div className={cn("-mt-1 flex justify-end", className)}>{children}</div>
  );
}
