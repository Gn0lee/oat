import {
  DEFAULT_MCP_URL,
  DEFAULT_TIMEOUT_MS,
  MCP_PROTOCOL_VERSION,
  PACKAGE_NAME,
  PACKAGE_VERSION,
} from "./constants.js";

export interface BridgeConfig {
  url: URL;
  token: string;
  debug: boolean;
  timeoutMs: number;
  protocolVersion: string;
  userAgent: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function parseTimeout(value: string | undefined): number {
  if (!value) return DEFAULT_TIMEOUT_MS;

  const timeoutMs = Number(value);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigError("OAT_MCP_TIMEOUT_MS must be a positive integer.");
  }

  return timeoutMs;
}

function parseUrl(value: string | undefined): URL {
  try {
    return new URL(value ?? DEFAULT_MCP_URL);
  } catch {
    throw new ConfigError("OAT_MCP_URL must be a valid URL.");
  }
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): BridgeConfig {
  const token = env.OAT_MCP_TOKEN?.trim();
  if (!token) {
    throw new ConfigError("OAT_MCP_TOKEN is required.");
  }

  return {
    url: parseUrl(env.OAT_MCP_URL?.trim() || undefined),
    token,
    debug: env.OAT_MCP_DEBUG === "1" || env.OAT_MCP_DEBUG === "true",
    timeoutMs: parseTimeout(env.OAT_MCP_TIMEOUT_MS),
    protocolVersion: MCP_PROTOCOL_VERSION,
    userAgent: `${PACKAGE_NAME}/${PACKAGE_VERSION}`,
  };
}
