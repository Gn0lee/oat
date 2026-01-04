import type { SupabaseClient } from "@supabase/supabase-js";
import { sortStocksByRelevance } from "@/lib/utils/stock-search";
import type { Database, MarketType, StockMaster } from "@/types";

export interface SearchStocksParams {
  query: string;
  market?: MarketType;
  limit?: number;
}

/**
 * 종목 검색 (RPC 함수 호출 후 클라이언트 정렬)
 */
export async function searchStocks(
  supabase: SupabaseClient<Database>,
  params: SearchStocksParams,
): Promise<StockMaster[]> {
  const { query, market, limit = 50 } = params;

  if (!query.trim()) {
    return [];
  }

  const { data, error } = await supabase.rpc("search_stocks", {
    search_query: query,
    market_filter: market,
    result_limit: limit,
  });

  if (error) {
    throw error;
  }

  return sortStocksByRelevance(data ?? [], query);
}
