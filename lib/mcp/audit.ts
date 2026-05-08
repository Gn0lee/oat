import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types";
import type { McpAuthContext } from "./auth";

type LooseSupabaseClient = SupabaseClient<Database>;

export async function writeMcpAuditLog(
  supabase: LooseSupabaseClient,
  params: {
    auth: McpAuthContext;
    toolName: string;
    inputSummary?: Record<string, unknown>;
    resultStatus: "success" | "error";
    errorCode?: string;
    durationMs: number;
  },
) {
  const { error } = await supabase.from("mcp_audit_logs").insert({
    token_id: params.auth.tokenId,
    user_id: params.auth.userId,
    household_id: params.auth.householdId,
    tool_name: params.toolName,
    input_summary: (params.inputSummary ?? null) as Json,
    result_status: params.resultStatus,
    error_code: params.errorCode ?? null,
    duration_ms: params.durationMs,
  });

  if (error) {
    console.error("MCP audit log error:", error);
  }
}
