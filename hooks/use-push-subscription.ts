"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { queries } from "@/lib/queries/keys";

interface ApiDataResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

interface PushSubscriptionStatusResponse {
  isConfigured: boolean;
  isSubscribed: boolean;
  unavailableReason: "server_unavailable" | null;
}

type BrowserPermission = NotificationPermission | "unsupported" | "checking";

export type PushDeviceState =
  | "checking"
  | "unsupported"
  | "server_unavailable"
  | "not_requested"
  | "subscribed"
  | "blocked"
  | "error";

async function readApiJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiDataResponse<T> | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      (json as ApiErrorResponse).error?.message ?? "요청에 실패했습니다.",
    );
  }

  return (json as ApiDataResponse<T>).data;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function getServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  return registration;
}

async function fetchCurrentPushStatus(endpoint: string | null) {
  const params = new URLSearchParams();
  if (endpoint) {
    params.set("endpoint", endpoint);
  }

  const response = await fetch(
    `/api/push-subscriptions/current?${params.toString()}`,
  );
  return readApiJson<PushSubscriptionStatusResponse>(response);
}

async function savePushSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  return readApiJson<PushSubscriptionStatusResponse>(response);
}

async function revokePushSubscription(endpoint: string) {
  const response = await fetch("/api/push-subscriptions/current", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  return readApiJson<PushSubscriptionStatusResponse>(response);
}

export function usePushSubscription() {
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<BrowserPermission>("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [browserChecked, setBrowserChecked] = useState(false);

  const refreshBrowserState = useCallback(async () => {
    if (!isPushSupported()) {
      setPermission("unsupported");
      setEndpoint(null);
      setBrowserChecked(true);
      return;
    }

    setPermission(Notification.permission);
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    setEndpoint(subscription?.endpoint ?? null);
    setBrowserChecked(true);
  }, []);

  useEffect(() => {
    refreshBrowserState().catch((error) => {
      console.error("Push browser state error:", error);
      setPermission("unsupported");
      setEndpoint(null);
      setBrowserChecked(true);
    });
  }, [refreshBrowserState]);

  const statusQuery = useQuery({
    queryKey: queries.notifications.pushSubscription({ endpoint }).queryKey,
    queryFn: () => fetchCurrentPushStatus(endpoint),
    enabled: browserChecked && permission !== "unsupported",
    retry: false,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("현재 Push 알림을 사용할 수 없습니다.");
      }

      if (!isPushSupported()) {
        throw new Error("이 브라우저에서는 Push 알림을 사용할 수 없습니다.");
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        throw new Error("브라우저 알림 권한이 허용되지 않았습니다.");
      }

      const registration = await getServiceWorkerRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const status = await savePushSubscription(subscription);
      setEndpoint(subscription.endpoint);
      return status;
    },
    onSuccess: () => {
      toast.success("이 기기에서 Push 알림을 받을 수 있어요.");
      queryClient.invalidateQueries({
        queryKey: queries.notifications.pushSubscription({ endpoint }).queryKey,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Push 알림 설정에 실패했습니다.",
      );
    },
    onSettled: () => {
      refreshBrowserState();
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) {
        return null;
      }

      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setEndpoint(null);
        return null;
      }

      await revokePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
      setEndpoint(null);
      return null;
    },
    onSuccess: () => {
      toast.success("이 기기에서 Push 알림을 받지 않아요.");
      queryClient.invalidateQueries({
        queryKey: queries.notifications.pushSubscription({ endpoint }).queryKey,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Push 알림 해제에 실패했습니다.",
      );
    },
    onSettled: () => {
      refreshBrowserState();
    },
  });

  const deviceState: PushDeviceState = useMemo(() => {
    if (!browserChecked || permission === "checking" || statusQuery.isLoading) {
      return "checking";
    }
    if (permission === "unsupported") {
      return "unsupported";
    }
    if (permission === "denied") {
      return "blocked";
    }
    if (statusQuery.isError) {
      return "error";
    }
    if (statusQuery.data?.isConfigured === false) {
      return "server_unavailable";
    }
    if (statusQuery.data?.isSubscribed) {
      return "subscribed";
    }
    return "not_requested";
  }, [
    browserChecked,
    permission,
    statusQuery.data,
    statusQuery.isError,
    statusQuery.isLoading,
  ]);

  return {
    deviceState,
    isSubscribed: deviceState === "subscribed",
    isPending: subscribeMutation.isPending || unsubscribeMutation.isPending,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    refresh: refreshBrowserState,
  };
}
