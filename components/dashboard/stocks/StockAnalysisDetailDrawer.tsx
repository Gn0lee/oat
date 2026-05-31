"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useStockAnalysis } from "@/hooks/use-stock-analysis";
import { useTransactions } from "@/hooks/use-transaction";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export type StockAnalysisDetail =
  | { kind: "ticker"; ticker: string; title: string }
  | { kind: "account"; accountId: string; title: string }
  | { kind: "tickerAccount"; ticker: string; accountId: string; title: string };

interface StockAnalysisDetailDrawerProps {
  open: boolean;
  detail: StockAnalysisDetail | null;
  onOpenChange: (open: boolean) => void;
}

function matchesDetail(
  holding: NonNullable<
    ReturnType<typeof useStockAnalysis>["data"]
  >["holdings"][number],
  detail: StockAnalysisDetail,
) {
  if (detail.kind === "ticker") return holding.ticker === detail.ticker;
  if (detail.kind === "account") {
    return (holding.account.id ?? "unassigned") === detail.accountId;
  }
  return (
    holding.ticker === detail.ticker &&
    (holding.account.id ?? "unassigned") === detail.accountId
  );
}

export function StockAnalysisDetailDrawer({
  open,
  detail,
  onOpenChange,
}: StockAnalysisDetailDrawerProps) {
  const { data, isLoading } = useStockAnalysis();
  const transactionFilters = detail
    ? {
        ticker: detail.kind !== "account" ? detail.ticker : undefined,
        accountId: detail.kind !== "ticker" ? detail.accountId : undefined,
      }
    : undefined;
  const { data: transactionsData, isLoading: isTransactionsLoading } =
    useTransactions({
      filters: transactionFilters,
      page: 1,
      pageSize: 20,
    });

  const holdings =
    data && detail
      ? data.holdings.filter((holding) => matchesDetail(holding, detail))
      : [];
  const transactions = transactionsData?.data ?? [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh] overflow-hidden">
        <DrawerHeader>
          <DrawerTitle>{detail?.title ?? "상세"}</DrawerTitle>
          <DrawerDescription>
            {holdings.length > 0
              ? `보유 ${holdings.length.toLocaleString()}건`
              : "보유 항목"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-5">
          <section>
            <h4 className="mb-2 font-semibold text-gray-900 text-sm">
              보유 항목
            </h4>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : holdings.length === 0 ? (
              <p className="rounded-xl bg-gray-50 py-8 text-center text-gray-400 text-sm">
                보유 항목이 없어요
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {holdings.map((holding) => (
                  <li
                    key={`${holding.ticker}:${holding.account.id ?? "unassigned"}`}
                    className="py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 text-sm">
                          {holding.name}
                        </p>
                        <p className="mt-1 text-gray-500 text-xs">
                          {holding.account.name ?? "미배정"}
                          {holding.account.ownerName
                            ? ` · ${holding.account.ownerName}`
                            : ""}
                          {` · ${holding.quantity.toLocaleString()}주`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-gray-900 text-sm">
                          {formatCurrency(holding.currentValue, "KRW")}
                        </p>
                        <p
                          className={`text-xs ${
                            holding.returnRate >= 0
                              ? "text-[#F04452]"
                              : "text-[#3182F6]"
                          }`}
                        >
                          {formatPercent(holding.returnRate)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="mb-2 font-semibold text-gray-900 text-sm">
              최근 거래
            </h4>
            {isTransactionsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((item) => (
                  <Skeleton key={item} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="rounded-xl bg-gray-50 py-8 text-center text-gray-400 text-sm">
                최근 거래가 없어요
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {transactions.map((transaction) => (
                  <li key={transaction.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 text-sm">
                          {transaction.stockName}
                        </p>
                        <p className="mt-1 text-gray-500 text-xs">
                          {transaction.type === "buy" ? "매수" : "매도"} ·{" "}
                          {transaction.quantity.toLocaleString()}주 ·{" "}
                          {transaction.owner.name}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-gray-900 text-sm">
                        {formatCurrency(
                          transaction.totalAmount,
                          transaction.currency,
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
