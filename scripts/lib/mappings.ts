import type { Database } from "../../types/supabase";

type StockTypeCategory = Database["public"]["Enums"]["stock_type_category"];

interface StockTypeMapping {
  name: string;
  category: StockTypeCategory;
}

// 국내 그룹코드 매핑
export const KR_STOCK_TYPE_MAPPINGS: Record<string, StockTypeMapping> = {
  ST: { name: "주권", category: "stock" },
  MF: { name: "증권투자회사", category: "fund" },
  RT: { name: "부동산투자회사", category: "reit" },
  SC: { name: "선박투자회사", category: "fund" },
  IF: { name: "사회간접자본투융자회사", category: "fund" },
  DR: { name: "주식예탁증서", category: "stock" },
  SW: { name: "신주인수권증권", category: "warrant" },
  SR: { name: "신주인수권증서", category: "warrant" },
  EW: { name: "주식워런트증권", category: "warrant" },
  PF: { name: "수익증권", category: "fund" },
  EF: { name: "ETF", category: "etf" },
  EN: { name: "ETN", category: "etn" },
  BC: { name: "수익증권", category: "fund" },
  FE: { name: "해외ETF", category: "etf" },
  FS: { name: "외국주권", category: "stock" },
};

// 해외 증권유형 매핑
export const US_STOCK_TYPE_MAPPINGS: Record<string, StockTypeMapping> = {
  "1": { name: "지수", category: "index" },
  "2": { name: "주식", category: "stock" },
  "3": { name: "ETF", category: "etf" },
  "4": { name: "워런트", category: "warrant" },
};
