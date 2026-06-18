import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthShell } from "./AuthShell";

describe("AuthShell", () => {
  it("renders brand, title, description, and children in a quiet centered panel", () => {
    const { container } = render(
      <AuthShell title="Test Title" description="Test Description">
        <div>Child Content</div>
      </AuthShell>,
    );

    // Assert visible elements
    expect(screen.getByText("oat")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();

    // Assert styling requirements on the panel/containers
    // Finding the panel - the container around the title/description/children
    // It should have 'border' but NOT 'shadow-lg' or 'rounded-2xl'
    const panel = screen.getByText("Test Title").closest(".border");
    expect(panel).toBeInTheDocument();

    // Check classes in the container hierarchy
    const htmlString = container.innerHTML;
    expect(htmlString).not.toContain("shadow-lg");
    expect(htmlString).not.toContain("rounded-2xl");
  });

  it("keeps long text layout-safe", () => {
    const longDesc =
      "long-email-address-or-long-description-without-spaces-that-could-overflow-the-width-of-the-card-on-mobile-devices";
    render(
      <AuthShell title="Test Title" description={longDesc}>
        <div>Child Content</div>
      </AuthShell>,
    );

    const descElement = screen.getByText(longDesc);
    const className = descElement.className || "";
    const hasSafeWrap =
      className.includes("[overflow-wrap:anywhere]") ||
      className.includes("break-words");
    expect(hasSafeWrap).toBe(true);
  });
});
