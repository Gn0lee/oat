"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <main
      key={pathname}
      data-ssgoi-transition={pathname}
      className={cn("min-h-full w-full bg-gray-50 overflow-x-clip", className)}
    >
      {children}
    </main>
  );
}
