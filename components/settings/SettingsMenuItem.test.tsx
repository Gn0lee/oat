import { render, screen } from "@testing-library/react";
import { User } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { SettingsMenuItem } from "./SettingsMenuItem";

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

describe("SettingsMenuItem", () => {
  it("renders enabled navigation items as links", () => {
    render(
      <SettingsMenuItem
        icon={User}
        label="가구 관리"
        description="가구 이름, 구성원, 초대 관리"
        href="/settings/household"
      />,
    );

    expect(screen.getByRole("link", { name: /가구 관리/ })).toHaveAttribute(
      "href",
      "/settings/household",
    );
    expect(
      screen.getByText("가구 이름, 구성원, 초대 관리"),
    ).toBeInTheDocument();
  });

  it("renders disabled navigation items as non-interactive rows", () => {
    render(
      <SettingsMenuItem
        icon={User}
        label="프로필"
        description="이름, 이메일 관리"
        href="/settings/profile"
        disabled
      />,
    );

    expect(
      screen.queryByRole("link", { name: /프로필/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("준비 중")).toBeInTheDocument();
  });

  it("renders action items as buttons and shows loading affordance", () => {
    render(
      <SettingsMenuItem
        icon={User}
        label="로그아웃"
        onClick={vi.fn()}
        isLoading
      />,
    );

    const button = screen.getByRole("button", { name: /로그아웃/ });

    expect(button).toBeDisabled();
    expect(button.querySelector(".lucide-loader-circle")).toBeInTheDocument();
  });
});
