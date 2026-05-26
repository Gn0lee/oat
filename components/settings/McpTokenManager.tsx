"use client";

import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RotateCcw,
  Terminal,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface McpTokenListItem {
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

interface CreateMcpTokenResponse {
  data: {
    token: string;
    item: McpTokenListItem;
  };
}

interface McpTokensResponse {
  data: McpTokenListItem[];
}

interface ApiErrorResponse {
  error: {
    message: string;
  };
}

function formatDate(value: string | null): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

async function readError(response: Response): Promise<Error> {
  const json = (await response.json()) as ApiErrorResponse;
  return new Error(json.error?.message ?? "요청에 실패했습니다.");
}

export function McpTokenManager() {
  const [tokens, setTokens] = useState<McpTokenListItem[]>([]);
  const [name, setName] = useState("Claude");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const tokenForGuide = createdToken ?? "oat_mcp_xxx";
  const claudeCodeCommand = `claude mcp add oat \\
  --transport stdio \\
  --env OAT_MCP_TOKEN=${tokenForGuide} \\
  -- npx -y @oat-app/mcp-bridge`;
  const codexConfig = `[mcp_servers.oat]
command = "npx"
args = ["-y", "@oat-app/mcp-bridge"]
env = { OAT_MCP_TOKEN = "${tokenForGuide}" }`;
  const claudeDesktopConfig = `{
  "mcpServers": {
    "oat": {
      "command": "npx",
      "args": ["-y", "@oat-app/mcp-bridge"],
      "env": {
        "OAT_MCP_TOKEN": "${tokenForGuide}"
      }
    }
  }
}`;
  const previewOverride = `OAT_MCP_URL=https://YOUR_PREVIEW_DOMAIN/api/mcp`;

  useEffect(() => {
    let isMounted = true;

    async function loadTokens() {
      try {
        const response = await fetch("/api/mcp-tokens");
        if (!response.ok) throw await readError(response);
        const json = (await response.json()) as McpTokensResponse;
        if (isMounted) setTokens(json.data);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "MCP 토큰 목록 조회에 실패했습니다.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTokens();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/mcp-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) throw await readError(response);

        const json = (await response.json()) as CreateMcpTokenResponse;
        setCreatedToken(json.data.token);
        setTokens((current) => [json.data.item, ...current]);
        setCopied(false);
        toast.success("MCP 토큰을 생성했습니다.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "MCP 토큰 생성에 실패했습니다.",
        );
      }
    });
  };

  const handleRevoke = (tokenId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/mcp-tokens/${tokenId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw await readError(response);

        setTokens((current) =>
          current.map((token) =>
            token.id === tokenId
              ? { ...token, revokedAt: new Date().toISOString() }
              : token,
          ),
        );
        toast.success("MCP 토큰을 회수했습니다.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "MCP 토큰 회수에 실패했습니다.",
        );
      }
    });
  };

  const handleCopy = async () => {
    if (!createdToken) return;

    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    toast.success("토큰을 복사했습니다.");
  };

  const handleCopyGuide = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedGuide(key);
    toast.success("설정을 복사했습니다.");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />새 MCP 토큰
          </CardTitle>
          <CardDescription>
            읽기 전용 토큰이 생성되며 90일 뒤 만료됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="토큰 이름"
            />
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isPending || name.trim().length === 0}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              생성
            </Button>
          </div>

          {createdToken && (
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <code className="break-all text-sm text-gray-900">
                  {createdToken}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={handleCopy}
                  aria-label="MCP 토큰 복사"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                이 값은 다시 표시되지 않습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4" />
            클라이언트 연결
          </CardTitle>
          <CardDescription>
            @oat-app/mcp-bridge는 기본적으로 oat 상용 MCP endpoint에 연결합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConnectionSnippet
            title="Claude Code"
            value={claudeCodeCommand}
            copied={copiedGuide === "claude-code"}
            onCopy={() => handleCopyGuide("claude-code", claudeCodeCommand)}
          />
          <ConnectionSnippet
            title="Codex"
            value={codexConfig}
            copied={copiedGuide === "codex"}
            onCopy={() => handleCopyGuide("codex", codexConfig)}
          />
          <ConnectionSnippet
            title="Claude Desktop"
            value={claudeDesktopConfig}
            copied={copiedGuide === "claude-desktop"}
            onCopy={() =>
              handleCopyGuide("claude-desktop", claudeDesktopConfig)
            }
          />
          <div className="rounded-lg border border-dashed p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-900">
                Preview endpoint
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => handleCopyGuide("preview", previewOverride)}
                aria-label="Preview endpoint 설정 복사"
              >
                {copiedGuide === "preview" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <code className="block break-all rounded bg-gray-50 p-2 text-xs text-gray-800">
              {previewOverride}
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">토큰 목록</CardTitle>
          <CardDescription>
            AI 도구에서 사용하는 oat MCP 연결을 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              불러오는 중
            </div>
          ) : tokens.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              생성된 MCP 토큰이 없습니다.
            </div>
          ) : (
            <div className="divide-y">
              {tokens.map((token) => {
                const isRevoked = Boolean(token.revokedAt);
                return (
                  <div
                    key={token.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {token.name}
                        </p>
                        <Badge variant={isRevoked ? "secondary" : "outline"}>
                          {isRevoked ? "회수됨" : "읽기 전용"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {token.tokenPrefix}...{token.tokenLast4}
                      </p>
                      <p className="text-xs text-gray-400">
                        만료 {formatDate(token.expiresAt)} · 마지막 사용{" "}
                        {formatDate(token.lastUsedAt)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(token.id)}
                      disabled={isPending || isRevoked}
                    >
                      <RotateCcw className="h-4 w-4" />
                      회수
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ConnectionSnippetProps {
  title: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}

function ConnectionSnippet({
  title,
  value,
  copied,
  onCopy,
}: ConnectionSnippetProps) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onCopy}
          aria-label={`${title} MCP 설정 복사`}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <pre className="max-h-64 overflow-x-auto rounded bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
        <code>{value}</code>
      </pre>
    </div>
  );
}
