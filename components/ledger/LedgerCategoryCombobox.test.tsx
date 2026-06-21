import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LedgerCategoryCombobox } from "./LedgerCategoryCombobox";

const mutateAsync = vi.fn();

vi.mock("@/hooks/use-categories", () => ({
  useCreateCategory: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = () => undefined;
});

describe("LedgerCategoryCombobox", () => {
  const category = {
    id: "cat-1",
    household_id: "household-1",
    type: "expense" as const,
    name: "식비",
    icon: "utensils",
    parent_id: null,
    display_order: 1,
    is_system: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  const childCategory = {
    ...category,
    id: "cat-child",
    name: "외식",
    icon: "store",
    parent_id: "cat-1",
    display_order: 0,
    is_system: false,
  };

  it("child option은 Parent > Child label로 렌더링하고 선택할 수 있다", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <LedgerCategoryCombobox
        value=""
        categories={[category, childCategory]}
        type="expense"
        placeholder="선택"
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("식비 > 외식"));

    expect(onValueChange).toHaveBeenCalledWith("cat-child");
  });

  it("inline creation UI links to category management for child categories", async () => {
    const user = userEvent.setup();

    render(
      <LedgerCategoryCombobox
        value=""
        categories={[category]}
        type="expense"
        placeholder="선택"
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(
      screen.getByRole("link", { name: "세부 카테고리 관리" }),
    ).toHaveAttribute("href", "/ledger/categories");
  });

  it("검색어가 있으면 새 카테고리 추가 dialog를 열 수 있다", async () => {
    const user = userEvent.setup();

    render(
      <LedgerCategoryCombobox
        value=""
        categories={[category]}
        type="expense"
        placeholder="선택"
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.type(
      screen.getByPlaceholderText("카테고리 이름 검색"),
      "반려동물",
    );
    await user.click(
      screen.getAllByRole("button", {
        name: '"반려동물" 새 카테고리 추가',
      })[0],
    );

    expect(
      screen.getByRole("dialog", { name: "새 카테고리" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("카테고리명")).toHaveValue("반려동물");
  });

  it("새 카테고리를 추가하면 반환된 id를 즉시 선택한다", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    mutateAsync.mockResolvedValueOnce({
      ...category,
      id: "cat-new",
      name: "반려동물",
      icon: null,
      is_system: false,
    });

    render(
      <LedgerCategoryCombobox
        value=""
        categories={[category]}
        type="expense"
        placeholder="선택"
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.type(
      screen.getByPlaceholderText("카테고리 이름 검색"),
      "반려동물",
    );
    await user.click(
      screen.getAllByRole("button", {
        name: '"반려동물" 새 카테고리 추가',
      })[0],
    );
    await user.click(screen.getByRole("button", { name: "추가" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      type: "expense",
      name: "반려동물",
      icon: null,
    });
    expect(onValueChange).toHaveBeenCalledWith("cat-new");
  });
});
