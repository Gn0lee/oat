import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MultiTransactionFormData } from "@/schemas/multi-transaction-form";
import { MultiTransactionForm } from "./MultiTransactionForm";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  setEditIndex: vi.fn(),
  simulateQueryNull: vi.fn(),
  historyBack: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("nuqs", async () => {
  const React = await import("react");
  return {
    parseAsInteger: {},
    useQueryState: () => {
      const [value, setValue] = React.useState<number | null>(null);
      const setter = React.useCallback(
        (next: number | null, options?: { history?: string }) => {
          mocks.setEditIndex(next, options);
          setValue(next);
          const url = new URL(window.location.href);
          if (next === null) url.searchParams.delete("editIndex");
          else url.searchParams.set("editIndex", String(next));
          const href = `${url.pathname}${url.search}`;
          if (options?.history === "push") {
            window.history.pushState({}, "", href);
          } else {
            window.history.replaceState({}, "", href);
          }
          return Promise.resolve(new URLSearchParams(url.search));
        },
        [],
      );
      mocks.simulateQueryNull.mockImplementation(() => setValue(null));
      return [value, setter] as const;
    },
  };
});
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => false }));
vi.mock("@/hooks/use-transaction", () => ({
  useCreateBatchTransactions: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (
    <div role="dialog" hidden={!open}>
      {children}
      {open && (
        <button type="button" onClick={() => onOpenChange(false)}>
          Dismiss drawer
        </button>
      )}
    </div>
  ),
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/components/transactions/StockComposerListStep", () => ({
  StockComposerListStep: ({
    onEditItem,
    onSubmit,
  }: {
    onEditItem: (index: number, isNew?: boolean) => void;
    onSubmit: (data: MultiTransactionFormData) => void | Promise<void>;
  }) => {
    const form = useFormContext<MultiTransactionFormData>();
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            form.setValue("type", "buy");
            form.setValue("transactedAt", "2026-10-02");
            form.setValue("accountId", "global-account");
            form.setValue("items", payloadItems);
          }}
        >
          Seed valid items
        </button>
        <button type="button" onClick={form.handleSubmit(onSubmit)}>
          Submit
        </button>
        <button type="button" onClick={() => window.history.back()}>
          Browser Back
        </button>
        <button
          type="button"
          onClick={() => {
            form.setValue("accountId", "");
            form.setValue("items", [initialItem]);
            onEditItem(0);
          }}
        >
          Edit with row account
        </button>
        <button
          type="button"
          onClick={() =>
            form.setValue("items", [...form.getValues("items"), blankItem])
          }
        >
          Append partial row
        </button>
        <button
          type="button"
          onClick={() => {
            const index = form.getValues("items").length;
            form.setValue(`items.${index}`, blankItem);
            onEditItem(index, true);
          }}
        >
          Add draft
        </button>
        <button
          type="button"
          onClick={() => {
            form.setValue("type", "buy");
            form.setValue("items", [initialItem]);
            onEditItem(0);
          }}
        >
          Edit existing
        </button>
        <button type="button" onClick={() => onEditItem(0)}>
          Reopen existing
        </button>
        <output data-testid="form-state">{JSON.stringify(form.watch())}</output>
        <output data-testid="form-errors">
          {JSON.stringify(form.formState.errors)}
        </output>
      </div>
    );
  },
}));
vi.mock("@/components/transactions/StockComposerFormStep", () => ({
  StockComposerFormStep: ({
    index,
    onBack,
    onCancel,
  }: {
    index: number;
    onBack: () => void;
    onCancel: () => void;
  }) => {
    const form = useFormContext<MultiTransactionFormData>();
    const [stage, setStage] = useState(1);
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            form.setValue(`items.${index}.memo`, "edited memo");
            form.setValue("type", "sell");
            setStage(2);
          }}
        >
          Change item
        </button>
        <button type="button" onClick={onCancel}>
          Cancel edit
        </button>
        <button type="button" onClick={onBack}>
          Confirm edit
        </button>
        <output data-testid="editor-stage">{stage}</output>
      </div>
    );
  },
}));

const initialItem = {
  stock: {
    code: "OLD",
    name: "Old stock",
    market: "KR" as const,
    exchange: null,
  },
  quantity: "1",
  price: "10",
  memo: "original memo",
  transactedAt: "2026-09-30",
  accountId: "row-account",
};
const blankItem = {
  stock: null,
  quantity: "",
  price: "",
  memo: "",
  transactedAt: undefined,
  accountId: undefined,
};
const payloadItems = [
  {
    stock: {
      code: "005930",
      name: "Samsung",
      market: "KR" as const,
      exchange: null,
    },
    quantity: "1.5",
    price: "0",
    memo: "kr memo",
    transactedAt: "2026-10-01",
    accountId: "kr-account",
  },
  {
    stock: {
      code: "AAPL",
      name: "Apple",
      market: "US" as const,
      exchange: "NASDAQ",
    },
    quantity: "2.25",
    price: "123.45",
    memo: "us memo",
    transactedAt: undefined,
    accountId: undefined,
  },
];

function renderForm({
  mode = "full",
  defaultAccountId = "global-account",
}: {
  mode?: "full" | "daily";
  defaultAccountId?: string;
} = {}) {
  render(
    <MultiTransactionForm
      mode={mode}
      defaultDate="2026-10-02"
      defaultAccountId={defaultAccountId}
      ownerId="owner-1"
    />,
  );
}

function readState() {
  return JSON.parse(
    screen.getByTestId("form-state").textContent ?? "{}",
  ) as MultiTransactionFormData;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
  mocks.simulateQueryNull.mockReset();
  mocks.simulateQueryNull.mockImplementation(() => undefined);
  vi.spyOn(window.history, "back").mockImplementation(() => {
    mocks.historyBack();
    const url = new URL(window.location.href);
    url.searchParams.delete("editIndex");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    mocks.simulateQueryNull();
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  mocks.mutateAsync.mockResolvedValue(undefined);
});

describe("MultiTransactionForm", () => {
  it("maps all validated rows and preserves row overrides, fractions, memo, and zero price", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Seed valid items" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      type: "buy",
      transactedAt: new Date("2026-10-02").toISOString(),
      accountId: "global-account",
      items: [
        {
          ticker: "005930",
          quantity: 1.5,
          price: 0,
          memo: "kr memo",
          transactedAt: new Date("2026-10-01").toISOString(),
          accountId: "kr-account",
          stock: {
            name: "Samsung",
            market: "KR",
            currency: "KRW",
            assetType: "equity",
          },
        },
        {
          ticker: "AAPL",
          quantity: 2.25,
          price: 123.45,
          memo: "us memo",
          transactedAt: new Date("2026-10-02").toISOString(),
          accountId: "global-account",
          stock: {
            name: "Apple",
            market: "US",
            currency: "USD",
            assetType: "equity",
          },
        },
      ],
    });
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/assets/stock/transactions"),
    );
  });

  it("blocks submission when a partial row sits beside a valid one", async () => {
    renderForm({ mode: "daily" });
    fireEvent.click(screen.getByRole("button", { name: "Seed valid items" }));
    fireEvent.click(screen.getByRole("button", { name: "Append partial row" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByTestId("form-errors").textContent).toContain("종목");
    });
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("keeps the same payload after a failed request and retry", async () => {
    mocks.mutateAsync
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(undefined);
    renderForm({ mode: "daily" });
    fireEvent.click(screen.getByRole("button", { name: "Seed valid items" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith("network error"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(2));
    expect(mocks.mutateAsync.mock.calls[1][0]).toEqual(
      mocks.mutateAsync.mock.calls[0][0],
    );
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/assets/stock/records?date=2026-10-02",
      ),
    );
  });

  it("guards rapid duplicate submits", async () => {
    let resolveMutation!: () => void;
    mocks.mutateAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveMutation = resolve;
        }),
    );
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Seed valid items" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    resolveMutation();
  });

  it("removes a cancelled new draft", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Add draft" }));
    expect(mocks.setEditIndex).toHaveBeenCalledWith(0, { history: "push" });
    fireEvent.click(await screen.findByRole("button", { name: "Cancel edit" }));

    await waitFor(() => expect(readState().items).toEqual([]));
  });

  it("keeps a draft when nuqs briefly reports null without a popstate", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Add draft" }));
    await screen.findByRole("button", { name: "Cancel edit" });

    act(() => mocks.simulateQueryNull());
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel edit" })).toBeVisible();
    expect(readState().items).toEqual([blankItem]);
    expect(mocks.historyBack).not.toHaveBeenCalled();
  });

  it("cancels and removes a new draft on browser Back", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Add draft" }));
    await screen.findByRole("button", { name: "Cancel edit" });

    fireEvent.click(screen.getByRole("button", { name: "Browser Back" }));
    await waitFor(() => expect(readState().items).toEqual([]));
    expect(mocks.historyBack).toHaveBeenCalledTimes(1);
  });

  it("cancels an existing edit when the drawer is dismissed", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Edit existing" }));
    fireEvent.click(await screen.findByRole("button", { name: "Change item" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss drawer" }));

    await waitFor(() => {
      expect(readState().items).toEqual([initialItem]);
      expect(readState().type).toBe("buy");
    });
  });

  it("restores an existing item and global type on cancel, and retains confirmed edits", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Edit existing" }));
    fireEvent.click(await screen.findByRole("button", { name: "Change item" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
    await waitFor(() => {
      expect(readState().items).toEqual([initialItem]);
      expect(readState().type).toBe("buy");
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit existing" }));
    fireEvent.click(await screen.findByRole("button", { name: "Change item" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm edit" }));
    await waitFor(() => {
      expect(readState().items[0].memo).toBe("edited memo");
      expect(readState().type).toBe("sell");
    });
  });

  it("adopts the selected row account when the batch account is empty", async () => {
    renderForm({ defaultAccountId: "" });
    fireEvent.click(
      screen.getByRole("button", { name: "Edit with row account" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Confirm edit" }),
    );

    await waitFor(() => expect(readState().accountId).toBe("row-account"));
  });

  it("reopens a completed edit at the first editor stage with values retained", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Edit existing" }));
    fireEvent.click(await screen.findByRole("button", { name: "Change item" }));
    expect(screen.getByTestId("editor-stage")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "Confirm edit" }));
    await waitFor(() => expect(mocks.historyBack).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Reopen existing" }));
    await waitFor(() =>
      expect(screen.getByTestId("editor-stage")).toHaveTextContent("1"),
    );
    expect(readState().items[0].memo).toBe("edited memo");
  });
});
