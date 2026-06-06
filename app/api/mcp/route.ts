import { type NextRequest, NextResponse } from "next/server";
import { APIError } from "@/lib/api/error";
import { writeMcpAuditLog } from "@/lib/mcp/audit";
import { authenticateMcpToken } from "@/lib/mcp/auth";
import { handleMcpJsonRpc } from "@/lib/mcp/protocol";
import { createAdminClient } from "@/lib/supabase/admin";

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;

  return origin === requestOrigin || origin === configuredOrigin;
}

function summarizeToolInput(
  params: unknown,
): Record<string, unknown> | undefined {
  const value = params as { arguments?: unknown } | null;
  const args =
    value?.arguments && typeof value.arguments === "object"
      ? (value.arguments as Record<string, unknown>)
      : undefined;

  if (!args) return undefined;

  return {
    from: args.from,
    to: args.to,
    year: args.year,
    month: args.month,
    months: args.months,
    limit: args.limit,
    includeHoldings: args.includeHoldings,
    includeAllocation: args.includeAllocation,
    types: args.types,
    categoryIds: args.categoryIds,
    endpointIds: args.endpointIds,
    endpointTypes: args.endpointTypes,
    ownerIds: args.ownerIds,
    isShared: args.isShared,
    hasQuery: typeof args.query === "string" && args.query.trim().length > 0,
  };
}

function isMcpNotification(message: unknown): boolean {
  return (
    !!message &&
    typeof message === "object" &&
    !("id" in message) &&
    typeof (message as { method?: unknown }).method === "string" &&
    (message as { method: string }).method.startsWith("notifications/")
  );
}

export async function GET() {
  return NextResponse.json({
    data: {
      name: "oat MCP",
      version: "v0",
      transport: "streamable-http",
      endpoint: "/api/mcp",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      {
        error: {
          code: "MCP_FORBIDDEN_ORIGIN",
          message: "허용되지 않은 Origin입니다.",
        },
      },
      { status: 403 },
    );
  }

  const protocolVersion = request.headers.get("mcp-protocol-version");
  if (
    protocolVersion &&
    !["2025-03-26", "2025-06-18"].includes(protocolVersion)
  ) {
    return NextResponse.json(
      {
        error: {
          code: "MCP_UNSUPPORTED_PROTOCOL_VERSION",
          message: "지원하지 않는 MCP protocol version입니다.",
        },
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  let auth = null;
  let toolName = "unknown";
  let inputSummary: Record<string, unknown> | undefined;
  let shouldAudit = false;

  try {
    const message = await request.json();
    if (isMcpNotification(message)) {
      return new NextResponse(null, { status: 202 });
    }

    const admin = createAdminClient();
    auth = await authenticateMcpToken(
      admin,
      request.headers.get("authorization"),
    );

    if (
      message &&
      typeof message === "object" &&
      "params" in message &&
      (message as { method?: unknown }).method === "tools/call"
    ) {
      shouldAudit = true;
      const params = (message as { params?: { name?: unknown } }).params;
      toolName = typeof params?.name === "string" ? params.name : "unknown";
      inputSummary = summarizeToolInput(params);
    } else if (message && typeof message === "object") {
      toolName = String((message as { method?: unknown }).method ?? "unknown");
    }

    const response = await handleMcpJsonRpc({
      message,
      supabase: admin,
      auth,
    });

    if (shouldAudit && toolName !== "unknown" && auth) {
      await writeMcpAuditLog(admin, {
        auth,
        toolName,
        inputSummary,
        resultStatus: "success",
        durationMs: Date.now() - startedAt,
      });
    }

    if (response.status === 202 || response.body === null) {
      return new NextResponse(null, { status: 202 });
    }

    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    if (shouldAudit && auth) {
      const admin = createAdminClient();
      await writeMcpAuditLog(admin, {
        auth,
        toolName,
        inputSummary,
        resultStatus: "error",
        errorCode: error instanceof APIError ? error.code : "INTERNAL_ERROR",
        durationMs: Date.now() - startedAt,
      });
    }

    if (error instanceof APIError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }

    console.error("MCP route error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      },
      { status: 500 },
    );
  }
}
