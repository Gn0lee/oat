import { describe, expect, it, vi } from "vitest";
import { markNotificationsAsReadForLink } from "./notifications";

function createNotificationReadSupabaseMock() {
  const builder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({
      data: [{ id: "notification-1" }, { id: "notification-2" }],
      error: null,
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table !== "notifications") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return builder;
    }),
    builder,
  };
}

describe("notification read helpers", () => {
  it("marks unread notifications for the visited link target as read", async () => {
    const supabase = createNotificationReadSupabaseMock();

    const count = await markNotificationsAsReadForLink(
      supabase as never,
      "user-1",
      {
        kind: "ledger_record_date",
        params: { date: "2026-06-16" },
      },
    );

    expect(count).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith("notifications");
    expect(supabase.builder.update).toHaveBeenCalledWith({
      read_at: expect.any(String),
    });
    expect(supabase.builder.eq).toHaveBeenCalledWith("recipient_id", "user-1");
    expect(supabase.builder.eq).toHaveBeenCalledWith(
      "link_kind",
      "ledger_record_date",
    );
    expect(supabase.builder.is).toHaveBeenCalledWith("read_at", null);
    expect(supabase.builder.contains).toHaveBeenCalledWith("link_params", {
      date: "2026-06-16",
    });
    expect(supabase.builder.select).toHaveBeenCalledWith("id");
  });

  it("uses an empty params object for parameterless notification links", async () => {
    const supabase = createNotificationReadSupabaseMock();

    await markNotificationsAsReadForLink(supabase as never, "user-1", {
      kind: "household_settings",
    });

    expect(supabase.builder.contains).toHaveBeenCalledWith("link_params", {});
  });
});
