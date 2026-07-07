"use client";

import { Check, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { GroupedList } from "@/components/layout/screen/GroupedList";
import { ScreenState } from "@/components/layout/screen/ScreenState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import type { NotificationItem } from "@/lib/api/notifications";
import { NOTIFICATION_TYPE_CONFIG } from "@/lib/notifications/defaults";
import { buildNotificationHref } from "@/lib/notifications/links";
import { cn } from "@/lib/utils/cn";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationInboxClient() {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useNotifications();
  const markAllRead = useMarkAllNotificationsAsRead();

  const notifications = data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = notifications.some((notification) => !notification.readAt);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">알림함</h1>
          <p className="mt-1 text-sm text-gray-500">
            나에게 도착한 알림을 확인합니다.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={!hasUnread || markAllRead.isPending}
        >
          {markAllRead.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          전체 읽음
        </Button>
      </div>

      {notifications.length === 0 ? (
        <ScreenState
          type="empty"
          title="아직 알림이 없습니다"
          description="협업 요청이나 공유 기록 변경이 생기면 여기에 표시됩니다."
        />
      ) : (
        <GroupedList data-testid="grouped-list">
          {notifications.map((notification) => (
            <NotificationItemRow
              key={notification.id}
              notification={notification}
            />
          ))}
        </GroupedList>
      )}

      {hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}더
          보기
        </Button>
      )}
    </div>
  );
}

function NotificationItemRow({
  notification,
}: {
  notification: NotificationItem;
}) {
  const markRead = useMarkNotificationAsRead();
  const href = buildNotificationHref({
    linkKind: notification.linkKind,
    linkParams: notification.linkParams,
  });
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const isUnread = !notification.readAt;

  const handleMarkRead = () => {
    if (isUnread) {
      markRead.mutate(notification.id);
    }
  };

  return (
    <div
      className={cn(
        "relative transition-colors hover:bg-gray-50",
        isUnread && "bg-primary/[0.02] hover:bg-primary/[0.04]",
      )}
    >
      <Link href={href} className="block p-4 pr-12">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              isUnread ? "bg-primary" : "bg-gray-200",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-gray-900">{notification.title}</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                {config.label}
              </span>
            </div>
            {notification.body && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {notification.body}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              {formatNotificationTime(notification.createdAt)}
            </p>
          </div>
        </div>
      </Link>
      <div className="absolute right-3 top-4 flex items-center gap-1">
        {isUnread && (
          <button
            type="button"
            onClick={handleMarkRead}
            disabled={markRead.isPending}
            className="rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            읽음
          </button>
        )}
        <ChevronRight className="size-4 text-gray-300" />
      </div>
    </div>
  );
}
