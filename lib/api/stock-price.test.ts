import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDomesticMultiPrice, getOverseasPrice } from "@/lib/kis/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStockPrices } from "./stock-price";

vi.mock("@/lib/kis/client", () => ({
  MAX_MULTI_STOCKS: 30,
  getDomesticMultiPrice: vi.fn(),
  getExchangeCode: vi.fn((exchange: string) => exchange),
  getOverseasPrice: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const mockedGetDomesticMultiPrice = vi.mocked(getDomesticMultiPrice);
const mockedGetOverseasPrice = vi.mocked(getOverseasPrice);
const mockedCreateAdminClient = vi.mocked(createAdminClient);

type StockPriceRow = {
  market: "KR" | "US";
  code: string;
  price: number;
  change_rate: number | null;
  fetched_at: string;
};

function createSupabaseMock(cacheRows: StockPriceRow[] = []) {
  return {
    from: vi.fn((table: string) => {
      if (table === "stock_prices") {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          in: vi.fn((_column: string, codes: string[]) =>
            Promise.resolve({
              data: cacheRows.filter((row) => codes.includes(row.code)),
              error: null,
            }),
          ),
        };
        return query;
      }

      if (table === "stock_master") {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          in: vi.fn((_column: string, codes: string[]) =>
            Promise.resolve({
              data: codes.map((code) => ({ code, exchange: "NAS" })),
              error: null,
            }),
          ),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

function createAdminMock() {
  const upsert = vi.fn(() => Promise.resolve({ error: null }));
  const admin = {
    from: vi.fn(() => ({
      upsert,
    })),
  };
  mockedCreateAdminClient.mockReturnValue(admin as never);
  return { admin, upsert };
}

describe("getStockPrices", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.setSystemTime(new Date("2026-05-23T03:15:00.000Z"));
    createAdminMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fresh cached prices return with fresh status and skip KIS fetch", async () => {
    const supabase = createSupabaseMock([
      {
        market: "KR",
        code: "005930",
        price: 75_000,
        change_rate: 1.2,
        fetched_at: "2026-05-23T03:05:00.000Z",
      },
    ]);

    const result = await getStockPrices(supabase as never, [
      { market: "KR", code: "005930" },
    ]);

    expect(result["KR:005930"]).toMatchObject({
      market: "KR",
      code: "005930",
      price: 75_000,
      changeRate: 1.2,
      status: "fresh",
    });
    expect(mockedGetDomesticMultiPrice).not.toHaveBeenCalled();
    expect(mockedGetOverseasPrice).not.toHaveBeenCalled();
  });

  it("expired cached price returns with stale status when refresh fails", async () => {
    mockedGetDomesticMultiPrice.mockRejectedValue(new Error("KIS unavailable"));
    const supabase = createSupabaseMock([
      {
        market: "KR",
        code: "005930",
        price: 74_000,
        change_rate: -0.3,
        fetched_at: "2026-05-23T01:05:00.000Z",
      },
    ]);

    const result = await getStockPrices(supabase as never, [
      { market: "KR", code: "005930" },
    ]);

    expect(result["KR:005930"]).toMatchObject({
      market: "KR",
      code: "005930",
      price: 74_000,
      changeRate: -0.3,
      status: "stale",
    });
    expect(mockedGetDomesticMultiPrice).toHaveBeenCalledWith(["005930"]);
  });

  it("omits the key when no cached row exists and refresh fails", async () => {
    mockedGetDomesticMultiPrice.mockRejectedValue(new Error("KIS unavailable"));
    const supabase = createSupabaseMock();

    const result = await getStockPrices(supabase as never, [
      { market: "KR", code: "005930" },
    ]);

    expect(result).not.toHaveProperty("KR:005930");
  });

  it("refresh success replaces stale cached row with fresh price", async () => {
    mockedGetDomesticMultiPrice.mockResolvedValue([
      {
        inter_shrn_iscd: "005930",
        inter_kor_isnm: "삼성전자",
        inter2_prpr: "76000",
        inter2_prdy_vrss: "1000",
        prdy_vrss_sign: "2",
        prdy_ctrt: "1.5",
        acml_vol: "100",
        inter2_oprc: "75000",
        inter2_hgpr: "77000",
        inter2_lwpr: "74000",
        acml_tr_pbmn: "1000000",
      },
    ]);
    const { upsert } = createAdminMock();
    const supabase = createSupabaseMock([
      {
        market: "KR",
        code: "005930",
        price: 74_000,
        change_rate: -0.3,
        fetched_at: "2026-05-23T01:05:00.000Z",
      },
    ]);

    const result = await getStockPrices(supabase as never, [
      { market: "KR", code: "005930" },
    ]);

    expect(result["KR:005930"]).toMatchObject({
      market: "KR",
      code: "005930",
      price: 76_000,
      changeRate: 1.5,
      status: "fresh",
    });
    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          market: "KR",
          code: "005930",
          price: 76_000,
        }),
      ],
      { onConflict: "market,code" },
    );
  });

  it("refresh timeout returns stale fallback", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-23T03:15:00.000Z"));
    mockedGetDomesticMultiPrice.mockReturnValue(new Promise(() => {}) as never);
    const supabase = createSupabaseMock([
      {
        market: "KR",
        code: "005930",
        price: 74_000,
        change_rate: -0.3,
        fetched_at: "2026-05-23T01:05:00.000Z",
      },
    ]);

    const pricesPromise = getStockPrices(supabase as never, [
      { market: "KR", code: "005930" },
    ]);
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(pricesPromise).resolves.toMatchObject({
      "KR:005930": {
        market: "KR",
        code: "005930",
        price: 74_000,
        changeRate: -0.3,
        status: "stale",
      },
    });
  });
});
