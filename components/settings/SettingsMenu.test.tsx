import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMcpEnabled } from "@/lib/mcp/feature-flags";
import { SettingsMenu } from "./SettingsMenu";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/(auth)/logout/actions", () => ({
  signOutAction: vi.fn(),
}));

describe("SettingsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("가구 관리 페이지로 이동하는 메뉴를 렌더링한다", () => {
    render(<SettingsMenu mcpEnabled={false} />);

    expect(screen.getByRole("link", { name: /가구 관리/ })).toHaveAttribute(
      "href",
      "/settings/household",
    );
  });

  it("MCP가 비활성화되어 있으면 MCP 연결 메뉴를 렌더링하지 않는다", () => {
    render(<SettingsMenu mcpEnabled={false} />);

    expect(
      screen.queryByRole("link", { name: /MCP 연결/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("MCP 연결")).not.toBeInTheDocument();
  });

  it("MCP가 활성화되어 있으면 MCP 연결 메뉴를 렌더링한다", () => {
    render(<SettingsMenu mcpEnabled={true} />);

    expect(screen.getByRole("link", { name: /MCP 연결/ })).toHaveAttribute(
      "href",
      "/settings/mcp",
    );
  });
});
