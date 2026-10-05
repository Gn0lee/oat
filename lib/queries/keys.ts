import { createQueryKeyStore } from "@lukemorales/query-key-factory";

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
    list: (type?: "expense" | "income", parentId?: string) => ({
      queryKey: [type, parentId],
    }),
  },

  ledgerEntries: {
    all: null,
    detail: (id: string) => ({ queryKey: [id] }),
    list: (params?: {
      bookId?: string;
      userId?: string | null;
      householdId?: string | null;
      year?: number;
      month?: number;
      date?: string;
      categoryId?: string | null;
      childCategoryId?: string | null;
      categoryBreakdown?: string;
      type?: string;
      paymentMethodId?: string;
    }) => ({
      queryKey: [params],
    }),
    search: (params: {
      query: string;
      bookId?: string;
      userId: string | null;
      householdId: string | null;
    }) => ({
      queryKey: [params],
    }),
    summary: (year: number, month: number) => ({
      queryKey: [year, month],
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
    query: (params: {
      name: string;
      params: Record<string, string | number | null | undefined>;
      userId: string | null;
      householdId: string | null;
    }) => ({ queryKey: [params] }),
  },
  ledgerTags: {
    all: null,
    list: null,
  },
});
