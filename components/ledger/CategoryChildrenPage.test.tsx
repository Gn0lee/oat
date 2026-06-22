import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "@/types";
import { CategoryChildrenPage } from "./CategoryChildrenPage";

const createCategory = vi.fn();

vi.mock("./CategoryFormDialog", () => ({
  CategoryFormDialog: ({
    open,
    parentId,
  }: {
    open: boolean;
    parentId?: string | null;
  }) =>
    open ? (
      <div data-parent-id={parentId} data-testid="category-form-dialog" />
    ) : null,
}));

vi.mock("./CategoryDeleteDialog", () => ({
  CategoryDeleteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="category-delete-dialog" /> : null,
}));

vi.mock("./CategoryIcon", () => ({
  CategoryIcon: ({ iconName }: { iconName: string | null }) => (
    <span>Icon: {iconName}</span>
  ),
}));

vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({ data: children, isLoading: false }),
  useCreateCategory: () => ({ mutateAsync: createCategory, isPending: false }),
}));

const parent: Category = {
  id: "parent-1",
  household_id: "house-1",
  name: "식비",
  type: "expense",
  icon: "Utensils",
  parent_id: null,
  is_system: true,
  display_order: 0,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
};

const children: Category[] = [
  {
    ...parent,
    id: "child-1",
    name: "외식",
    icon: "Store",
    parent_id: "parent-1",
    is_system: false,
  },
];

describe("CategoryChildrenPage", () => {
  it("parent name과 child categories를 보여준다", () => {
    render(<CategoryChildrenPage parent={parent} />);

    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByText("외식")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "카테고리" })).toBeNull();
  });

  it("child create dialog를 parentId와 함께 연다", () => {
    render(<CategoryChildrenPage parent={parent} />);

    fireEvent.click(screen.getByRole("button", { name: "세부 카테고리 추가" }));

    expect(screen.getByTestId("category-form-dialog")).toHaveAttribute(
      "data-parent-id",
      "parent-1",
    );
  });

  it("custom child edit/delete actions를 제공한다", async () => {
    const user = userEvent.setup();
    render(<CategoryChildrenPage parent={parent} />);

    await user.click(screen.getByRole("button", { name: /메뉴 열기/i }));

    expect(await screen.findByText("수정")).toBeInTheDocument();
    expect(await screen.findByText("삭제")).toBeInTheDocument();
  });
});
