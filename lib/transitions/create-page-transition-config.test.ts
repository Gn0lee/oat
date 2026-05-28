import { fade } from "@ssgoi/react/view-transitions";
import { describe, expect, it, vi } from "vitest";
import { createPageTransitionConfig } from "./create-page-transition-config";

vi.mock("@ssgoi/react/view-transitions", () => ({
  axis: vi.fn(() => []),
  drill: vi.fn(() => []),
  fade: vi.fn(() => []),
  sheet: vi.fn(() => []),
}));

describe("createPageTransitionConfig", () => {
  it("desktop fade에는 빠른 spring physics를 사용한다", () => {
    createPageTransitionConfig("desktop");

    expect(fade).toHaveBeenCalledWith({
      paths: ["/home", "/ledger", "/assets", "/settings", "/household"],
      options: {
        physics: {
          spring: {
            stiffness: 260,
            damping: 28,
            doubleSpring: true,
          },
        },
      },
    });
  });
});
