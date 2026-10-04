import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import {
  type MultiTransactionFormData,
  multiTransactionFormSchema,
} from "@/schemas/multi-transaction-form";
import { StockComposerFormStep } from "./StockComposerFormStep";

vi.mock("@/components/stocks/StockSearchDialog", () => ({
  StockSearchDialog: ({ onSelect }: { onSelect: (stock: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          code: "AAPL",
          name: "Apple",
          market: "US",
          exchange: "NASDAQ",
        })
      }
    >
      종목 선택
    </button>
  ),
}));

vi.mock("@/components/transactions/AccountSelector", () => ({
  AccountSelector: ({ name }: { name: `items.${number}.accountId` }) => {
    const form = useFormContext<MultiTransactionFormData>();
    return (
      <button type="button" onClick={() => form.setValue(name, "account-2")}>
        계좌 선택
      </button>
    );
  },
}));

vi.mock("@/components/ui/date-picker", () => ({
  DatePickerInput: ({
    id,
    value,
    onChange,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      id={id}
      aria-label="거래일"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function renderStep({
  mode = "full",
  isMobile = true,
  accountId = "account-1",
  date = "2026-05-31",
  itemDate = "2026-05-31",
}: {
  mode?: "full" | "daily";
  isMobile?: boolean;
  accountId?: string;
  date?: string;
  itemDate?: string;
} = {}) {
  const onBack = vi.fn();
  const onCancel = vi.fn();
  let readValues = () => ({}) as MultiTransactionFormData;

  function Wrapper() {
    const form = useForm<MultiTransactionFormData>({
      resolver: zodResolver(multiTransactionFormSchema),
      defaultValues: {
        type: "buy",
        transactedAt: date,
        accountId,
        items: [
          {
            stock: null,
            quantity: "",
            price: "",
            memo: "",
            transactedAt: itemDate,
            accountId: undefined,
          },
        ],
      },
    });
    readValues = form.getValues;
    return (
      <FormProvider {...form}>
        <StockComposerFormStep
          index={0}
          mode={mode}
          ownerId="user-1"
          isMobile={isMobile}
          onBack={onBack}
          onCancel={onCancel}
        />
      </FormProvider>
    );
  }

  render(<Wrapper />);
  return { onBack, onCancel, getValues: () => readValues() };
}

async function fillCore() {
  fireEvent.click(screen.getByRole("button", { name: "종목 선택" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: /수량/ }), {
    target: { value: "3" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: /단가/ }), {
    target: { value: "0" },
  });
}

describe("StockComposerFormStep", () => {
  it("requires core fields before next, while allowing a zero price", async () => {
    renderStep();

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByText("1/2")).toBeInTheDocument();

    await fillCore();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(screen.getByText("2/2")).toBeInTheDocument());
    expect(
      screen.getByRole("heading", { name: "매수 거래 확인" }),
    ).toHaveFocus();
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  it("keeps input when returning to the first screen and completes with details", async () => {
    const { onBack, onCancel, getValues } = renderStep({ mode: "daily" });
    await fillCore();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(screen.getByText("2/2")).toBeInTheDocument());

    fireEvent.change(screen.getByRole("textbox", { name: "거래일" }), {
      target: { value: "2026-06-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "계좌 선택" }));
    fireEvent.change(screen.getByRole("textbox", { name: "메모 (선택)" }), {
      target: { value: "정기 매수" },
    });
    fireEvent.click(screen.getByRole("button", { name: "핵심 입력으로" }));
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "거래 입력" })).toHaveFocus();
    expect(screen.getByRole("spinbutton", { name: /수량/ })).toHaveValue(3);

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(screen.getByText("2/2")).toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "메모 (선택)" })).toHaveValue(
      "정기 매수",
    );
    fireEvent.click(screen.getByRole("button", { name: "입력 완료" }));
    await waitFor(() => expect(onBack).toHaveBeenCalledOnce());
    expect(onCancel).not.toHaveBeenCalled();
    expect(getValues().items[0]).toMatchObject({
      quantity: "3",
      price: "0",
      transactedAt: "2026-06-01",
      accountId: "account-2",
      memo: "정기 매수",
    });
  });

  it("accepts a row account when the default account is empty", async () => {
    const { onBack } = renderStep({ accountId: "" });
    await fillCore();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(screen.getByText("2/2")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "계좌 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "입력 완료" }));
    await waitFor(() => expect(onBack).toHaveBeenCalledOnce());
  });

  it("shows an inline error and blocks completion without an effective account", async () => {
    const { onBack } = renderStep({ accountId: "" });
    await fillCore();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(screen.getByText("2/2")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "입력 완료" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "계좌 선택" })).toHaveFocus(),
    );
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByText("계좌를 선택해주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계좌 선택" })).toHaveFocus();
  });

  it("shows an inline error without an effective date", async () => {
    const { onBack } = renderStep({ date: "", itemDate: "" });
    await fillCore();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(screen.getByText("2/2")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "입력 완료" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "거래일" })).toHaveFocus(),
    );
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByText("거래일을 선택해주세요.")).toBeInTheDocument();
  });

  it("keeps desktop daily editing on one screen and delegates cancel", () => {
    const { onCancel } = renderStep({ mode: "daily", isMobile: false });

    expect(screen.queryByText("거래일")).not.toBeInTheDocument();
    expect(screen.getByText("계좌 선택")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "완료" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "입력 취소" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
