"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  NotificationItem,
  NotificationListResult,
} from "@/lib/api/notifications";
import { queries } from "@/lib/queries/keys";

interface ApiDataResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

async function readApiJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiDataResponse<T> | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      (json as ApiErrorResponse).error?.message ?? "요청에 실패했습니다.",
    );
  }

  return (json as ApiDataResponse<T>).data;
}

async function fetchNotifications({
  pageParam,
  limit,
}: {
  pageParam?: string | null;
  limit: number;
}): Promise<NotificationListResult> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (pageParam) {
    params.set("cursor", pageParam);
  }

  const response = await fetch(`/api/notifications?${params.toString()}`);
  return readApiJson<NotificationListResult>(response);
}

async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await fetch("/api/notifications/unread-count");
  const data = await readApiJson<{ count: number }>(response);
  return data.count;
}

async function markNotificationAsRead(id: string): Promise<NotificationItem> {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
  return readApiJson<NotificationItem>(response);
}

async function markAllNotificationsAsRead(): Promise<{ count: number }> {
  const response = await fetch("/api/notifications/read-all", {
    method: "POST",
  });
  return readApiJson<{ count: number }>(response);
}

export function useNotifications(limit = 20) {
  return useInfiniteQuery({
    queryKey: queries.notifications.list({ limit }).queryKey,
    queryFn: ({ pageParam }) => fetchNotifications({ pageParam, limit }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queries.notifications.unreadCount.queryKey,
    queryFn: fetchUnreadNotificationCount,
    staleTime: 1000 * 30,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queries.notifications._def });

      const previousCount = queryClient.getQueryData<number>(
        queries.notifications.unreadCount.queryKey,
      );

      queryClient.setQueryData<number>(
        queries.notifications.unreadCount.queryKey,
        (count) => Math.max((count ?? 0) - 1, 0),
      );

      return { previousCount, id };
    },
    onError: (error, _id, context) => {
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          queries.notifications.unreadCount.queryKey,
          context.previousCount,
        );
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "알림 읽음 처리에 실패했습니다.",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queries.notifications._def });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queries.notifications._def });
      const previousCount = queryClient.getQueryData<number>(
        queries.notifications.unreadCount.queryKey,
      );
      queryClient.setQueryData(queries.notifications.unreadCount.queryKey, 0);
      return { previousCount };
    },
    onError: (error, _variables, context) => {
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          queries.notifications.unreadCount.queryKey,
          context.previousCount,
        );
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "전체 읽음 처리에 실패했습니다.",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queries.notifications._def });
    },
  });
}
