"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NotificationPreferenceView } from "@/lib/notifications/defaults";
import type {
  NotificationPreferenceBatchUpdate,
  NotificationPreferenceUpdate,
  NotificationType,
} from "@/lib/notifications/schema";
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

async function fetchNotificationPreferences() {
  const response = await fetch("/api/notification-preferences");
  return readApiJson<NotificationPreferenceView[]>(response);
}

async function updateNotificationPreference({
  type,
  input,
}: {
  type: NotificationType;
  input: NotificationPreferenceUpdate;
}) {
  const response = await fetch(`/api/notification-preferences/${type}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readApiJson<NotificationPreferenceView>(response);
}

async function updateNotificationPreferencesBatch(
  input: NotificationPreferenceBatchUpdate,
) {
  const response = await fetch("/api/notification-preferences/batch", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readApiJson<NotificationPreferenceView[]>(response);
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queries.notifications.preferences.queryKey,
    queryFn: fetchNotificationPreferences,
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNotificationPreference,
    onMutate: async ({ type, input }) => {
      await queryClient.cancelQueries({
        queryKey: queries.notifications.preferences.queryKey,
      });
      const previous = queryClient.getQueryData<NotificationPreferenceView[]>(
        queries.notifications.preferences.queryKey,
      );

      queryClient.setQueryData<NotificationPreferenceView[]>(
        queries.notifications.preferences.queryKey,
        (current) =>
          current?.map((preference) =>
            preference.type === type
              ? {
                  ...preference,
                  inAppEnabled: input.inAppEnabled,
                  pushEnabled: input.inAppEnabled ? input.pushEnabled : false,
                }
              : preference,
          ) ?? current,
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queries.notifications.preferences.queryKey,
          context.previous,
        );
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "알림 설정 저장에 실패했습니다.",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queries.notifications.preferences.queryKey,
      });
    },
  });
}

export function useUpdateNotificationPreferencesBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNotificationPreferencesBatch,
    onMutate: async ({ updates }) => {
      await queryClient.cancelQueries({
        queryKey: queries.notifications.preferences.queryKey,
      });
      const previous = queryClient.getQueryData<NotificationPreferenceView[]>(
        queries.notifications.preferences.queryKey,
      );

      const updateMap = new Map(updates.map((update) => [update.type, update]));
      queryClient.setQueryData<NotificationPreferenceView[]>(
        queries.notifications.preferences.queryKey,
        (current) =>
          current?.map((preference) => {
            const update = updateMap.get(preference.type);
            if (!update) return preference;
            return {
              ...preference,
              inAppEnabled: update.inAppEnabled,
              pushEnabled: update.inAppEnabled ? update.pushEnabled : false,
            };
          }) ?? current,
      );

      return { previous };
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(
        queries.notifications.preferences.queryKey,
        preferences,
      );
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queries.notifications.preferences.queryKey,
          context.previous,
        );
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "알림 설정 저장에 실패했습니다.",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queries.notifications.preferences.queryKey,
      });
    },
  });
}
