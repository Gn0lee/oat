import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DrawerContent } from "./drawer";

vi.mock("vaul", () => ({
  Drawer: {
    Portal: ({ children }: { children: ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({
      children,
      ...props
    }: {
      children: ReactNode;
      style?: React.CSSProperties;
    }) => <div {...props}>{children}</div>,
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DrawerContent keyboard viewport", () => {
  it("keeps the focused input and footer in the visual viewport without resetting field scroll", () => {
    const viewport = Object.assign(new EventTarget(), {
      height: 800,
      offsetTop: 0,
    });
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("innerHeight", 800);

    render(
      <DrawerContent keyboardViewport showHandle={false}>
        <div data-testid="fields" style={{ overflowY: "auto" }}>
          <input aria-label="단가" />
        </div>
        <button type="button">완료</button>
      </DrawerContent>,
    );

    const content = screen.getByRole("button", { name: "완료" })
      .parentElement as HTMLElement;
    const fields = screen.getByTestId("fields");
    const price = screen.getByRole("textbox", { name: "단가" });
    fields.scrollTop = 120;
    price.focus();
    act(() => {
      viewport.height = 480;
      viewport.dispatchEvent(new Event("resize"));
    });

    expect(content).toHaveStyle({
      height: "480px",
      maxHeight: "480px",
      bottom: "320px",
    });
    expect(fields.scrollTop).toBe(120);
    expect(document.activeElement).toBe(price);

    act(() => {
      viewport.offsetTop = 20;
      viewport.dispatchEvent(new Event("scroll"));
    });
    expect(content).toHaveStyle({ bottom: "300px" });
  });
});
