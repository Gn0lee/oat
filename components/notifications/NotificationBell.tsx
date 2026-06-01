"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils/cn";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { data: count = 0 } = useUnreadNotificationCount();
  const badgeText = count > 99 ? "99+" : String(count);

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `읽지 않은 알림 ${count}개` : "알림함"}
      className={cn(
        "relative inline-flex size-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100",
        className,
      )}
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute right-1.5 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
          {badgeText}
        </span>
      )}
    </Link>
  );
}
