import type { Database } from "../../types/supabase";

export type StockInsert =
  Database["public"]["Tables"]["stock_master"]["Insert"];

export type ExchangeType = Database["public"]["Enums"]["exchange_type"];

export interface ParsedStock {
  code: string;
  name: string;
  name_en: string | null;
  choseong: string | null;
  market: "KR" | "US";
  exchange: ExchangeType;
  stock_type_code: string | null;
  stock_type_name: string | null;
  stock_type_category:
    | Database["public"]["Enums"]["stock_type_category"]
    | null;
  is_active: boolean;
  is_suspended: boolean;
}
