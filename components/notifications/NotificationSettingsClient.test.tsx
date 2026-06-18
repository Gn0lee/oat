import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  useUpdateNotificationPreferencesBatch,
} from "@/hooks/use-notification-preferences";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { NotificationSettingsClient } from "./NotificationSettingsClient";

vi.mock("@/hooks/use-notification-preferences", () => ({
  useNotificationPreferences: vi.fn(),
  useUpdateNotificationPreference: vi.fn(),
  useUpdateNotificationPreferencesBatch: vi.fn(),
}));

vi.mock("@/hooks/use-push-subscription", () => ({
  usePushSubscription: vi.fn(),
}));

const mockPreferences = [
  {
    type: "ledger_record_change_request",
    label: "가계부 수정/삭제 요청",
    description: "공용 가계부 기록에 대한 수정 또는 삭제 요청",
    group: "requests",
    inAppEnabled: true,
    pushEnabled: true,
  },
  {
    type: "ledger_record_changed",
    label: "가계부 기록 수정/삭제",
    description: "함께 보는 가계부 기록이 수정되거나 삭제됨",
    group: "changes",
    inAppEnabled: false,
    pushEnabled: false,
  },
  {
    type: "invitation_accepted",
    label: "초대 수락",
    description: "초대받은 사용자가 가구에 합류함",
    group: "household",
    inAppEnabled: true,
    pushEnabled: false,
  },
];

describe("NotificationSettingsClient", () => {
  it("renders Push device state and grouped preference switches without card-only structure", () => {
    vi.mocked(useNotificationPreferences).mockReturnValue({
      data: mockPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useNotificationPreferences>);

    vi.mocked(usePushSubscription).mockReturnValue({
      deviceState: "subscribed",
      isSubscribed: true,
      isPending: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    } as unknown as ReturnType<typeof usePushSubscription>);

    vi.mocked(useUpdateNotificationPreference).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateNotificationPreference>);

    vi.mocked(useUpdateNotificationPreferencesBatch).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateNotificationPreferencesBatch>);

    render(<NotificationSettingsClient />);

    // 1. Push state title is visible for subscribed.
    expect(
      screen.getByText("이 기기에서 Push를 받을 수 있어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("알림 종류별 앱 내 알림과 Push 수신 여부를 설정합니다."),
    ).toBeInTheDocument();

    // 2. Preference labels from at least two groups are visible.
    expect(screen.getByText("가계부 수정/삭제 요청")).toBeInTheDocument();
    expect(screen.getByText("초대 수락")).toBeInTheDocument();

    // 3. Switch buttons named 앱 and Push are rendered with role="switch".
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
    expect(screen.getAllByText("앱").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Push").length).toBeGreaterThan(0);

    // 4. Assert grouped list semantics or custom data-testid
    // We expect GroupedList to be used. Let's look for components using data-testid="grouped-list" which will fail now.
    const groupedLists = screen.getAllByTestId("grouped-list");
    expect(groupedLists.length).toBeGreaterThan(0);
  });

  it("shows disabled Push reason when in-app is off or device is not subscribed", () => {
    vi.mocked(useNotificationPreferences).mockReturnValue({
      data: mockPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useNotificationPreferences>);

    vi.mocked(usePushSubscription).mockReturnValue({
      deviceState: "unsupported",
      isSubscribed: false,
      isPending: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    } as unknown as ReturnType<typeof usePushSubscription>);

    vi.mocked(useUpdateNotificationPreference).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateNotificationPreference>);

    vi.mocked(useUpdateNotificationPreferencesBatch).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateNotificationPreferencesBatch>);

    render(<NotificationSettingsClient />);

    // In-app disabled row ("기록 변경 완료" has inAppEnabled: false) shows:
    expect(
      screen.getByText("앱 알림을 켜야 Push를 받을 수 있어요."),
    ).toBeInTheDocument();

    // Unsubscribed device ("기록 변경 요청" has inAppEnabled: true, but device is unsubscribed):
    expect(
      screen.getAllByText("상단에서 이 기기 Push를 먼저 켜세요.").length,
    ).toBeGreaterThan(0);
  });

  it("shows blocked message when device state is blocked", () => {
    vi.mocked(useNotificationPreferences).mockReturnValue({
      data: mockPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useNotificationPreferences>);

    vi.mocked(usePushSubscription).mockReturnValue({
      deviceState: "blocked",
      isSubscribed: false,
      isPending: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    } as unknown as ReturnType<typeof usePushSubscription>);

    vi.mocked(useUpdateNotificationPreference).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateNotificationPreference>);

    vi.mocked(useUpdateNotificationPreferencesBatch).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateNotificationPreferencesBatch>);

    render(<NotificationSettingsClient />);

    expect(
      screen.queryByText(
        "브라우저 또는 OS 설정에서 oat 알림을 허용한 뒤 다시 시도하세요.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps toggle buttons clean of inline loader spinners even when mutation is pending", () => {
    vi.mocked(useNotificationPreferences).mockReturnValue({
      data: mockPreferences,
      isLoading: false,
    } as unknown as ReturnType<typeof useNotificationPreferences>);

    vi.mocked(usePushSubscription).mockReturnValue({
      deviceState: "subscribed",
      isSubscribed: true,
      isPending: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    } as unknown as ReturnType<typeof usePushSubscription>);

    vi.mocked(useUpdateNotificationPreference).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useUpdateNotificationPreference>);

    vi.mocked(useUpdateNotificationPreferencesBatch).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateNotificationPreferencesBatch>);

    render(<NotificationSettingsClient />);

    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
    for (const toggle of switches) {
      expect(toggle).toBeDisabled();
      expect(toggle.querySelector("svg")).not.toBeInTheDocument();
    }
  });
});
