import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickActionButtons } from "./QuickActionButtons";

describe("QuickActionButtons", () => {
  it('"지출" 링크의 href가 "/ledger/new?type=expense"이다', () => {
    render(<QuickActionButtons />);
    const link = screen.getByRole("link", { name: /지출/ });
    expect(link).toHaveAttribute("href", "/ledger/new?type=expense");
  });

  it('"수입" 링크의 href가 "/ledger/new?type=income"이다', () => {
    render(<QuickActionButtons />);
    const link = screen.getByRole("link", { name: /수입/ });
    expect(link).toHaveAttribute("href", "/ledger/new?type=income");
  });
});
