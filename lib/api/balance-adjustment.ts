import type { SupabaseClient } from "@supabase/supabase-js";
import { getExchangeRateSafe } from "@/lib/api/exchange";
import { getHoldings } from "@/lib/api/holdings";
import { getStockPrices } from "@/lib/api/stock-price";
import { calculateHoldingValuation } from "@/lib/api/valuation";
import type {
  AccountCategory,
  AccountType,
  BalanceAdjustment,
  BalanceAdjustmentTargetType,
  Database,
  Json,
  PaymentMethodType,
} from "@/types";
import { APIError } from "./error";

const AUXILIARY_PAYMENT_METHOD_TYPES = new Set<PaymentMethodType>([
  "prepaid",
  "gift_card",
  "cash",
]);

export function isBalanceAdjustablePaymentMethodType(type: PaymentMethodType) {
  return AUXILIARY_PAYMENT_METHOD_TYPES.has(type);
}

export function getBalanceAdjustmentDelta(
  previousBalance: number,
  actualBalance: number,
) {
  return actualBalance - previousBalance;
}

export type BalanceTimelineItemKind =
  | "ledger"
  | "stock_transaction"
  | "balance_adjustment";

export interface BalanceTimelineItem {
  id: string;
  kind: BalanceTimelineItemKind;
  label: string;
  title: string;
  amount: number;
  delta: number;
  occurredAt: string;
  memo: string | null;
  meta: Record<string, Json>;
}

export interface AccountBalanceDetail {
  type: "account";
  account: {
    id: string;
    householdId: string;
    ownerId: string;
    ownerName: string;
    name: string;
    broker: string | null;
    lastFour: string | null;
    accountType: AccountType | null;
    category: AccountCategory | null;
    balance: number | null;
    balanceUpdatedAt: string | null;
    memo: string | null;
  };
  stockValue: number | null;
  totalValue: number | null;
  timeline: BalanceTimelineItem[];
}

export interface PaymentMethodBalanceDetail {
  type: "payment_method";
  paymentMethod: {
    id: string;
    householdId: string;
    ownerId: string;
    ownerName: string;
    name: string;
    type: PaymentMethodType;
    linkedAccountId: string | null;
    linkedAccountName: string | null;
    issuer: string | null;
    lastFour: string | null;
    paymentDay: number | null;
    balance: number | null;
    balanceUpdatedAt: string | null;
    memo: string | null;
  };
  timeline: BalanceTimelineItem[];
}

interface CreateBalanceAdjustmentParams {
  householdId: string;
  ownerId: string;
  targetType: BalanceAdjustmentTargetType;
  accountId?: string | null;
  paymentMethodId?: string | null;
  actualBalance: number;
  adjustedAt?: string;
  memo?: string | null;
}

function toNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function getAccountCategory(account: {
  category: AccountCategory | null;
  account_type: AccountType | null;
}): AccountCategory | null {
  if (account.category) return account.category;
  if (
    account.account_type === "checking" ||
    account.account_type === "savings" ||
    account.account_type === "deposit"
  ) {
    return "bank";
  }
  if (
    account.account_type === "stock" ||
    account.account_type === "isa" ||
    account.account_type === "pension" ||
    account.account_type === "cma"
  ) {
    return "investment";
  }
  return null;
}

function sortTimeline(items: BalanceTimelineItem[]) {
  return items.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

function mapLedgerLabel(type: string, delta: number) {
  if (type === "transfer") return delta >= 0 ? "입금" : "출금";
  if (type === "income") return "예수금 입금";
  return "지출";
}

async function fetchOwnerName(
  supabase: SupabaseClient<Database>,
  ownerId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", ownerId)
    .maybeSingle();
  return data?.name ?? "알 수 없음";
}

async function fetchAccountStockValue(
  supabase: SupabaseClient<Database>,
  householdId: string,
  accountId: string,
) {
  const holdingsResult = await getHoldings(supabase, householdId, {
    filters: { accountId },
    pagination: { page: 1, pageSize: 200 },
  });
  const holdings = holdingsResult.data;
  if (holdings.length === 0) return 0;

  const exchangeRateResult = await getExchangeRateSafe(supabase);
  const exchangeRate = exchangeRateResult?.rate ?? 1300;
  const stockPrices = await getStockPrices(
    supabase,
    holdings
      .filter((holding) => holding.market === "KR" || holding.market === "US")
      .map((holding) => ({
        market: holding.market as "KR" | "US",
        code: holding.ticker,
      })),
  );

  return holdings.reduce((sum, holding) => {
    const valuation = calculateHoldingValuation(
      {
        quantity: holding.quantity,
        avgPrice: holding.avgPrice,
        totalInvested: holding.totalInvested,
        currency: holding.currency,
      },
      stockPrices[`${holding.market}:${holding.ticker}`],
      exchangeRate,
    );
    return sum + valuation.currentValue;
  }, 0);
}

async function getAccountTimeline(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  accountId: string,
): Promise<BalanceTimelineItem[]> {
  const [{ data: ledgerRows }, { data: stockRows }, { data: adjustments }] =
    await Promise.all([
      supabase
        .from("ledger_entries")
        .select(
          "id,type,amount,title,memo,from_account_id,to_account_id,is_shared,owner_id,transacted_at,categories(name)",
        )
        .eq("household_id", householdId)
        .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
        .order("transacted_at", { ascending: false })
        .limit(80),
      supabase
        .from("transactions")
        .select("id,ticker,type,quantity,price,memo,transacted_at")
        .eq("household_id", householdId)
        .eq("account_id", accountId)
        .order("transacted_at", { ascending: false })
        .limit(80),
      supabase
        .from("balance_adjustments")
        .select("*")
        .eq("household_id", householdId)
        .eq("account_id", accountId)
        .order("adjusted_at", { ascending: false })
        .limit(80),
    ]);

  const ledgerItems =
    ledgerRows
      ?.filter((row) => row.is_shared || row.owner_id === userId)
      .map((row) => {
        const amount = toNumber(row.amount);
        const delta =
          row.to_account_id === accountId
            ? amount
            : row.from_account_id === accountId
              ? -amount
              : 0;
        const category = row.categories as { name: string } | null;
        return {
          id: row.id,
          kind: "ledger" as const,
          label: mapLedgerLabel(row.type, delta),
          title: row.title ?? category?.name ?? "가계부 기록",
          amount,
          delta,
          occurredAt: row.transacted_at,
          memo: row.memo,
          meta: {
            ledgerType: row.type,
            categoryName: category?.name ?? null,
          },
        };
      }) ?? [];

  const stockItems =
    stockRows?.map((row) => {
      const amount = toNumber(row.quantity) * toNumber(row.price);
      const delta = row.type === "buy" ? -amount : amount;
      return {
        id: row.id,
        kind: "stock_transaction" as const,
        label: row.type === "buy" ? "주식 매수" : "주식 매도",
        title: row.ticker,
        amount,
        delta,
        occurredAt: row.transacted_at,
        memo: row.memo,
        meta: {
          ticker: row.ticker,
          transactionType: row.type,
          quantity: toNumber(row.quantity),
          price: toNumber(row.price),
        },
      };
    }) ?? [];

  const adjustmentItems =
    adjustments?.map((row) => ({
      id: row.id,
      kind: "balance_adjustment" as const,
      label: "잔액 조정",
      title: row.title,
      amount: Math.abs(toNumber(row.delta)),
      delta: toNumber(row.delta),
      occurredAt: row.adjusted_at,
      memo: row.memo,
      meta: {
        previousBalance: toNumber(row.previous_balance),
        actualBalance: toNumber(row.actual_balance),
      },
    })) ?? [];

  return sortTimeline([...ledgerItems, ...stockItems, ...adjustmentItems]);
}

async function getPaymentMethodTimeline(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  paymentMethodId: string,
): Promise<BalanceTimelineItem[]> {
  const [{ data: ledgerRows }, { data: adjustments }] = await Promise.all([
    supabase
      .from("ledger_entries")
      .select(
        "id,type,amount,title,memo,from_payment_method_id,to_payment_method_id,is_shared,owner_id,transacted_at,categories(name)",
      )
      .eq("household_id", householdId)
      .or(
        `from_payment_method_id.eq.${paymentMethodId},to_payment_method_id.eq.${paymentMethodId}`,
      )
      .order("transacted_at", { ascending: false })
      .limit(80),
    supabase
      .from("balance_adjustments")
      .select("*")
      .eq("household_id", householdId)
      .eq("payment_method_id", paymentMethodId)
      .order("adjusted_at", { ascending: false })
      .limit(80),
  ]);

  const ledgerItems =
    ledgerRows
      ?.filter((row) => row.is_shared || row.owner_id === userId)
      .map((row) => {
        const amount = toNumber(row.amount);
        const delta =
          row.to_payment_method_id === paymentMethodId
            ? amount
            : row.from_payment_method_id === paymentMethodId
              ? -amount
              : 0;
        const category = row.categories as { name: string } | null;
        return {
          id: row.id,
          kind: "ledger" as const,
          label: mapLedgerLabel(row.type, delta),
          title: row.title ?? category?.name ?? "가계부 기록",
          amount,
          delta,
          occurredAt: row.transacted_at,
          memo: row.memo,
          meta: {
            ledgerType: row.type,
            categoryName: category?.name ?? null,
          },
        };
      }) ?? [];

  const adjustmentItems =
    adjustments?.map((row) => ({
      id: row.id,
      kind: "balance_adjustment" as const,
      label: "잔액 조정",
      title: row.title,
      amount: Math.abs(toNumber(row.delta)),
      delta: toNumber(row.delta),
      occurredAt: row.adjusted_at,
      memo: row.memo,
      meta: {
        previousBalance: toNumber(row.previous_balance),
        actualBalance: toNumber(row.actual_balance),
      },
    })) ?? [];

  return sortTimeline([...ledgerItems, ...adjustmentItems]);
}

export async function getAccountBalanceDetail(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  accountId: string,
): Promise<AccountBalanceDetail> {
  const { data: account, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("household_id", householdId)
    .single();

  if (error || !account) {
    throw new APIError("ACCOUNT_NOT_FOUND", "계좌를 찾을 수 없습니다.", 404);
  }

  const ownerName = await fetchOwnerName(supabase, account.owner_id);
  const category = getAccountCategory(account);
  const stockValue =
    category === "investment"
      ? await fetchAccountStockValue(supabase, householdId, accountId)
      : null;
  const balance = account.balance === null ? null : toNumber(account.balance);

  return {
    type: "account",
    account: {
      id: account.id,
      householdId: account.household_id,
      ownerId: account.owner_id,
      ownerName,
      name: account.name,
      broker: account.broker,
      lastFour: account.last_four,
      accountType: account.account_type,
      category,
      balance,
      balanceUpdatedAt: account.balance_updated_at,
      memo: account.memo,
    },
    stockValue,
    totalValue:
      category === "investment" ? (balance ?? 0) + (stockValue ?? 0) : balance,
    timeline: await getAccountTimeline(
      supabase,
      householdId,
      userId,
      accountId,
    ),
  };
}

export async function getPaymentMethodBalanceDetail(
  supabase: SupabaseClient<Database>,
  householdId: string,
  userId: string,
  paymentMethodId: string,
): Promise<PaymentMethodBalanceDetail> {
  const { data: paymentMethod, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("id", paymentMethodId)
    .eq("household_id", householdId)
    .single();

  if (error || !paymentMethod) {
    throw new APIError(
      "PAYMENT_METHOD_NOT_FOUND",
      "결제수단을 찾을 수 없습니다.",
      404,
    );
  }

  const [{ data: linkedAccount }, ownerName] = await Promise.all([
    paymentMethod.linked_account_id
      ? supabase
          .from("accounts")
          .select("name")
          .eq("id", paymentMethod.linked_account_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    fetchOwnerName(supabase, paymentMethod.owner_id),
  ]);

  return {
    type: "payment_method",
    paymentMethod: {
      id: paymentMethod.id,
      householdId: paymentMethod.household_id,
      ownerId: paymentMethod.owner_id,
      ownerName,
      name: paymentMethod.name,
      type: paymentMethod.type,
      linkedAccountId: paymentMethod.linked_account_id,
      linkedAccountName: linkedAccount?.name ?? null,
      issuer: paymentMethod.issuer,
      lastFour: paymentMethod.last_four,
      paymentDay: paymentMethod.payment_day,
      balance:
        paymentMethod.balance === null ? null : toNumber(paymentMethod.balance),
      balanceUpdatedAt: paymentMethod.balance_updated_at,
      memo: paymentMethod.memo,
    },
    timeline: await getPaymentMethodTimeline(
      supabase,
      householdId,
      userId,
      paymentMethodId,
    ),
  };
}

export async function createBalanceAdjustment(
  supabase: SupabaseClient<Database>,
  params: CreateBalanceAdjustmentParams,
): Promise<BalanceAdjustment> {
  if (params.targetType === "account") {
    if (!params.accountId) {
      throw new APIError("VALIDATION_ERROR", "계좌를 선택해주세요.", 400);
    }

    const { data: account } = await supabase
      .from("accounts")
      .select("id, household_id, owner_id, balance")
      .eq("id", params.accountId)
      .single();

    if (!account || account.household_id !== params.householdId) {
      throw new APIError("ACCOUNT_NOT_FOUND", "계좌를 찾을 수 없습니다.", 404);
    }
    if (account.owner_id !== params.ownerId) {
      throw new APIError(
        "BALANCE_ADJUSTMENT_FORBIDDEN",
        "본인의 계좌만 잔액을 맞출 수 있습니다.",
        403,
      );
    }

    return createAdjustmentAndUpdateTarget(supabase, {
      ...params,
      previousBalance: toNumber(account.balance),
      accountId: account.id,
      paymentMethodId: null,
    });
  }

  if (!params.paymentMethodId) {
    throw new APIError("VALIDATION_ERROR", "결제수단을 선택해주세요.", 400);
  }

  const { data: paymentMethod } = await supabase
    .from("payment_methods")
    .select("id, household_id, owner_id, type, balance")
    .eq("id", params.paymentMethodId)
    .single();

  if (!paymentMethod || paymentMethod.household_id !== params.householdId) {
    throw new APIError(
      "PAYMENT_METHOD_NOT_FOUND",
      "결제수단을 찾을 수 없습니다.",
      404,
    );
  }
  if (paymentMethod.owner_id !== params.ownerId) {
    throw new APIError(
      "BALANCE_ADJUSTMENT_FORBIDDEN",
      "본인의 결제수단만 잔액을 맞출 수 있습니다.",
      403,
    );
  }
  if (!isBalanceAdjustablePaymentMethodType(paymentMethod.type)) {
    throw new APIError(
      "BALANCE_ADJUSTMENT_UNSUPPORTED",
      "이 결제수단은 자체 잔액을 맞출 수 없습니다.",
      400,
    );
  }

  return createAdjustmentAndUpdateTarget(supabase, {
    ...params,
    previousBalance: toNumber(paymentMethod.balance),
    accountId: null,
    paymentMethodId: paymentMethod.id,
  });
}

async function createAdjustmentAndUpdateTarget(
  supabase: SupabaseClient<Database>,
  params: CreateBalanceAdjustmentParams & {
    previousBalance: number;
    accountId: string | null;
    paymentMethodId: string | null;
  },
): Promise<BalanceAdjustment> {
  const now = new Date().toISOString();
  const adjustedAt = params.adjustedAt ?? now;
  const delta = getBalanceAdjustmentDelta(
    params.previousBalance,
    params.actualBalance,
  );
  const targetTable =
    params.targetType === "account" ? "accounts" : "payment_methods";
  const targetId =
    params.targetType === "account" ? params.accountId : params.paymentMethodId;

  const { error: updateError } = await supabase
    .from(targetTable)
    .update({
      balance: params.actualBalance,
      balance_updated_at: adjustedAt,
      updated_at: now,
    })
    .eq("id", targetId ?? "");

  if (updateError) {
    throw new APIError(
      "BALANCE_ADJUSTMENT_UPDATE_ERROR",
      "잔액 업데이트에 실패했습니다.",
      500,
    );
  }

  const { data, error } = await supabase
    .from("balance_adjustments")
    .insert({
      household_id: params.householdId,
      owner_id: params.ownerId,
      target_type: params.targetType,
      account_id: params.accountId,
      payment_method_id: params.paymentMethodId,
      previous_balance: params.previousBalance,
      actual_balance: params.actualBalance,
      delta,
      title: "잔액 맞춤",
      memo: params.memo ?? null,
      adjusted_at: adjustedAt,
    })
    .select()
    .single();

  if (error) {
    await supabase
      .from(targetTable)
      .update({
        balance: params.previousBalance,
        balance_updated_at: now,
        updated_at: now,
      })
      .eq("id", targetId ?? "");
    throw new APIError(
      "BALANCE_ADJUSTMENT_ERROR",
      "잔액 조정 기록 생성에 실패했습니다.",
      500,
    );
  }

  return data;
}
