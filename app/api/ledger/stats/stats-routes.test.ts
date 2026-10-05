import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import * as stats from "@/lib/api/ledger-stats";
import { createClient } from "@/lib/supabase/server";
import { GET as byCategory } from "./by-category/route";
import { GET as byMember } from "./by-member/route";
import { GET as byPaymentMethod } from "./by-payment-method/route";
import { GET as daily } from "./daily/route";
import { GET as details } from "./details/route";
import { GET as summary } from "./summary/route";
import { GET as trend } from "./trend/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/api/invitation", () => ({ getUserHouseholdId: vi.fn() }));
vi.mock("@/lib/api/ledger-stats", () => ({
  getLedgerStatsSummary: vi.fn(),
  getLedgerStatsByMember: vi.fn(),
  getLedgerStatsByCategory: vi.fn(),
  getLedgerStatsByPaymentMethod: vi.fn(),
  getLedgerStatsTrend: vi.fn(),
  getLedgerStatsDaily: vi.fn(),
  getLedgerStatsDetail: vi.fn(),
}));

const BOOK = "00000000-0000-4000-8000-000000000001";
const client = { auth: { getUser: vi.fn() } };

const routes = [
  {
    name: "summary",
    handler: summary,
    lib: stats.getLedgerStatsSummary,
    query: "year=2026&month=10",
    expected: [client, "household-id", { year: 2026, month: 10, bookId: BOOK }],
  },
  {
    name: "by-member",
    handler: byMember,
    lib: stats.getLedgerStatsByMember,
    query: "year=2026&month=10",
    expected: [
      client,
      "household-id",
      "user-id",
      { year: 2026, month: 10, bookId: BOOK },
    ],
  },
  {
    name: "by-category",
    handler: byCategory,
    lib: stats.getLedgerStatsByCategory,
    query: "year=2026&month=10&type=income",
    expected: [
      client,
      "household-id",
      { year: 2026, month: 10, type: "income", bookId: BOOK },
    ],
  },
  {
    name: "by-payment-method",
    handler: byPaymentMethod,
    lib: stats.getLedgerStatsByPaymentMethod,
    query: "year=2026&month=10",
    expected: [client, "household-id", { year: 2026, month: 10, bookId: BOOK }],
  },
  {
    name: "trend",
    handler: trend,
    lib: stats.getLedgerStatsTrend,
    query: "months=3",
    expected: [client, "household-id", { months: 3, bookId: BOOK }],
  },
  {
    name: "daily",
    handler: daily,
    lib: stats.getLedgerStatsDaily,
    query: "year=2026&month=10",
    expected: [client, "household-id", { year: 2026, month: 10, bookId: BOOK }],
  },
  {
    name: "details",
    handler: details,
    lib: stats.getLedgerStatsDetail,
    query: "kind=payment-method&year=2026&month=10&paymentMethodId=__none__",
    expected: [
      client,
      "household-id",
      expect.objectContaining({
        kind: "payment-method",
        year: 2026,
        month: 10,
        paymentMethodId: "__none__",
        bookId: BOOK,
      }),
    ],
  },
] as const;

function request(route: string, query: string) {
  return new NextRequest(`http://localhost/api/ledger/stats/${route}?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  client.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-id" } },
    error: null,
  });
  vi.mocked(createClient).mockResolvedValue(client as never);
  vi.mocked(getUserHouseholdId).mockResolvedValue("household-id");
  for (const route of routes)
    vi.mocked(route.lib).mockResolvedValue({} as never);
});

describe.each(routes)("GET /api/ledger/stats/$name", (route) => {
  it("passes the selected book to the shared stats query", async () => {
    const response = await route.handler(
      request(route.name, `${route.query}&book=${BOOK}`),
    );

    expect(response.status).toBe(200);
    expect(route.lib).toHaveBeenCalledWith(...route.expected);
  });

  it("returns the same 404 for a book the user cannot see", async () => {
    vi.mocked(route.lib).mockRejectedValue(
      new APIError("BOOK_UNAVAILABLE", "장부를 사용할 수 없습니다.", 404),
    );

    const response = await route.handler(
      request(route.name, `${route.query}&book=${BOOK}`),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BOOK_UNAVAILABLE" },
    });
  });

  it("rejects a malformed book before querying", async () => {
    const response = await route.handler(
      request(route.name, `${route.query}&book=nope`),
    );

    expect(response.status).toBe(400);
    expect(route.lib).not.toHaveBeenCalled();
  });

  it("requires login", async () => {
    client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await route.handler(request(route.name, route.query));

    expect(response.status).toBe(401);
  });
});

describe("period validation", () => {
  it.each([
    ["summary", summary],
    ["daily", daily],
  ] as const)("%s rejects an invalid month", async (name, handler) => {
    const response = await handler(request(name, "year=2026&month=13"));

    expect(response.status).toBe(400);
  });

  it("details rejects an invalid day", async () => {
    const response = await details(
      request("details", "kind=daily&date=2026-02-30"),
    );

    expect(response.status).toBe(400);
    expect(stats.getLedgerStatsDetail).not.toHaveBeenCalled();
  });
});
