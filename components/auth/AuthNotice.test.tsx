import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthNotice } from "./AuthNotice";

describe("AuthNotice", () => {
  it("renders info notice with primary and secondary actions", () => {
    const { container } = render(
      <AuthNotice
        tone="info"
        title="Info Title"
        description="Info Description"
        primaryAction={<button type="button">Primary Button</button>}
        secondaryAction={<button type="button">Secondary Button</button>}
      />,
    );

    expect(screen.getByText("Info Title")).toBeInTheDocument();
    expect(screen.getByText("Info Description")).toBeInTheDocument();

    const primary = screen.getByText("Primary Button");
    const secondary = screen.getByText("Secondary Button");

    expect(primary).toBeInTheDocument();
    expect(secondary).toBeInTheDocument();

    // Primary action should render before secondary action in document order
    const primaryIndex = container.innerHTML.indexOf("Primary Button");
    const secondaryIndex = container.innerHTML.indexOf("Secondary Button");
    expect(primaryIndex).toBeLessThan(secondaryIndex);

    // Root should not contain shadow-lg
    expect(container.innerHTML).not.toContain("shadow-lg");
  });

  it("renders error notice with primary action", () => {
    render(
      <AuthNotice
        tone="error"
        title="Error Title"
        description="Error Description"
        primaryAction={<a href="/login">로그인 페이지로 이동</a>}
      />,
    );

    expect(screen.getByText("Error Title")).toBeInTheDocument();
    expect(screen.getByText("Error Description")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "로그인 페이지로 이동" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/login");
  });

  it("wraps long email text safely", () => {
    const longEmail =
      "very-long-email-address-that-exceeds-standard-card-width-for-overflow-testing@example.com";
    render(
      <AuthNotice
        tone="info"
        title="Verification"
        description={
          <span>
            Email sent to{" "}
            <span className="highlight font-semibold">{longEmail}</span>
          </span>
        }
      />,
    );

    // Assert that the container or description element wraps safely
    // Search for the element containing the email
    const emailSpan = screen.getByText(longEmail);
    expect(emailSpan).toBeInTheDocument();

    // AuthNotice's description or long text element should wrap
    const descElement = screen.getByText(/Verification/).nextElementSibling;
    const className = descElement?.className || "";
    const hasSafeWrap =
      className.includes("[overflow-wrap:anywhere]") ||
      className.includes("break-words");
    expect(hasSafeWrap).toBe(true);
  });
});
