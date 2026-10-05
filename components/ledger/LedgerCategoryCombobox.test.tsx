import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LedgerCategoryCombobox,
  LedgerCategoryPickerPanel,
} from "./LedgerCategoryCombobox";

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

  beforeEach(() => mutateAsync.mockReset());

  it("parent 순서대로 각 child를 sibling 순서로 묶는다", async () => {
    const user = userEvent.setup();
    const transport = {
      ...category,
      id: "cat-2",
      name: "교통비",
      display_order: 2,
    };
    const grocery = {
      ...childCategory,
      id: "cat-grocery",
      name: "장보기",
      display_order: 1,
    };
    const taxi = {
      ...childCategory,
      id: "cat-taxi",
      name: "택시",
      parent_id: "cat-2",
      display_order: 0,
    };
    const dining = { ...childCategory, display_order: 2 };

    render(
      <LedgerCategoryCombobox
        value=""
        categories={[taxi, transport, dining, category, grocery]}
        type="expense"
        placeholder="선택"
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "식비",
      "식비 > 장보기",
      "식비 > 외식",
      "교통비",
      "교통비 > 택시",
    ]);
  });

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

  it("mobile create back returns to results without closing the picker", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <LedgerCategoryPickerPanel
        value=""
        categories={[category]}
        type="income"
        title="분류 선택"
        searchPlaceholder="분류 검색"
        onBack={onBack}
        onValueChange={() => undefined}
      />,
    );
    await user.type(screen.getByRole("combobox"), "급여");
    await user.click(
      screen
        .getAllByRole("button", { name: '"급여" 새 카테고리 추가' })
        .at(-1)!,
    );
    await user.click(
      screen.getByRole("button", { name: "카테고리 선택으로 돌아가기" }),
    );
    expect(screen.getByRole("combobox")).toHaveValue("급여");
    expect(onBack).not.toHaveBeenCalled();
  });

  it("keeps the entered name after inline category creation fails", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce(new Error("저장 실패"));
    render(
      <LedgerCategoryCombobox
        value=""
        categories={[category]}
        type="income"
        placeholder="선택"
        onValueChange={() => undefined}
      />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.type(
      screen.getByPlaceholderText("카테고리 이름 검색"),
      "부수입",
    );
    await user.click(
      screen
        .getAllByRole("button", { name: '"부수입" 새 카테고리 추가' })
        .at(-1)!,
    );
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(await screen.findByLabelText("카테고리명")).toHaveValue("부수입");
    expect(screen.getByText("저장 실패")).toBeInTheDocument();
    expect(mutateAsync).toHaveBeenCalledWith({
      type: "income",
      name: "부수입",
      icon: null,
    });
  });

  it("creates an income category and selects it immediately", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    mutateAsync.mockResolvedValueOnce({
      ...category,
      id: "income-new",
      name: "부수입",
      type: "income",
      icon: null,
      is_system: false,
    });
    render(
      <LedgerCategoryCombobox
        value=""
        categories={[category]}
        type="income"
        placeholder="선택"
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.type(
      screen.getByPlaceholderText("카테고리 이름 검색"),
      "부수입",
    );
    await user.click(
      screen
        .getAllByRole("button", { name: '"부수입" 새 카테고리 추가' })
        .at(-1)!,
    );
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      type: "income",
      name: "부수입",
      icon: null,
    });
    expect(onValueChange).toHaveBeenCalledWith("income-new");
  });
});
