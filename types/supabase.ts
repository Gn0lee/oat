export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string | null;
          account_type: Database["public"]["Enums"]["account_type"] | null;
          broker: string | null;
          created_at: string;
          household_id: string;
          id: string;
          is_default: boolean | null;
          memo: string | null;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          account_number?: string | null;
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          broker?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          is_default?: boolean | null;
          memo?: string | null;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          account_number?: string | null;
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          broker?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          is_default?: boolean | null;
          memo?: string | null;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accounts_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exchange_rates: {
        Row: {
          from_currency: Database["public"]["Enums"]["currency_type"];
          rate: number;
          to_currency: Database["public"]["Enums"]["currency_type"];
          updated_at: string | null;
        };
        Insert: {
          from_currency: Database["public"]["Enums"]["currency_type"];
          rate: number;
          to_currency: Database["public"]["Enums"]["currency_type"];
          updated_at?: string | null;
        };
        Update: {
          from_currency?: Database["public"]["Enums"]["currency_type"];
          rate?: number;
          to_currency?: Database["public"]["Enums"]["currency_type"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      holding_tags: {
        Row: {
          created_at: string;
          household_id: string;
          owner_id: string;
          tag_id: string;
          ticker: string;
        };
        Insert: {
          created_at?: string;
          household_id: string;
          owner_id: string;
          tag_id: string;
          ticker: string;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          owner_id?: string;
          tag_id?: string;
          ticker?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holding_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      household_members: {
        Row: {
          household_id: string;
          joined_at: string;
          role: Database["public"]["Enums"]["household_role"];
          user_id: string;
        };
        Insert: {
          household_id: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["household_role"];
          user_id: string;
        };
        Update: {
          household_id?: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["household_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      household_stock_settings: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"];
          created_at: string;
          currency: Database["public"]["Enums"]["currency_type"];
          household_id: string;
          id: string;
          market: Database["public"]["Enums"]["market_type"];
          name: string;
          risk_level: Database["public"]["Enums"]["risk_level"] | null;
          ticker: string;
          updated_at: string;
        };
        Insert: {
          asset_type?: Database["public"]["Enums"]["asset_type"];
          created_at?: string;
          currency?: Database["public"]["Enums"]["currency_type"];
          household_id: string;
          id?: string;
          market?: Database["public"]["Enums"]["market_type"];
          name: string;
          risk_level?: Database["public"]["Enums"]["risk_level"] | null;
          ticker: string;
          updated_at?: string;
        };
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"];
          created_at?: string;
          currency?: Database["public"]["Enums"]["currency_type"];
          household_id?: string;
          id?: string;
          market?: Database["public"]["Enums"]["market_type"];
          name?: string;
          risk_level?: Database["public"]["Enums"]["risk_level"] | null;
          ticker?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_stock_settings_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          created_at: string;
          created_by: string;
          email: string;
          expires_at: string;
          household_id: string;
          id: string;
          status: Database["public"]["Enums"]["invitation_status"] | null;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          email: string;
          expires_at: string;
          household_id: string;
          id?: string;
          status?: Database["public"]["Enums"]["invitation_status"] | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          email?: string;
          expires_at?: string;
          household_id?: string;
          id?: string;
          status?: Database["public"]["Enums"]["invitation_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          name: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_master: {
        Row: {
          choseong: string | null;
          code: string;
          exchange: Database["public"]["Enums"]["exchange_type"];
          id: string;
          is_active: boolean | null;
          is_suspended: boolean | null;
          market: Database["public"]["Enums"]["market_type"];
          name: string;
          name_en: string | null;
          stock_type_category:
            | Database["public"]["Enums"]["stock_type_category"]
            | null;
          stock_type_code: string | null;
          stock_type_name: string | null;
          synced_at: string | null;
        };
        Insert: {
          choseong?: string | null;
          code: string;
          exchange: Database["public"]["Enums"]["exchange_type"];
          id?: string;
          is_active?: boolean | null;
          is_suspended?: boolean | null;
          market: Database["public"]["Enums"]["market_type"];
          name: string;
          name_en?: string | null;
          stock_type_category?:
            | Database["public"]["Enums"]["stock_type_category"]
            | null;
          stock_type_code?: string | null;
          stock_type_name?: string | null;
          synced_at?: string | null;
        };
        Update: {
          choseong?: string | null;
          code?: string;
          exchange?: Database["public"]["Enums"]["exchange_type"];
          id?: string;
          is_active?: boolean | null;
          is_suspended?: boolean | null;
          market?: Database["public"]["Enums"]["market_type"];
          name?: string;
          name_en?: string | null;
          stock_type_category?:
            | Database["public"]["Enums"]["stock_type_category"]
            | null;
          stock_type_code?: string | null;
          stock_type_name?: string | null;
          synced_at?: string | null;
        };
        Relationships: [];
      };
      stock_prices: {
        Row: {
          change_rate: number | null;
          code: string;
          fetched_at: string;
          market: Database["public"]["Enums"]["market_type"];
          price: number;
        };
        Insert: {
          change_rate?: number | null;
          code: string;
          fetched_at: string;
          market: Database["public"]["Enums"]["market_type"];
          price: number;
        };
        Update: {
          change_rate?: number | null;
          code?: string;
          fetched_at?: string;
          market?: Database["public"]["Enums"]["market_type"];
          price?: number;
        };
        Relationships: [];
      };
      system_config: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string | null;
          created_at: string;
          household_id: string;
          id: string;
          name: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          name: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      target_allocations: {
        Row: {
          category: Database["public"]["Enums"]["allocation_category"];
          created_at: string;
          household_id: string;
          id: string;
          target_percentage: number;
          updated_at: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["allocation_category"];
          created_at?: string;
          household_id: string;
          id?: string;
          target_percentage: number;
          updated_at?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["allocation_category"];
          created_at?: string;
          household_id?: string;
          id?: string;
          target_percentage?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "target_allocations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          account_id: string | null;
          created_at: string;
          household_id: string;
          id: string;
          memo: string | null;
          owner_id: string;
          price: number;
          quantity: number;
          ticker: string;
          transacted_at: string;
          type: Database["public"]["Enums"]["transaction_type"];
        };
        Insert: {
          account_id?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          memo?: string | null;
          owner_id: string;
          price: number;
          quantity: number;
          ticker: string;
          transacted_at: string;
          type: Database["public"]["Enums"]["transaction_type"];
        };
        Update: {
          account_id?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          memo?: string | null;
          owner_id?: string;
          price?: number;
          quantity?: number;
          ticker?: string;
          transacted_at?: string;
          type?: Database["public"]["Enums"]["transaction_type"];
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      holdings: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"] | null;
          avg_price: number | null;
          currency: Database["public"]["Enums"]["currency_type"] | null;
          first_transaction_at: string | null;
          household_id: string | null;
          last_transaction_at: string | null;
          market: Database["public"]["Enums"]["market_type"] | null;
          name: string | null;
          owner_id: string | null;
          quantity: number | null;
          risk_level: Database["public"]["Enums"]["risk_level"] | null;
          ticker: string | null;
          total_invested: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      get_user_household_ids: { Args: never; Returns: string[] };
      is_admin: { Args: never; Returns: boolean };
      is_household_member: { Args: { hh_id: string }; Returns: boolean };
      is_household_owner: { Args: { hh_id: string }; Returns: boolean };
      search_stocks: {
        Args: {
          market_filter?: Database["public"]["Enums"]["market_type"];
          result_limit?: number;
          search_query: string;
        };
        Returns: {
          choseong: string | null;
          code: string;
          exchange: Database["public"]["Enums"]["exchange_type"];
          id: string;
          is_active: boolean | null;
          is_suspended: boolean | null;
          market: Database["public"]["Enums"]["market_type"];
          name: string;
          name_en: string | null;
          stock_type_category:
            | Database["public"]["Enums"]["stock_type_category"]
            | null;
          stock_type_code: string | null;
          stock_type_name: string | null;
          synced_at: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "stock_master";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      account_type:
        | "stock"
        | "savings"
        | "deposit"
        | "checking"
        | "isa"
        | "pension"
        | "cma"
        | "other";
      allocation_category:
        | "equity_kr"
        | "equity_us"
        | "equity_other"
        | "bond"
        | "cash"
        | "commodity"
        | "crypto"
        | "alternative";
      asset_type:
        | "equity"
        | "bond"
        | "cash"
        | "commodity"
        | "crypto"
        | "alternative";
      currency_type: "KRW" | "USD";
      exchange_type: "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ" | "AMEX";
      household_role: "owner" | "member";
      invitation_status: "pending" | "accepted" | "expired" | "cancelled";
      market_type: "KR" | "US" | "OTHER";
      risk_level: "safe" | "moderate" | "aggressive";
      stock_type_category:
        | "stock"
        | "etf"
        | "etn"
        | "fund"
        | "reit"
        | "warrant"
        | "index";
      transaction_type: "buy" | "sell";
      user_role: "user" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: [
        "stock",
        "savings",
        "deposit",
        "checking",
        "isa",
        "pension",
        "cma",
        "other",
      ],
      allocation_category: [
        "equity_kr",
        "equity_us",
        "equity_other",
        "bond",
        "cash",
        "commodity",
        "crypto",
        "alternative",
      ],
      asset_type: [
        "equity",
        "bond",
        "cash",
        "commodity",
        "crypto",
        "alternative",
      ],
      currency_type: ["KRW", "USD"],
      exchange_type: ["KOSPI", "KOSDAQ", "NYSE", "NASDAQ", "AMEX"],
      household_role: ["owner", "member"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      market_type: ["KR", "US", "OTHER"],
      risk_level: ["safe", "moderate", "aggressive"],
      stock_type_category: [
        "stock",
        "etf",
        "etn",
        "fund",
        "reit",
        "warrant",
        "index",
      ],
      transaction_type: ["buy", "sell"],
      user_role: ["user", "admin"],
    },
  },
} as const;
