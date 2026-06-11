import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LedgerTitleCombobox } from "./LedgerTitleCombobox";

// Mock the useLedgerTitles hook
const mockUseLedgerTitles = vi.fn();
vi.mock("@/hooks/use-ledger-titles", () => ({
  useLedgerTitles: (query: string) => mockUseLedgerTitles(query),
}));

// Mock useMediaQuery
const mockUseMediaQuery = vi.fn();
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mockUseMediaQuery(),
}));

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = () => undefined;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
});

describe("LedgerTitleCombobox", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default to desktop
    mockUseMediaQuery.mockReturnValue(true);
    // Default mock query response
    mockUseLedgerTitles.mockReturnValue({
      data: { titles: ["식사", "커피", "마트"], hasMore: false },
      isLoading: false,
    });
  });

  it("데스크탑 환경에서 플레이스홀더를 가진 input이 렌더링된다", () => {
    render(
      <LedgerTitleCombobox
        value=""
        placeholder="예: 점심, 커피"
        onValueChange={() => undefined}
      />,
    );

    const input = screen.getByPlaceholderText("예: 점심, 커피");
    expect(input).toBeInTheDocument();
  });

  it("데스크탑 환경에서 입력값을 변경하면 onValueChange가 즉시 호출된다", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <LedgerTitleCombobox
        value=""
        placeholder="예: 점심, 커피"
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByPlaceholderText("예: 점심, 커피");
    await user.type(input, "커");

    expect(onValueChange).toHaveBeenCalled();
  });

  it("데스크탑 환경에서 2글자 이상 입력 시 자동완성 제안 리스트를 띄우고, 클릭 시 값을 선택한다", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <LedgerTitleCombobox
        value="커피"
        placeholder="예: 점심, 커피"
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByPlaceholderText("예: 점심, 커피");
    await user.click(input);

    // Should display search results/suggestions
    const suggestion = await screen.findByText("커피");
    expect(suggestion).toBeInTheDocument();

    await user.click(suggestion);
    expect(onValueChange).toHaveBeenCalledWith("커피");
  });

  it("모바일 환경에서 Trigger를 누르면 Drawer가 열리며 입력하고 선택할 수 있다", async () => {
    mockUseMediaQuery.mockReturnValue(false);
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <LedgerTitleCombobox
        value=""
        placeholder="예: 점심, 커피"
        onValueChange={onValueChange}
      />,
    );

    // Trigger button should be rendered on mobile instead of direct input
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("예: 점심, 커피");

    await user.click(trigger);

    // Drawer opens with a title input
    const drawerInput = await screen.findByPlaceholderText("내용 입력");
    await user.type(drawerInput, "마트");

    const suggestion = await screen.findByText("마트");
    await user.click(suggestion);

    expect(onValueChange).toHaveBeenCalledWith("마트");
  });
});
