import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TaskFormSurface } from "./TaskFormSurface";

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => (
    <div data-slot="dialog">{children}</div>
  ),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div data-slot="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: ReactNode }) => (
    <div data-slot="drawer">{children}</div>
  ),
  DrawerContent: ({
    children,
    className,
    showHandle,
  }: {
    children: ReactNode;
    className?: string;
    showHandle?: boolean;
  }) => (
    <div
      data-show-handle={String(showHandle)}
      data-slot="drawer-content"
      className={className}
    >
      {children}
    </div>
  ),
}));

describe("TaskFormSurface", () => {
  it("renders desktop input tasks as a dialog", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);

    render(
      <TaskFormSurface
        open
        title="거래 수정 요청"
        description="거래 소유자에게 요청 내용이 전달됩니다."
        onOpenChange={() => undefined}
      >
        <div>요청 입력</div>
      </TaskFormSurface>,
    );

    expect(screen.getByText("거래 수정 요청")).toBeInTheDocument();
    expect(screen.getByText("요청 입력")).toBeInTheDocument();
    expect(
      screen.getByText("요청 입력").closest("[data-slot]"),
    ).toHaveAttribute("data-slot", "dialog-content");
  });

  it("renders mobile input tasks as a full-screen drawer with close action", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.mocked(useMediaQuery).mockReturnValue(false);

    render(
      <TaskFormSurface
        open
        title="거래 수정 요청"
        description="거래 소유자에게 요청 내용이 전달됩니다."
        onOpenChange={onOpenChange}
      >
        <div>요청 입력</div>
      </TaskFormSurface>,
    );

    const content = screen.getByText("요청 입력").closest("[data-slot]");
    expect(content).toHaveAttribute("data-slot", "drawer-content");
    expect(content).toHaveAttribute("data-show-handle", "false");
    expect(content).toHaveClass("h-[100dvh]");

    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
