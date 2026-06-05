import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  notifyBatchStockTransactionsCreated,
  notifyStockTransactionCreated,
  notifyStockTransactionDeleted,
  notifyStockTransactionUpdated,
} from "@/lib/api/stock-transaction-notifications";
import {
  createBatchTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/api/transaction";
import { createClient } from "@/lib/supabase/server";
import {
  DELETE as deleteTransactionRoute,
  PATCH as patchTransactionRoute,
} from "./[id]/route";
import { POST as postBatchTransactions } from "./batch/route";
import { POST as postTransaction } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/api/invitation", () => ({
  getUserHouseholdId: vi.fn(),
}));

vi.mock("@/lib/api/transaction", () => ({
  createTransaction: vi.fn(),
  createBatchTransactions: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getTransactionById: vi.fn(),
}));

vi.mock("@/lib/api/stock-transaction-notifications", () => ({
  notifyStockTransactionCreated: vi.fn().mockResolvedValue(undefined),
  notifyBatchStockTransactionsCreated: vi.fn().mockResolvedValue(undefined),
  notifyStockTransactionUpdated: vi.fn().mockResolvedValue(undefined),
  notifyStockTransactionDeleted: vi.fn().mockResolvedValue(undefined),
}));

const createClientMock = vi.mocked(createClient);
const getUserHouseholdIdMock = vi.mocked(getUserHouseholdId);
const createTransactionMock = vi.mocked(createTransaction);
const createBatchTransactionsMock = vi.mocked(createBatchTransactions);
const updateTransactionMock = vi.mocked(updateTransaction);
const deleteTransactionMock = vi.mocked(deleteTransaction);
const notifyStockTransactionCreatedMock = vi.mocked(
  notifyStockTransactionCreated,
);
const notifyBatchStockTransactionsCreatedMock = vi.mocked(
  notifyBatchStockTransactionsCreated,
);
const notifyStockTransactionUpdatedMock = vi.mocked(
  notifyStockTransactionUpdated,
);
const notifyStockTransactionDeletedMock = vi.mocked(
  notifyStockTransactionDeleted,
);

const user = { id: "00000000-0000-4000-8000-000000000001" };
const householdId = "00000000-0000-4000-8000-000000000010";
const accountId = "00000000-0000-4000-8000-000000000020";
const transactionId = "00000000-0000-4000-8000-000000000030";

const transaction = {
  id: transactionId,
  household_id: householdId,
  owner_id: user.id,
  ticker: "AAPL",
  type: "buy" as const,
  quantity: 3,
  price: 195.5,
  transacted_at: "2026-06-03T03:00:00.000Z",
  memo: null,
  account_id: accountId,
  created_at: "2026-06-03T03:10:00.000Z",
};

function createSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

function createJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/transactions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("transaction routes stock notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(createSupabaseMock() as never);
    getUserHouseholdIdMock.mockResolvedValue(householdId);
  });

  it("단건 거래 생성 성공 후 생성 알림 helper를 호출한다", async () => {
    createTransactionMock.mockResolvedValue(transaction);

    await postTransaction(
      createJsonRequest({
        ticker: "AAPL",
        type: "buy",
        quantity: 3,
        price: 195.5,
        transactedAt: "2026-06-03T03:00:00.000Z",
        accountId,
        stock: {
          name: "Apple",
          market: "US",
          currency: "USD",
          assetType: "equity",
        },
      }),
    );

    expect(notifyStockTransactionCreatedMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: user.id,
        householdId,
        transaction,
      },
    );
  });

  it("batch 거래 생성 성공 후 batch 생성 알림 helper를 호출한다", async () => {
    createBatchTransactionsMock.mockResolvedValue([transaction]);

    await postBatchTransactions(
      createJsonRequest({
        type: "buy",
        transactedAt: "2026-06-03T03:00:00.000Z",
        accountId,
        items: [
          {
            ticker: "AAPL",
            quantity: 3,
            price: 195.5,
            stock: {
              name: "Apple",
              market: "US",
              currency: "USD",
              assetType: "equity",
            },
          },
        ],
      }),
    );

    expect(notifyBatchStockTransactionsCreatedMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: user.id,
        householdId,
        transactions: [transaction],
      },
    );
  });

  it("거래 수정 성공 후 수정 알림 helper를 호출한다", async () => {
    updateTransactionMock.mockResolvedValue(transaction);

    await patchTransactionRoute(createJsonRequest({ quantity: 4 }), {
      params: Promise.resolve({ id: transactionId }),
    });

    expect(notifyStockTransactionUpdatedMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: user.id,
        transaction,
      },
    );
  });

  it("거래 삭제 성공 후 삭제 알림 helper를 호출한다", async () => {
    deleteTransactionMock.mockResolvedValue(transaction);

    await deleteTransactionRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: transactionId }),
    });

    expect(notifyStockTransactionDeletedMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        actorId: user.id,
        transaction,
      },
    );
  });
});
