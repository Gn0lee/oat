import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { StockSearchDialog } from "./StockSearchDialog";

vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => false }));
vi.mock("@/hooks/use-debounced-value", () => ({
  useDebouncedValue: (value: string) => value,
}));
vi.mock("@/hooks/use-stock-search", () => ({
  useStockSearch: () => ({ data: [], isLoading: false, isFetching: false }),
}));

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = () => undefined;
});

describe("StockSearchDialog", () => {
  it("mobile drawer focuses its title and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<StockSearchDialog onSelect={vi.fn()} placeholder="종목 검색" />);

    const trigger = screen.getByRole("button", { name: "종목 검색" });
    await user.click(trigger);

    const title = await screen.findByRole("heading", { name: "종목 검색" });
    await waitFor(() => expect(title).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
