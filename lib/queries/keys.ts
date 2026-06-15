import { createQueryKeyStore } from "@lukemorales/query-key-factory";
import type { StatsScope } from "@/lib/api/ledger-stats";

export const queries = createQueryKeyStore({
  auth: {
    user: null,
  },

  accounts: {
    all: null,
    list: null,
    detail: (id: string) => ({ queryKey: [id] }),
  },

  home: {
    summary: (params?: { year?: number; month?: number }) => ({
      queryKey: [params],
    }),
  },

  assets: {
    summary: null,
  },

  paymentMethods: {
    all: null,
    list: null,
    detail: (id: string) => ({ queryKey: [id] }),
  },

  holdings: {
    all: null,
    list: (params?: {
      filters?: {
        ownerId?: string;
        assetType?: string;
        market?: string;
        accountId?: string;
        search?: string;
      };
      page?: number;
      pageSize?: number;
    }) => ({
      queryKey: [params],
    }),
    detail: (id: string) => ({ queryKey: [id] }),
  },

  transactions: {
    all: null,
    list: (params?: {
      filters?: {
        type?: "buy" | "sell";
        ownerId?: string;
        accountId?: string;
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

  stockAnalysis: {
    all: null,
    overview: null,
    byOwner: null,
    byRisk: null,
  },

  exchange: {
    all: null,
    rate: (from: string, to: string) => ({ queryKey: [from, to] }),
  },

  dashboard: {
    all: null,
    summary: null,
  },

  marketTrend: {
    all: null,
    domestic: null,
    overseas: null,
    overseasNews: null,
    holiday: null,
  },

  notifications: {
    all: null,
    list: (params?: { limit?: number }) => ({ queryKey: [params] }),
    unreadCount: null,
    preferences: null,
    pushSubscription: (params?: { endpoint?: string | null }) => ({
      queryKey: [params],
    }),
  },

  recordChangeRequests: {
    all: null,
    detail: (id: string) => ({ queryKey: [id] }),
    list: (params?: { box?: "received" | "sent"; status?: string }) => ({
      queryKey: [params],
    }),
  },

  categories: {
    all: null,
    list: (type?: "expense" | "income") => ({ queryKey: [type] }),
  },

  ledgerEntries: {
    all: null,
    detail: (id: string) => ({ queryKey: [id] }),
    list: (params?: {
      year?: number;
      month?: number;
      date?: string;
      scope?: "shared" | "personal";
    }) => ({
      queryKey: [params],
    }),
    summary: (year: number, month: number, scope: "shared" | "personal") => ({
      queryKey: [year, month, scope],
    }),
    titles: (query: string) => ({ queryKey: [query] }),
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
    detail: (params?: {
      kind?: string;
      year?: number;
      month?: number;
      date?: string;
      type?: string;
      scope?: string;
      categoryId?: string | null;
      paymentMethodId?: string | null;
      limit?: number;
    }) => ({ queryKey: [params] }),
  },
});
