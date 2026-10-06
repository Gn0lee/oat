import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StockTradeComposer } from "./StockTradeComposer";

const routerPush = vi.fn();
const routerReplace = vi.fn();
const router = { push: routerPush, replace: routerReplace };
const media = vi.hoisted(() => ({ desktop: false }));
const { createBatch, toastSuccess, toastError } = vi.hoisted(() => ({
  createBatch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
const STOCKS = [
  {
    id: "stock-aapl",
    code: "AAPL",
    name: "Apple",
    name_en: null,
    market: "US",
    exchange: "NASDAQ",
  },
  {
    id: "stock-samsung",
    code: "005930",
    name: "삼성전자",
    name_en: null,
    market: "KR",
    exchange: "KOSPI",
  },
];
const ACCOUNT_A = "00000000-0000-4000-8000-00000000000a";
const ACCOUNT_B = "00000000-0000-4000-8000-00000000000b";

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/assets/stock/transactions/new/full",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => media.desktop,
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUserId: () => ({ userId: "user-1", isLoading: false }),
}));
vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({
    isLoading: false,
    data: [
      {
        id: ACCOUNT_A,
        name: "주식 계좌",
        broker: "키움",
        ownerId: "user-1",
        ownerName: "작성자",
        lastFour: null,
      },
      {
        id: ACCOUNT_B,
        name: "연금 계좌",
        broker: "미래",
        ownerId: "user-1",
        ownerName: "작성자",
        lastFour: null,
      },
      {
        id: "00000000-0000-4000-8000-00000000000c",
        name: "배우자 계좌",
        broker: "삼성",
        ownerId: "user-2",
        ownerName: "배우자",
        lastFour: null,
      },
    ],
  }),
  useCreateAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-stock-search", () => ({
  useStockSearch: ({ query }: { query: string }) => ({
    data: query ? STOCKS : [],
    isLoading: false,
    isFetching: false,
  }),
}));
vi.mock("@/hooks/use-transaction", () => ({
  useCreateBatchTransactions: () => ({
    mutateAsync: createBatch,
    isPending: false,
  }),
}));
vi.mock("@/components/transactions/MultiTransactionFormWrapper", () => ({
  MultiTransactionFormWrapper: () => <div>예전 데스크톱 입력</div>,
}));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

function renderComposer(
  props: { mode: "full" | "daily"; defaultDate?: string } = {
    mode: "full",
    defaultDate: "2026-06-05",
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StockTradeComposer {...props} />
    </QueryClientProvider>,
  );
}

async function pickStock(row: number, name: string) {
  const group = await screen.findByRole("group", { name: `종목 ${row}` });
  fireEvent.click(within(group).getByRole("button"));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(
    within(dialog).getByPlaceholderText("종목명, 티커, 초성으로 검색해보세요"),
    { target: { value: name } },
  );
  fireEvent.click(
    await within(dialog).findByRole(
      "option",
      { name: new RegExp(name) },
      { timeout: 2000 },
    ),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

async function fillRow(
  row: number,
  {
    type,
    stock,
    quantity,
    price,
  }: { type: "매수" | "매도"; stock: string; quantity: string; price: string },
) {
  fireEvent.click(
    within(
      await screen.findByRole("radiogroup", { name: `매수/매도 ${row}` }),
    ).getByRole("radio", { name: type }),
  );
  await pickStock(row, stock);
  fireEvent.change(screen.getByLabelText(`수량 ${row}`), {
    target: { value: quantity },
  });
  fireEvent.change(screen.getByLabelText(`단가 ${row}`), {
    target: { value: price },
  });
}

/** 매도 삼성전자 1건 + 매수 Apple 1건을 입력하고 거래일·계좌 단계로 간다. */
async function goToDateAccount() {
  await fillRow(1, {
    type: "매도",
    stock: "삼성전자",
    quantity: "2",
    price: "70000",
  });
  fireEvent.click(screen.getByRole("button", { name: "종목 추가" }));
  await fillRow(2, {
    type: "매수",
    stock: "Apple",
    quantity: "3",
    price: "195.5",
  });
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  return screen.findByRole("heading", { name: "거래일과 계좌" });
}

async function goToReview() {
  await goToDateAccount();
  fireEvent.click(screen.getByRole("button", { name: "입력 확인" }));
  return screen.findByRole("heading", { name: "입력 확인" });
}

async function pickAccount(name: RegExp) {
  fireEvent.click(screen.getByRole("combobox"));
  const picker = await screen.findByRole("dialog");
  fireEvent.click(within(picker).getByRole("option", { name }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("stock trade composer (mobile, several trades)", () => {
  beforeEach(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView = vi.fn();
    createBatch.mockReset();
    routerPush.mockReset();
    routerReplace.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    media.desktop = false;
    window.history.replaceState(null, "", window.location.href);
  });

  it("applies one date and account to every trade and saves mixed buy and sell rows", async () => {
    const user = userEvent.setup();
    createBatch.mockResolvedValue([]);
    renderComposer({ mode: "daily", defaultDate: "2026-06-05" });
    await goToDateAccount();
    expect(screen.queryByLabelText("거래일 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "거래일 1" }));
    await user.click(within(await screen.findByRole("grid")).getByText("8"));
    await user.keyboard("{Escape}");
    await pickAccount(/연금 계좌/);
    fireEvent.click(screen.getByRole("button", { name: "입력 확인" }));

    const review = (
      await screen.findByRole("heading", { name: "입력 확인" })
    ).closest("section") as HTMLElement;
    const [first, second] = within(review).getAllByRole("article");
    expect(
      within(first as HTMLElement).getByRole("button", {
        name: "거래 1 종목 수정: 매도 삼성전자",
      }),
    ).toBeInTheDocument();
    expect(
      within(first as HTMLElement).getByText("140,000원"),
    ).toBeInTheDocument();
    expect(
      within(second as HTMLElement).getByRole("button", {
        name: "거래 2 수량과 단가 수정: 3주 × US$195.50",
      }),
    ).toBeInTheDocument();
    expect(
      within(second as HTMLElement).getByText("US$586.50"),
    ).toBeInTheDocument();
    for (const row of [1, 2]) {
      expect(
        screen.getByRole("button", {
          name: `거래 ${row} 거래일 수정: 2026-06-08`,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: `거래 ${row} 계좌 수정: 연금 계좌`,
        }),
      ).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    const input = createBatch.mock.calls[0]?.[0];
    expect(input.items).toEqual([
      {
        type: "sell",
        ticker: "005930",
        quantity: 2,
        price: 70000,
        memo: undefined,
        transactedAt: "2026-06-08T00:00:00.000Z",
        accountId: ACCOUNT_B,
        stock: {
          name: "삼성전자",
          market: "KR",
          currency: "KRW",
          assetType: "equity",
        },
      },
      {
        type: "buy",
        ticker: "AAPL",
        quantity: 3,
        price: 195.5,
        memo: undefined,
        transactedAt: "2026-06-08T00:00:00.000Z",
        accountId: ACCOUNT_B,
        stock: {
          name: "Apple",
          market: "US",
          currency: "USD",
          assetType: "equity",
        },
      },
    ]);
    expect(input.requestId).toEqual(expect.any(String));
    expect(toastSuccess).toHaveBeenCalledWith("거래 2건이 저장되었습니다.");
    await waitFor(
      () =>
        expect(routerReplace).toHaveBeenCalledWith(
          "/assets/stock/records?date=2026-06-08",
        ),
      { timeout: 3000 },
    );
  });

  it("removes a row and takes the one-trade path from the remaining count", async () => {
    renderComposer();
    await fillRow(1, {
      type: "매수",
      stock: "Apple",
      quantity: "3",
      price: "195.5",
    });
    fireEvent.click(screen.getByRole("button", { name: "종목 추가" }));
    expect(screen.getByLabelText("수량 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2번째 거래 삭제" }));
    expect(screen.queryByLabelText("수량 2")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "1번째 거래 삭제" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByRole("heading", { name: "상세 입력" }),
    ).toBeInTheDocument();
  });

  it("keeps the rows after the deleted one and their values", async () => {
    renderComposer();
    fireEvent.click(await screen.findByRole("button", { name: "종목 추가" }));
    fireEvent.change(screen.getByLabelText("수량 2"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "1번째 거래 삭제" }));
    expect(screen.getByLabelText("수량 1")).toHaveValue(7);
  });

  it("stops adding rows at 20", async () => {
    renderComposer();
    const add = await screen.findByRole("button", { name: "종목 추가" });
    for (let count = 1; count < 20; count += 1) fireEvent.click(add);
    expect(screen.getByLabelText("수량 20")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "종목 추가" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("한 번에 최대 20건까지 입력할 수 있어요."),
    ).toBeInTheDocument();
  });

  it("validates every row in Basics and focuses the first missing value", async () => {
    renderComposer();
    await fillRow(1, {
      type: "매수",
      stock: "Apple",
      quantity: "3",
      price: "195.5",
    });
    fireEvent.click(screen.getByRole("button", { name: "종목 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByText("매수 또는 매도를 선택해 주세요."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("radiogroup", { name: "매수/매도 2" }),
        ).getByRole("radio", { name: "매수" }),
      ).toHaveFocus(),
    );
    expect(
      screen.queryByRole("heading", { name: "거래일과 계좌" }),
    ).not.toBeInTheDocument();
  });

  it("changes only one trade's account from Review and returns to where it was", async () => {
    createBatch.mockResolvedValue([]);
    renderComposer();
    await goToReview();

    fireEvent.click(
      screen.getByRole("button", { name: "거래 2 계좌 수정: 주식 계좌" }),
    );
    expect(
      await screen.findByRole("heading", { name: "거래일과 계좌" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "거래일 2" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "거래일 1" }),
    ).not.toBeInTheDocument();
    await pickAccount(/연금 계좌/);
    fireEvent.click(screen.getByRole("button", { name: "입력 확인" }));

    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "거래 2 계좌 수정: 연금 계좌" }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByRole("button", { name: "거래 1 계좌 수정: 주식 계좌" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    const items = createBatch.mock.calls[0]?.[0].items;
    expect(items.map((item: { accountId: string }) => item.accountId)).toEqual([
      ACCOUNT_A,
      ACCOUNT_B,
    ]);
  });

  it("changes only one trade's quantity from Review, validating it before returning", async () => {
    createBatch.mockResolvedValue([]);
    renderComposer();
    await goToReview();

    fireEvent.click(
      screen.getByRole("button", {
        name: "거래 1 수량과 단가 수정: 2주 × 70,000원",
      }),
    );
    const quantity = await screen.findByLabelText("수량 1");
    expect(screen.queryByLabelText("수량 2")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "종목 추가" }),
    ).not.toBeInTheDocument();
    fireEvent.change(quantity, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      await screen.findByText("유효한 수량을 입력해 주세요."),
    ).toBeInTheDocument();
    await waitFor(() => expect(quantity).toHaveFocus());
    fireEvent.change(quantity, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "거래 1 수량과 단가 수정: 5주 × 70,000원",
        }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByRole("button", {
        name: "거래 2 수량과 단가 수정: 3주 × US$195.50",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    const items = createBatch.mock.calls[0]?.[0].items;
    expect(items.map((item: { quantity: number }) => item.quantity)).toEqual([
      5, 3,
    ]);
  });

  it("takes a memo per trade inline in Review", async () => {
    createBatch.mockResolvedValue([]);
    renderComposer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: "메모 2 추가" }));
    fireEvent.change(screen.getByLabelText("메모 2"), {
      target: { value: "리밸런싱 매수" },
    });
    expect(screen.queryByLabelText("메모 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    const items = createBatch.mock.calls[0]?.[0].items;
    expect(items.map((item: { memo?: string }) => item.memo)).toEqual([
      undefined,
      "리밸런싱 매수",
    ]);
  });

  it("adds a trade from Review in Basics and comes back to Review with it", async () => {
    createBatch.mockResolvedValue([]);
    renderComposer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: "종목 추가" }));
    expect(await screen.findByLabelText("수량 3")).toBeInTheDocument();
    expect(screen.queryByLabelText("수량 1")).not.toBeInTheDocument();
    await fillRow(3, {
      type: "매수",
      stock: "삼성전자",
      quantity: "1",
      price: "71000",
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "거래 3 종목 수정: 매수 삼성전자" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    expect(createBatch.mock.calls[0]?.[0].items).toHaveLength(3);
  });

  it("guides a save with a missing value to the first incomplete trade's step", async () => {
    renderComposer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: "종목 추가" }));
    await screen.findByLabelText("수량 3");
    fireEvent(window, new CustomEvent("oat:composer-back"));
    expect(
      await screen.findByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    expect(await screen.findByLabelText("수량 3")).toBeInTheDocument();
    expect(screen.queryByLabelText("수량 1")).not.toBeInTheDocument();
    expect(
      screen.getByText("매수 또는 매도를 선택해 주세요."),
    ).toBeInTheDocument();
    expect(createBatch).not.toHaveBeenCalled();
  });

  it("keeps Review and every value after a short-sell error from the server", async () => {
    createBatch.mockRejectedValueOnce(
      new Error("해당 계좌의 보유 수량이 부족합니다."),
    );
    renderComposer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: "모두 저장" }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "해당 계좌의 보유 수량이 부족합니다.",
      ),
    );
    expect(
      screen.getByRole("heading", { name: "입력 확인" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "거래 1 종목 수정: 매도 삼성전자" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "모두 저장" }),
    ).not.toBeDisabled();
  });

  it("saves once on a double tap of save all", async () => {
    let resolveSave: (value: unknown) => void = () => {};
    createBatch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    renderComposer();
    await goToReview();
    const save = screen.getByRole("button", { name: "모두 저장" });
    act(() => {
      save.click();
      save.click();
    });
    await waitFor(() => expect(createBatch).toHaveBeenCalledTimes(1));
    resolveSave([]);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(createBatch).toHaveBeenCalledTimes(1);
  });

  it("goes back from Review to the date-and-account step with header back", async () => {
    renderComposer();
    await goToReview();
    fireEvent(window, new CustomEvent("oat:composer-back"));
    expect(
      await screen.findByRole("heading", { name: "거래일과 계좌" }),
    ).toBeInTheDocument();
    fireEvent(window, new CustomEvent("oat:composer-back"));
    expect(await screen.findByLabelText("수량 2")).toHaveValue(3);
  });
});
