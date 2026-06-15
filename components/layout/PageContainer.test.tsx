import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageContainer } from "./PageContainer";

describe("PageContainer", () => {
  it("renders default width as the standard app content container", () => {
    const { container } = render(
      <PageContainer maxWidth="default">
        <div>Content</div>
      </PageContainer>,
    );
    const element = container.firstElementChild;
    expect(element).toBeInTheDocument();
    expect(element?.className).toContain("mx-auto");
    expect(element?.className).toContain("w-full");
    expect(element?.className).toContain("max-w-5xl");
    expect(element?.className).toContain("space-y-6");
  });

  it("renders medium width as the compact management/detail container", () => {
    const { container } = render(
      <PageContainer maxWidth="medium">
        <div>Content</div>
      </PageContainer>,
    );
    const element = container.firstElementChild;
    expect(element).toBeInTheDocument();
    expect(element?.className).toContain("max-w-3xl");
    expect(element?.className).not.toContain("max-w-5xl");
    expect(element?.className).not.toContain("max-w-xl");
  });

  it("renders narrow width as the task/form container", () => {
    const { container } = render(
      <PageContainer maxWidth="narrow">
        <div>Content</div>
      </PageContainer>,
    );
    const element = container.firstElementChild;
    expect(element).toBeInTheDocument();
    expect(element?.className).toContain("max-w-xl");
    expect(element?.className).not.toContain("max-w-3xl");
  });
});
