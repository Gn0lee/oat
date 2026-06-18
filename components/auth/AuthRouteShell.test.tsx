import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthNotice } from "./AuthNotice";
import { AuthShell } from "./AuthShell";

describe("AuthRouteShell", () => {
  it("renders a representative form route inside the shared auth shell", () => {
    const { container } = render(
      <AuthShell title="Representative Form Heading">
        <form>
          <label htmlFor="test-input">Test Field</label>
          <input id="test-input" type="text" />
          <button type="submit">Submit Form</button>
        </form>
      </AuthShell>,
    );

    expect(screen.getByText("Representative Form Heading")).toBeInTheDocument();
    expect(screen.getByLabelText("Test Field")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit Form" }),
    ).toBeInTheDocument();

    // Check that there is no heavy styling like shadow-lg or rounded-2xl
    expect(container.innerHTML).not.toContain("shadow-lg");
    expect(container.innerHTML).not.toContain("rounded-2xl");
  });

  it("renders a representative notice route inside the shared auth shell", () => {
    const { container } = render(
      <AuthShell title="Representative Notice Page" contentClassName="mt-0">
        <AuthNotice
          tone="success"
          title="Operation Successful"
          description="Everything went fine."
          primaryAction={<a href="/login">로그인 페이지로 이동</a>}
        />
      </AuthShell>,
    );

    expect(screen.getByText("Representative Notice Page")).toBeInTheDocument();
    expect(screen.getByText("Operation Successful")).toBeInTheDocument();
    expect(screen.getByText("Everything went fine.")).toBeInTheDocument();

    const actionLink = screen.getByRole("link", {
      name: "로그인 페이지로 이동",
    });
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute("href", "/login");

    // Check that there is no heavy styling
    expect(container.innerHTML).not.toContain("shadow-lg");
    expect(container.innerHTML).not.toContain("rounded-2xl");
  });

  it("keeps the shared route shell free of heavy card styling", () => {
    render(
      <AuthShell title="Simple Shell">
        <div>Content</div>
      </AuthShell>,
    );

    // Assert that the container has border, rounded-xl but no shadow-lg or rounded-2xl
    const panel = screen.getByText("Simple Shell").closest(".border");
    expect(panel).toBeInTheDocument();
    expect(panel?.className).toContain("rounded-xl");
    expect(panel?.className).not.toContain("rounded-2xl");
    expect(panel?.className).not.toContain("shadow");
  });
});
