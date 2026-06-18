import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { NotificationInboxClient } from "./NotificationInboxClient";

vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: vi.fn(),
  useMarkNotificationAsRead: vi.fn(),
  useMarkAllNotificationsAsRead: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

const mockNotificationsPage = {
  pages: [
    {
      items: [
        {
          id: "noti-1",
          title: "새 기록 요청",
          body: "홍길동님이 수정을 요청했습니다.",
          type: "ledger_record_change_request",
          readAt: null,
          createdAt: "2026-06-16T12:00:00Z",
          linkKind: "record_change_request_detail",
          linkParams: { requestId: "req-1" },
        },
        {
          id: "noti-2",
          title: "기록 변경 알림",
          body: "기록이 변경되었습니다.",
          type: "ledger_record_changed",
          readAt: "2026-06-16T13:00:00Z",
          createdAt: "2026-06-16T13:00:00Z",
          linkKind: "ledger_record_detail",
          linkParams: { entryId: "ledger-1" },
        },
      ],
      nextCursor: null,
    },
  ],
};

describe("NotificationInboxClient", () => {
  it("renders notifications as navigable list rows with unread affordances", () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: mockNotificationsPage,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    } as any);

    vi.mocked(useMarkNotificationAsRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useMarkAllNotificationsAsRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(<NotificationInboxClient />);

    // 1. A notification link points to the href produced by buildNotificationHref.
    const link = screen.getByRole("link", { name: /새 기록 요청/ });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/notifications/requests/req-1");

    // 2. Unread notification has a visible "읽음" button.
    const markReadButton = screen.getByRole("button", { name: "읽음" });
    expect(markReadButton).toBeInTheDocument();

    // 3. The "전체 읽음" button is enabled when at least one notification is unread.
    const markAllReadButton = screen.getByRole("button", { name: /전체 읽음/ });
    expect(markAllReadButton).toBeInTheDocument();
    expect(markAllReadButton).not.toBeDisabled();

    // 4. Notification body and type label are visible.
    expect(
      screen.getByText("홍길동님이 수정을 요청했습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("가계부 수정/삭제 요청")).toBeInTheDocument();

    // 5. GroupedList should be used for the list of notifications.
    const groupedList = screen.getByTestId("grouped-list");
    expect(groupedList).toBeInTheDocument();
  });

  it("keeps pagination action visible and disabled while fetching", () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: mockNotificationsPage,
      isLoading: false,
      isFetchingNextPage: true,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
    } as any);

    vi.mocked(useMarkNotificationAsRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useMarkAllNotificationsAsRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(<NotificationInboxClient />);

    const moreButton = screen.getByRole("button", { name: /더 보기/ });
    expect(moreButton).toBeInTheDocument();
    expect(moreButton).toBeDisabled();
  });
});
