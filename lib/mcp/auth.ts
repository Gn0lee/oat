import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import type { Database } from "@/types";

export const DEFAULT_MCP_TOKEN_TTL_DAYS = 90;
export const MCP_LAST_USED_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const DEFAULT_MCP_READ_SCOPES = [
  "read:overview",
  "read:ledger",
  "read:assets",
  "read:references",
] as const;

export type McpReadScope = (typeof DEFAULT_MCP_READ_SCOPES)[number];

export interface McpAuthContext {
  tokenId: string;
  userId: string;
  householdId: string;
  scopes: string[];
  authMethod: "personal_token";
}

export interface McpTokenListItem {
  id: string;
  name: string;
  tokenPrefix: string;
  tokenLast4: string;
  scopes: string[];
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

type LooseSupabaseClient = SupabaseClient<Database>;

interface McpTokenRow {
  id: string;
  user_id: string;
  household_id: string;
  name: string;
  token_prefix: string;
  token_last4: string;
  scopes: string[];
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

function toTokenListItem(row: McpTokenRow): McpTokenListItem {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    tokenLast4: row.token_last4,
    scopes: row.scopes,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export function createMcpTokenSecret(): string {
  return `oat_mcp_${randomBytes(32).toString("base64url")}`;
}

export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function toMcpTokenPreview(token: string): {
  prefix: string;
  last4: string;
} {
  return {
    prefix: token.split("_").slice(0, 2).join("_"),
    last4: token.slice(-4),
  };
}

export function parseBearerToken(header: string | null): string | null {
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export function getMcpTokenExpiresAt(
  now = new Date(),
  ttlDays = DEFAULT_MCP_TOKEN_TTL_DAYS,
): string {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + ttlDays);
  return expiresAt.toISOString();
}

export function shouldRefreshMcpTokenLastUsedAt(
  lastUsedAt: string | null,
  now = new Date(),
): boolean {
  if (!lastUsedAt) return true;

  const lastUsedTime = new Date(lastUsedAt).getTime();
  if (!Number.isFinite(lastUsedTime)) return true;

  return now.getTime() - lastUsedTime >= MCP_LAST_USED_REFRESH_INTERVAL_MS;
}

export async function listMcpTokens(
  supabase: LooseSupabaseClient,
  userId: string,
  householdId: string,
): Promise<McpTokenListItem[]> {
  const { data, error } = await supabase
    .from("mcp_tokens")
    .select(
      "id, user_id, household_id, name, token_prefix, token_last4, scopes, expires_at, last_used_at, revoked_at, created_at",
    )
    .eq("user_id", userId)
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("MCP token list error:", error);
    throw new APIError(
      "MCP_TOKEN_ERROR",
      "MCP 토큰 목록 조회에 실패했습니다.",
      500,
    );
  }

  return ((data ?? []) as McpTokenRow[]).map(toTokenListItem);
}

export async function createMcpToken(
  supabase: LooseSupabaseClient,
  params: {
    userId: string;
    householdId: string;
    name: string;
    scopes?: string[];
    now?: Date;
  },
): Promise<{ token: string; item: McpTokenListItem }> {
  const token = createMcpTokenSecret();
  const preview = toMcpTokenPreview(token);
  const scopes = params.scopes ?? [...DEFAULT_MCP_READ_SCOPES];

  const { data, error } = await supabase
    .from("mcp_tokens")
    .insert({
      user_id: params.userId,
      household_id: params.householdId,
      name: params.name,
      token_hash: hashMcpToken(token),
      token_prefix: preview.prefix,
      token_last4: preview.last4,
      scopes,
      expires_at: getMcpTokenExpiresAt(params.now),
    })
    .select(
      "id, user_id, household_id, name, token_prefix, token_last4, scopes, expires_at, last_used_at, revoked_at, created_at",
    )
    .single();

  if (error) {
    console.error("MCP token create error:", error);
    throw new APIError("MCP_TOKEN_ERROR", "MCP 토큰 생성에 실패했습니다.", 500);
  }

  return { token, item: toTokenListItem(data as McpTokenRow) };
}

export async function revokeMcpToken(
  supabase: LooseSupabaseClient,
  params: { tokenId: string; userId: string; householdId: string },
): Promise<void> {
  const { error } = await supabase
    .from("mcp_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", params.tokenId)
    .eq("user_id", params.userId)
    .eq("household_id", params.householdId)
    .is("revoked_at", null);

  if (error) {
    console.error("MCP token revoke error:", error);
    throw new APIError("MCP_TOKEN_ERROR", "MCP 토큰 회수에 실패했습니다.", 500);
  }
}

export async function authenticateMcpToken(
  supabase: LooseSupabaseClient,
  authorizationHeader: string | null,
): Promise<McpAuthContext> {
  const token = parseBearerToken(authorizationHeader);

  if (!token) {
    throw new APIError("MCP_UNAUTHORIZED", "MCP 토큰이 필요합니다.", 401);
  }

  const { data, error } = await supabase
    .from("mcp_tokens")
    .select(
      "id, user_id, household_id, scopes, expires_at, revoked_at, last_used_at",
    )
    .eq("token_hash", hashMcpToken(token))
    .maybeSingle();

  if (error) {
    console.error("MCP token auth error:", error);
    throw new APIError(
      "MCP_UNAUTHORIZED",
      "MCP 토큰 인증에 실패했습니다.",
      401,
    );
  }

  const row = data as {
    id: string;
    user_id: string;
    household_id: string;
    scopes: string[];
    expires_at: string;
    revoked_at: string | null;
    last_used_at: string | null;
  } | null;

  if (!row || row.revoked_at || new Date(row.expires_at) <= new Date()) {
    throw new APIError(
      "MCP_UNAUTHORIZED",
      "유효하지 않은 MCP 토큰입니다.",
      401,
    );
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", row.household_id)
    .eq("user_id", row.user_id)
    .maybeSingle();

  if (!membership) {
    throw new APIError("MCP_FORBIDDEN", "가구 접근 권한이 없습니다.", 403);
  }

  const now = new Date();
  if (shouldRefreshMcpTokenLastUsedAt(row.last_used_at, now)) {
    await supabase
      .from("mcp_tokens")
      .update({ last_used_at: now.toISOString() })
      .eq("id", row.id);
  }

  return {
    tokenId: row.id,
    userId: row.user_id,
    householdId: row.household_id,
    scopes: row.scopes,
    authMethod: "personal_token",
  };
}
