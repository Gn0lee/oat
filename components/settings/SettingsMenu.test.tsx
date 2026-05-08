import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  it("가구 관리 페이지로 이동하는 메뉴를 렌더링한다", () => {
    render(<SettingsMenu />);

    expect(screen.getByRole("link", { name: /가구 관리/ })).toHaveAttribute(
      "href",
      "/settings/household",
    );
  });
});
