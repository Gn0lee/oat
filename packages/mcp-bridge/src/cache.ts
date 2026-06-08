import type {
  CallToolRequest,
  ServerResult,
} from "@modelcontextprotocol/sdk/types.js";

export const DEFAULT_CONTEXT_CACHE_TTL_MS = 60_000;
export const DEFAULT_REFERENCES_CACHE_TTL_MS = 120_000;

type CallToolParams = CallToolRequest["params"];

export interface RemoteToolCaller {
  callTool(params: CallToolParams): Promise<ServerResult>;
}

interface CachedRemoteMcpClientOptions {
  cacheTtlMs?: number;
  now?: () => number;
}

interface CacheEntry {
  expiresAt: number;
  value: ServerResult;
}

const DEFAULT_TOOL_TTLS = new Map<string, number>([
  ["get_context", DEFAULT_CONTEXT_CACHE_TTL_MS],
  ["list_references", DEFAULT_REFERENCES_CACHE_TTL_MS],
]);

function normalizeArguments(args: unknown): {
  forceRefresh: boolean;
  forwardedArguments: Record<string, unknown>;
} {
  const value =
    args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  const { forceRefresh, ...forwardedArguments } = value;

  return {
    forceRefresh: forceRefresh === true,
    forwardedArguments,
  };
}

function stableStringify(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return JSON.stringify(value);
  }

  const record = value as Record<string, unknown>;
  return JSON.stringify(
    Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = record[key];
        return result;
      }, {}),
  );
}

export class CachedRemoteMcpClient {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly now: () => number;

  constructor(
    private readonly remote: RemoteToolCaller,
    private readonly options: CachedRemoteMcpClientOptions = {},
  ) {
    this.now = options.now ?? Date.now;
  }

  async callTool(params: CallToolParams): Promise<ServerResult> {
    const { forceRefresh, forwardedArguments } = normalizeArguments(
      params.arguments,
    );
    const forwardedParams = { ...params, arguments: forwardedArguments };
    const ttl = this.getTtl(params.name);

    if (ttl <= 0) {
      return this.remote.callTool(forwardedParams);
    }

    const cacheKey = `${params.name}:${stableStringify(forwardedArguments)}`;
    const cached = this.cache.get(cacheKey);
    const now = this.now();

    if (!forceRefresh && cached && cached.expiresAt > now) {
      return cached.value;
    }

    const value = await this.remote.callTool(forwardedParams);
    this.cache.set(cacheKey, { value, expiresAt: now + ttl });
    return value;
  }

  private getTtl(toolName: string): number {
    const defaultTtl = DEFAULT_TOOL_TTLS.get(toolName);
    if (defaultTtl === undefined) return 0;

    return this.options.cacheTtlMs ?? defaultTtl;
  }
}
