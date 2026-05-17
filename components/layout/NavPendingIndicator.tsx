"use client";

import { LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils/cn";

interface NavPendingIndicatorProps {
  className?: string;
}

export function NavPendingIndicator({ className }: NavPendingIndicatorProps) {
  const { pending } = useLinkStatus();

  if (!pending) {
    return null;
  }

  return (
    <LoaderCircle
      className={cn("size-3.5 animate-spin text-current", className)}
      aria-label="페이지 이동 중"
    />
  );
}
