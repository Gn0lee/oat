import type { SupabaseClient } from "@supabase/supabase-js";
import { formatKst } from "@/lib/date";
import type { Database, Transaction } from "@/types";
import { createUserNotification } from "./notifications";

type StockNotificationTransaction = Pick<
  Transaction,
  | "id"
  | "household_id"
  | "owner_id"
  | "ticker"
  | "type"
  | "quantity"
  | "transacted_at"
>;

interface StockNotificationBaseInput {
  actorId: string;
}

interface StockTransactionCreatedInput extends StockNotificationBaseInput {
  householdId: string;
  transaction: StockNotificationTransaction;
}

interface BatchStockTransactionsCreatedInput
  extends StockNotificationBaseInput {
  householdId: string;
  transactions: StockNotificationTransaction[];
}

interface StockTransactionChangedInput extends StockNotificationBaseInput {
  transaction: StockNotificationTransaction;
}

async function getHouseholdNotificationRecipients(
  supabase: SupabaseClient<Database>,
  householdId: string,
  actorId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId)
    .neq("user_id", actorId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((member) => member.user_id);
}

async function getActorName(
  supabase: SupabaseClient<Database>,
  actorId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", actorId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.name || "가구 구성원";
}

function getStockTransactionDate(
  transaction: StockNotificationTransaction,
): string {
  return formatKst(transaction.transacted_at);
}

function getTransactionTypeLabel(type: Transaction["type"]): string {
  return type === "buy" ? "매수" : "매도";
}

function formatQuantity(quantity: number): string {
  return quantity.toLocaleString("ko-KR");
}

async function createStockTransactionNotifications(
  supabase: SupabaseClient<Database>,
  input: {
    actorId: string;
    householdId: string;
    type: "stock_transaction_created" | "stock_transaction_changed";
    title: string;
    body: string;
    date: string;
    source: {
      type: "stock_transaction";
      id: string;
    } | null;
    dedupeKey: string;
  },
): Promise<void> {
  const [recipients, actorName] = await Promise.all([
    getHouseholdNotificationRecipients(
      supabase,
      input.householdId,
      input.actorId,
    ),
    getActorName(supabase, input.actorId),
  ]);

  await Promise.all(
    recipients.map((recipientId) =>
      createUserNotification({
        recipientId,
        householdId: input.householdId,
        type: input.type,
        title: input.title,
        body: input.body.replace("{actorName}", actorName),
        link: input.source
          ? {
              kind: "stock_transaction_detail",
              params: { transactionId: input.source.id },
            }
          : {
              kind: "stock_record_date",
              params: { date: input.date },
            },
        source: input.source,
        dedupeKey: input.dedupeKey,
      }),
    ),
  );
}

async function runBestEffort(
  operation: () => Promise<void>,
  context: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    console.error(
      `Stock transaction notification creation error (${context}):`,
      error,
    );
  }
}

export async function notifyStockTransactionCreated(
  supabase: SupabaseClient<Database>,
  input: StockTransactionCreatedInput,
): Promise<void> {
  await runBestEffort(
    () =>
      createStockTransactionNotifications(supabase, {
        actorId: input.actorId,
        householdId: input.householdId,
        type: "stock_transaction_created",
        title: "새 주식 거래가 추가되었습니다",
        body: `{actorName}님이 ${input.transaction.ticker} ${getTransactionTypeLabel(input.transaction.type)} ${formatQuantity(input.transaction.quantity)}주를 추가했습니다.`,
        date: getStockTransactionDate(input.transaction),
        source: { type: "stock_transaction", id: input.transaction.id },
        dedupeKey: `stock_transaction_created:${input.transaction.id}`,
      }),
    "created",
  );
}

export async function notifyBatchStockTransactionsCreated(
  supabase: SupabaseClient<Database>,
  input: BatchStockTransactionsCreatedInput,
): Promise<void> {
  if (input.transactions.length === 0) return;

  const latestTransaction = [...input.transactions].sort((a, b) =>
    b.transacted_at.localeCompare(a.transacted_at),
  )[0];
  if (!latestTransaction) return;

  const latestDate = getStockTransactionDate(latestTransaction);
  const count = input.transactions.length;

  await runBestEffort(
    () =>
      createStockTransactionNotifications(supabase, {
        actorId: input.actorId,
        householdId: input.householdId,
        type: "stock_transaction_created",
        title: `주식 거래 ${count}건이 추가되었습니다`,
        body: `{actorName}님이 ${latestDate} 기준 주식 거래 ${count}건을 추가했습니다.`,
        date: latestDate,
        source: null,
        dedupeKey: `stock_transaction_batch_created:${input.actorId}:${input.transactions
          .map((transaction) => transaction.id)
          .join(",")}`,
      }),
    "batch-created",
  );
}

export async function notifyStockTransactionUpdated(
  supabase: SupabaseClient<Database>,
  input: StockTransactionChangedInput,
): Promise<void> {
  await runBestEffort(
    () =>
      createStockTransactionNotifications(supabase, {
        actorId: input.actorId,
        householdId: input.transaction.household_id,
        type: "stock_transaction_changed",
        title: "주식 거래가 수정되었습니다",
        body: `{actorName}님이 ${input.transaction.ticker} ${getTransactionTypeLabel(input.transaction.type)} 기록을 수정했습니다.`,
        date: getStockTransactionDate(input.transaction),
        source: { type: "stock_transaction", id: input.transaction.id },
        dedupeKey: `stock_transaction_updated:${input.transaction.id}:${Date.now()}`,
      }),
    "updated",
  );
}

export async function notifyStockTransactionDeleted(
  supabase: SupabaseClient<Database>,
  input: StockTransactionChangedInput,
): Promise<void> {
  await runBestEffort(
    () =>
      createStockTransactionNotifications(supabase, {
        actorId: input.actorId,
        householdId: input.transaction.household_id,
        type: "stock_transaction_changed",
        title: "주식 거래가 삭제되었습니다",
        body: `{actorName}님이 ${input.transaction.ticker} ${getTransactionTypeLabel(input.transaction.type)} 기록을 삭제했습니다.`,
        date: getStockTransactionDate(input.transaction),
        source: { type: "stock_transaction", id: input.transaction.id },
        dedupeKey: `stock_transaction_deleted:${input.transaction.id}`,
      }),
    "deleted",
  );
}
