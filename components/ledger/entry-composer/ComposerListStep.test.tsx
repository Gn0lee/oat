import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { ComposerListStep } from "./ComposerListStep";
import type { LedgerComposerFormValues } from "./LedgerEntryComposer";

vi.mock("@/hooks/use-categories", () => ({
  useCategories: (_type: string) => ({
    data: [
      { id: "category-1", name: "식비" },
      { id: "category-2", name: "급여" },
    ],
  }),
}));

vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({
    data: [{ id: "acc-1", name: "주거래 통장", balance: 100000 }],
  }),
}));

vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({
    data: [{ id: "pm-1", name: "토스뱅크", balance: 50000 }],
  }),
}));

interface WrapperProps {
  children: React.ReactNode;
  defaultValues?: Partial<LedgerComposerFormValues>;
}

function FormWrapper({ children, defaultValues }: WrapperProps) {
  const methods = useForm<LedgerComposerFormValues>({
    defaultValues: {
      defaultType: "expense",
      defaultIsShared: true,
      defaultDate: "2026-06-23",
      items: [],
      ...defaultValues,
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe("ComposerListStep", () => {
  it("아이템 목록의 태그 정책과 레이아웃 및 삭제 동작을 검증한다", () => {
    const onEditItemMock = vi.fn();
    const onSubmitMock = vi.fn();

    const items = [
      {
        type: "income" as const,
        isShared: true,
        amount: "9999999999",
        title: "사이드 프로젝트 선입금 아주아주아주긴가계부제목",
        categoryId: "category-2",
        transactedAt: "2026-06-23",
        tags: ["급여", "외주", "6월", "프로젝트", "정산"],
      },
    ];

    render(
      <FormWrapper defaultValues={{ items }}>
        <ComposerListStep
          mode="full"
          onEditItem={onEditItemMock}
          onSubmit={onSubmitMock}
          isSubmitting={false}
        />
      </FormWrapper>,
    );

    // Assert settled scope label "공용" appears
    expect(screen.getAllByText("공용").length).toBeGreaterThanOrEqual(2);

    // Assert all five tags are present
    expect(screen.getByText("#급여")).toBeInTheDocument();
    expect(screen.getByText("#외주")).toBeInTheDocument();
    expect(screen.getByText("#6월")).toBeInTheDocument();
    expect(screen.getByText("#프로젝트")).toBeInTheDocument();
    expect(screen.getByText("#정산")).toBeInTheDocument();

    // Assert '+' overflow chip is absent
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();

    // Assert full amount text is present
    expect(screen.getByText("+9,999,999,999원")).toBeInTheDocument();

    // Assert delete button has accessible name "내역 삭제"
    const deleteButton = screen.getByRole("button", { name: "내역 삭제" });
    expect(deleteButton).toBeInTheDocument();

    // Clicking delete removes the row and does not call onEditItem
    fireEvent.click(deleteButton);
    expect(onEditItemMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/사이드 프로젝트/)).toBeNull();
  });
});
