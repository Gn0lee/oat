import { createQueryKeyStore } from "@lukemorales/query-key-factory";

export const queries = createQueryKeyStore({
  auth: {
    user: null,
  },

  holdings: {
    all: null,
    list: null,
    detail: (id: string) => ({ queryKey: [id] }),
  },

  transactions: {
    all: null,
    list: (filters?: { memberId?: string; stockSymbol?: string }) => ({
      queryKey: [filters],
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
    byRisk: null,
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
});
