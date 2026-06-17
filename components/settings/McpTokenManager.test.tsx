import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McpTokenManager } from "./McpTokenManager";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockTokens = [
  {
    id: "token-1",
    name: "My Claude",
    tokenPrefix: "oat_mcp_test",
    tokenLast4: "abcd",
    scopes: ["read"],
    expiresAt: "2026-09-17T00:00:00.000Z",
    lastUsedAt: "2026-06-17T12:00:00.000Z",
    revokedAt: null,
    createdAt: "2026-06-17T00:00:00.000Z",
  },
];

describe("McpTokenManager", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("loads and renders token management sections", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockTokens }),
    } as any);

    render(<McpTokenManager />);

    // 1. GET /api/mcp-tokens is called on mount
    expect(fetchSpy).toHaveBeenCalledWith("/api/mcp-tokens");

    // Wait for tokens to load
    await waitFor(() => {
      expect(screen.queryByText("불러오는 중")).not.toBeInTheDocument();
    });

    // 2. Headings are visible
    expect(screen.getByText("새 MCP 토큰")).toBeInTheDocument();
    expect(screen.getByText("클라이언트 연결")).toBeInTheDocument();
    expect(screen.getByText("토큰 목록")).toBeInTheDocument();

    // 3. Existing token name, prefix/last4, status badge, expiration are visible
    expect(screen.getByText("My Claude")).toBeInTheDocument();
    expect(screen.getByText("oat_mcp_test...abcd")).toBeInTheDocument();
    expect(screen.getByText("읽기 전용")).toBeInTheDocument();

    // 4. Check that GroupedList is used for layout (TDD fail check)
    const groupedLists = screen.getAllByTestId("grouped-list");
    expect(groupedLists.length).toBeGreaterThan(0);
  });

  it("creates a token and exposes one-time copy action", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    // Initial fetch empty list
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as any);

    render(<McpTokenManager />);

    await waitFor(() => {
      expect(screen.queryByText("불러오는 중")).not.toBeInTheDocument();
    });

    // Setup mock response for create POST
    const newToken = {
      id: "token-2",
      name: "New Token",
      tokenPrefix: "oat_mcp_new",
      tokenLast4: "wxyz",
      scopes: ["read"],
      expiresAt: "2026-09-17T00:00:00.000Z",
      lastUsedAt: null,
      revokedAt: null,
      createdAt: "2026-06-17T00:00:00.000Z",
    };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          token: "oat_mcp_new_token_secret_1234567890",
          item: newToken,
        },
      }),
    } as any);

    // Enter name and click create
    const input = screen.getByPlaceholderText("토큰 이름");
    fireEvent.change(input, { target: { value: "New Token" } });

    const createBtn = screen.getByRole("button", { name: "생성" });
    fireEvent.click(createBtn);

    // Verify POST was made
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/mcp-tokens",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "New Token" }),
        }),
      );
    });

    // Created token is visible
    await waitFor(() => {
      expect(
        screen.getByText("oat_mcp_new_token_secret_1234567890"),
      ).toBeInTheDocument();
    });

    // Copy action writes to clipboard
    const copyBtn = screen.getByLabelText("MCP 토큰 복사");
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "oat_mcp_new_token_secret_1234567890",
      );
      expect(toast.success).toHaveBeenCalledWith("토큰을 복사했습니다.");
    });
  });

  it("copies connection snippets and revokes active tokens", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTokens }),
      } as any) // for mount
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any); // for delete

    render(<McpTokenManager />);

    await waitFor(() => {
      expect(screen.queryByText("불러오는 중")).not.toBeInTheDocument();
    });

    // 1. Copy Codex connection guide
    const copyCodexBtn = screen.getByLabelText("Codex MCP 설정 복사");
    fireEvent.click(copyCodexBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("@oat-app/mcp-bridge"),
    );

    // 2. Revoke token
    const revokeBtn = screen.getByRole("button", { name: "회수" });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/mcp-tokens/token-1",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });
});
