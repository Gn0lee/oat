"use client";

import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import { GroupedList } from "@/components/layout/screen/GroupedList";
import {
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen/ScreenSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  useUpdateNotificationPreferencesBatch,
} from "@/hooks/use-notification-preferences";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import {
  NOTIFICATION_PREFERENCE_GROUP_LABELS,
  type NotificationPreferenceView,
} from "@/lib/notifications/defaults";
import type { NotificationType } from "@/lib/notifications/schema";
import { cn } from "@/lib/utils/cn";

const IMPORTANT_PUSH_TYPES = new Set<NotificationType>([
  "ledger_record_change_request",
  "stock_transaction_change_request",
  "ledger_request_result",
  "stock_transaction_request_result",
  "ledger_record_changed",
  "stock_transaction_changed",
]);

export function NotificationSettingsClient() {
  const { data: preferences = [], isLoading } = useNotificationPreferences();
  const pushSubscription = usePushSubscription();
  const updatePreferencesBatch = useUpdateNotificationPreferencesBatch();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const groups = preferences.reduce<
    Partial<
      Record<NotificationPreferenceView["group"], NotificationPreferenceView[]>
    >
  >((acc, preference) => {
    acc[preference.group] = [...(acc[preference.group] ?? []), preference];
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">알림 설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          알림 종류별 앱 내 알림 and Push 수신 여부를 설정합니다.
        </p>
      </div>

      <PushDeviceCard
        preferences={preferences}
        pushSubscription={pushSubscription}
        updatePreferencesBatch={updatePreferencesBatch}
      />

      {Object.entries(NOTIFICATION_PREFERENCE_GROUP_LABELS).map(
        ([group, label]) => {
          const items =
            groups[group as NotificationPreferenceView["group"]] ?? [];

          if (items.length === 0) {
            return null;
          }

          return (
            <ScreenSection key={group}>
              <SectionHeader title={label} />
              <GroupedList data-testid="grouped-list">
                {items.map((preference) => (
                  <PreferenceRow
                    key={preference.type}
                    preference={preference}
                    isPushSubscribed={pushSubscription.isSubscribed}
                  />
                ))}
              </GroupedList>
            </ScreenSection>
          );
        },
      )}
    </div>
  );
}

function PushDeviceCard({
  preferences,
  pushSubscription,
  updatePreferencesBatch,
}: {
  preferences: NotificationPreferenceView[];
  pushSubscription: ReturnType<typeof usePushSubscription>;
  updatePreferencesBatch: ReturnType<
    typeof useUpdateNotificationPreferencesBatch
  >;
}) {
  const importantPushTargets = preferences.filter(
    (preference) =>
      IMPORTANT_PUSH_TYPES.has(preference.type) &&
      preference.inAppEnabled &&
      !preference.pushEnabled,
  );
  const canOfferImportantPush =
    pushSubscription.isSubscribed && importantPushTargets.length > 0;

  const handleEnableImportantPush = async () => {
    await updatePreferencesBatch.mutateAsync({
      updates: importantPushTargets.map((preference) => ({
        type: preference.type,
        inAppEnabled: preference.inAppEnabled,
        pushEnabled: true,
      })),
    });
  };

  const content = getPushDeviceCardContent(pushSubscription.deviceState);

  return (
    <GroupedList data-testid="grouped-list">
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            content.tone === "success"
              ? "bg-green-50 text-green-700"
              : content.tone === "warning"
                ? "bg-amber-50 text-amber-700"
                : "bg-gray-100 text-gray-600",
          )}
        >
          {content.icon === "bell-off" ? (
            <BellOff className="size-5" />
          ) : content.icon === "smartphone" ? (
            <Smartphone className="size-5" />
          ) : (
            <Bell className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{content.title}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {content.description}
              </p>
            </div>
            {content.action === "subscribe" && (
              <Button
                type="button"
                size="sm"
                disabled={pushSubscription.isPending}
                onClick={() => pushSubscription.subscribe()}
                className="shrink-0"
              >
                {pushSubscription.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                이 기기에서 받기
              </Button>
            )}
            {content.action === "unsubscribe" && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pushSubscription.isPending}
                onClick={() => pushSubscription.unsubscribe()}
                className="shrink-0"
              >
                {pushSubscription.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                이 기기 해제
              </Button>
            )}
          </div>

          {canOfferImportantPush && (
            <div className="mt-4 rounded-xl bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">
                중요한 협업 알림을 Push로 받을까요?
              </p>
              <p className="mt-1 text-sm text-gray-500">
                요청, 처리 결과, 공유 기록 수정/삭제 알림만 켭니다.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={updatePreferencesBatch.isPending}
                onClick={handleEnableImportantPush}
                className="mt-3"
              >
                {updatePreferencesBatch.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                주요 알림 Push 켜기
              </Button>
            </div>
          )}
        </div>
      </div>
    </GroupedList>
  );
}

function getPushDeviceCardContent(
  state: ReturnType<typeof usePushSubscription>["deviceState"],
): {
  title: string;
  description: string;
  icon: "bell" | "bell-off" | "smartphone";
  tone: "neutral" | "success" | "warning";
  action: "subscribe" | "unsubscribe" | null;
} {
  switch (state) {
    case "checking":
      return {
        title: "이 기기의 Push 상태를 확인하고 있어요",
        description: "브라우저 알림 권한과 기기 구독 상태를 확인합니다.",
        icon: "smartphone",
        tone: "neutral",
        action: null,
      };
    case "subscribed":
      return {
        title: "이 기기에서 Push를 받을 수 있어요",
        description: "아래에서 어떤 알림을 Push로 받을지 선택하세요.",
        icon: "bell",
        tone: "success",
        action: "unsubscribe",
      };
    case "blocked":
      return {
        title: "브라우저에서 알림이 차단되어 있어요",
        description:
          "브라우저 또는 OS 설정에서 oat 알림을 허용한 뒤 다시 시도하세요.",
        icon: "bell-off",
        tone: "warning",
        action: null,
      };
    case "unsupported":
      return {
        title: "이 브라우저에서는 Push 알림을 사용할 수 없어요",
        description: "다른 브라우저나 설치된 PWA에서 다시 확인하세요.",
        icon: "bell-off",
        tone: "neutral",
        action: null,
      };
    case "server_unavailable":
      return {
        title: "현재 Push 알림을 사용할 수 없어요",
        description: "잠시 후 다시 시도하세요.",
        icon: "bell-off",
        tone: "warning",
        action: null,
      };
    case "error":
      return {
        title: "Push 상태를 확인하지 못했어요",
        description: "네트워크 상태를 확인한 뒤 다시 시도하세요.",
        icon: "bell-off",
        tone: "warning",
        action: null,
      };
    default:
      return {
        title: "이 기기에서 Push 알림 받기",
        description:
          "권한을 허용하면 중요한 협업 알림을 놓치지 않을 수 있어요.",
        icon: "smartphone",
        tone: "neutral",
        action: "subscribe",
      };
  }
}

function PreferenceRow({
  preference,
  isPushSubscribed,
}: {
  preference: NotificationPreferenceView;
  isPushSubscribed: boolean;
}) {
  const updatePreference = useUpdateNotificationPreference();

  const handleToggle = (field: "inAppEnabled" | "pushEnabled") => {
    const nextInAppEnabled =
      field === "inAppEnabled"
        ? !preference.inAppEnabled
        : preference.inAppEnabled;
    const nextPushEnabled =
      field === "pushEnabled"
        ? !preference.pushEnabled
        : preference.pushEnabled;

    updatePreference.mutate({
      type: preference.type,
      input: {
        inAppEnabled: nextInAppEnabled,
        pushEnabled: nextInAppEnabled ? nextPushEnabled : false,
      },
    });
  };

  const pushDisabled =
    updatePreference.isPending || !preference.inAppEnabled || !isPushSubscribed;
  const helperText = !preference.inAppEnabled
    ? "앱 알림을 켜야 Push를 받을 수 있어요."
    : !isPushSubscribed
      ? "상단에서 이 기기 Push를 먼저 켜세요."
      : null;

  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{preference.label}</p>
        <p className="mt-1 text-sm text-gray-500">{preference.description}</p>
        {helperText && (
          <p className="mt-2 text-xs text-gray-400">{helperText}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ToggleButton
          label="앱"
          enabled={preference.inAppEnabled}
          disabled={updatePreference.isPending}
          pending={updatePreference.isPending}
          onClick={() => handleToggle("inAppEnabled")}
        />
        <ToggleButton
          label="Push"
          enabled={preference.pushEnabled}
          disabled={pushDisabled}
          pending={updatePreference.isPending}
          onClick={() => handleToggle("pushEnabled")}
        />
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  enabled,
  disabled,
  pending,
  onClick,
}: {
  label: string;
  enabled: boolean;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-16 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors disabled:opacity-60",
        enabled ? "bg-primary text-white" : "bg-gray-100 text-gray-500",
      )}
    >
      {pending && <Loader2 className="size-3 animate-spin" />}
      {label}
    </button>
  );
}
