import { createQueryKeyStore } from "@lukemorales/query-key-factory";
import type { StatsScope } from "@/lib/api/ledger-stats";

export const queries = createQueryKeyStore({
  auth: {
    user: null,
  },

  accounts: {
    all: null,
    list: null,
  },

  paymentMethods: {
    all: null,
    list: null,
  },

  holdings: {
    all: null,
    list: null,
    detail: (id: string) => ({ queryKey: [id] }),
  },

  transactions: {
    all: null,
    list: (params?: {
      filters?: {
        type?: "buy" | "sell";
        ownerId?: string;
        ticker?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
      };
      page?: number;
      pageSize?: number;
    }) => ({
      queryKey: [params],
    }),
    detail: (id: string) => ({ queryKey: [id] }),
  },

  stocks: {
    all: null,
    search: (query: string) => ({ queryKey: [query] }),
    price: (symbol: string) => ({ queryKey: [symbol] }),
    prices: (symbols: string[]) => ({ queryKey: [symbols] }),
    analysis: null,
  },

  exchange: {
    all: null,
    rate: (from: string, to: string) => ({ queryKey: [from, to] }),
  },

  dashboard: {
    all: null,
    summary: null,
    byOwner: null,
    byRisk: null,
  },

  marketTrend: {
    all: null,
    domestic: null,
    overseas: null,
    overseasNews: null,
    holiday: null,
  },

  categories: {
    all: null,
    list: (type?: "expense" | "income") => ({ queryKey: [type] }),
  },

  ledgerEntries: {
    all: null,
    list: (params?: { year?: number; month?: number; date?: string }) => ({
      queryKey: [params],
    }),
    summary: (year: number, month: number) => ({ queryKey: [year, month] }),
  },

  household: {
    all: null,
    members: null,
    settings: null,
    stockSettings: (symbol?: string) => ({ queryKey: [symbol] }),
  },

  stockSettings: {
    all: null,
    list: (params?: {
      filters?: {
        assetType?: string;
        riskLevel?: string;
        market?: string;
      };
      page?: number;
      pageSize?: number;
    }) => ({
      queryKey: [params],
    }),
    detail: (id: string) => ({ queryKey: [id] }),
  },

  ledgerStats: {
    all: null,
    summary: (year: number, month: number) => ({ queryKey: [year, month] }),
    byMember: (year: number, month: number) => ({ queryKey: [year, month] }),
    byCategory: (
      year: number,
      month: number,
      type: "expense" | "income",
      scope: StatsScope,
    ) => ({ queryKey: [year, month, type, scope] }),
    byPaymentMethod: (year: number, month: number, scope: StatsScope) => ({
      queryKey: [year, month, scope],
    }),
    trend: (months: number, scope?: string) => ({ queryKey: [months, scope] }),
    daily: (year: number, month: number, scope: StatsScope) => ({
      queryKey: [year, month, scope],
    }),
  },
});
