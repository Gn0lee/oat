import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "@/types";
import { CategoryList } from "./CategoryList";

const mocks = vi.hoisted(() => ({
  categories: [] as Category[],
}));

vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({ data: mocks.categories, isLoading: false }),
}));

vi.mock("./CategoryFormDialog", () => ({
  CategoryFormDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="category-form-dialog">
        CategoryFormDialog
        <button type="button" onClick={() => onOpenChange(false)}>
          Close
        </button>
      </div>
    );
  },
}));

vi.mock("./CategoryDeleteDialog", () => ({
  CategoryDeleteDialog: ({ open }: { open: boolean }) => {
    if (!open) return null;
    return <div data-testid="category-delete-dialog">CategoryDeleteDialog</div>;
  },
}));

vi.mock("./CategoryIcon", () => ({
  CategoryIcon: ({ iconName }: { iconName: string }) => (
    <span>Icon: {iconName}</span>
  ),
}));

const systemCategory: Category = {
  id: "cat-sys",
  household_id: "house-1",
  name: "식비",
  type: "expense",
  icon: "food",
  is_system: true,
  display_order: 0,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
};

const customCategory: Category = {
  id: "cat-cust",
  household_id: "house-1",
  name: "배달",
  type: "expense",
  icon: "delivery",
  is_system: false,
  display_order: 1,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
};

describe("CategoryList", () => {
  it("renders categories as grouped list rows", () => {
    mocks.categories = [systemCategory, customCategory];

    render(<CategoryList />);

    expect(screen.getByText("지출")).toBeInTheDocument();
    expect(screen.getByText("수입")).toBeInTheDocument();
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByText("배달")).toBeInTheDocument();
    expect(screen.getByText("Icon: food")).toBeInTheDocument();
    expect(screen.getByText("Icon: delivery")).toBeInTheDocument();
  });

  it("shows custom category edit and delete actions but keeps system category locked", () => {
    mocks.categories = [systemCategory, customCategory];

    render(<CategoryList />);

    // System category should show a lock/default indicator and no menus
    expect(screen.getByTestId("lock-icon")).toBeInTheDocument();

    // Custom category has menu trigger (e.g. MoreHorizontal or equivalent button)
    const menuButtons = screen.getAllByRole("button", { name: /메뉴 열기/i });
    expect(menuButtons).toHaveLength(1); // Only 1 custom category menu button
  });

  it("opens create dialog from the section header add action", () => {
    mocks.categories = [systemCategory];

    render(<CategoryList />);

    const addButton = screen.getByRole("button", { name: /추가/ });
    fireEvent.click(addButton);

    expect(screen.getByTestId("category-form-dialog")).toBeInTheDocument();
  });
});
