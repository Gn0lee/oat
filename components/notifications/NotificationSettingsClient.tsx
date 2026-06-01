"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/hooks/use-notification-preferences";
import {
  NOTIFICATION_PREFERENCE_GROUP_LABELS,
  type NotificationPreferenceView,
} from "@/lib/notifications/defaults";
import { cn } from "@/lib/utils/cn";

export function NotificationSettingsClient() {
  const { data: preferences = [], isLoading } = useNotificationPreferences();

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
          알림 종류별 앱 내 알림과 Push 수신 여부를 설정합니다.
        </p>
        <p className="mt-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-500">
          Push 발송은 이후 지원됩니다. 지금은 선호 설정만 저장합니다.
        </p>
      </div>

      {Object.entries(NOTIFICATION_PREFERENCE_GROUP_LABELS).map(
        ([group, label]) => {
          const items =
            groups[group as NotificationPreferenceView["group"]] ?? [];

          if (items.length === 0) {
            return null;
          }

          return (
            <section key={group} className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-gray-700">
                {label}
              </h2>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {items.map((preference, index) => (
                  <PreferenceRow
                    key={preference.type}
                    preference={preference}
                    showBorder={index > 0}
                  />
                ))}
              </div>
            </section>
          );
        },
      )}
    </div>
  );
}

function PreferenceRow({
  preference,
  showBorder,
}: {
  preference: NotificationPreferenceView;
  showBorder: boolean;
}) {
  const updatePreference = useUpdateNotificationPreference();

  const handleToggle = (field: "inAppEnabled" | "pushEnabled") => {
    updatePreference.mutate({
      type: preference.type,
      input: {
        inAppEnabled:
          field === "inAppEnabled"
            ? !preference.inAppEnabled
            : preference.inAppEnabled,
        pushEnabled:
          field === "pushEnabled"
            ? !preference.pushEnabled
            : preference.pushEnabled,
      },
    });
  };

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 p-4",
        showBorder && "border-gray-100 border-t",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{preference.label}</p>
        <p className="mt-1 text-sm text-gray-500">{preference.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <ToggleButton
          label="앱"
          enabled={preference.inAppEnabled}
          disabled={updatePreference.isPending}
          onClick={() => handleToggle("inAppEnabled")}
        />
        <ToggleButton
          label="Push"
          enabled={preference.pushEnabled}
          disabled={updatePreference.isPending}
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
  onClick,
}: {
  label: string;
  enabled: boolean;
  disabled: boolean;
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
      {disabled && <Loader2 className="size-3 animate-spin" />}
      {label}
    </button>
  );
}
