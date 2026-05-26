export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

function safeFields(fields: Record<string, unknown> | undefined): string {
  if (!fields) return "";

  const sanitized = Object.fromEntries(
    Object.entries(fields).filter(
      ([key]) => !key.toLowerCase().includes("token"),
    ),
  );

  if (Object.keys(sanitized).length === 0) return "";
  return ` ${JSON.stringify(sanitized)}`;
}

export function createLogger(debugEnabled: boolean): Logger {
  return {
    debug(message, fields) {
      if (!debugEnabled) return;
      process.stderr.write(
        `[oat-mcp-bridge] ${message}${safeFields(fields)}\n`,
      );
    },
    error(message, fields) {
      process.stderr.write(
        `[oat-mcp-bridge] ${message}${safeFields(fields)}\n`,
      );
    },
  };
}
