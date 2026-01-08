"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/hooks/use-transaction";
import { formatDateShort } from "@/lib/utils/format";

export function RecentTransactions() {
  const { data, isLoading } = useTransactions({
    page: 1,
    pageSize: 5,
  });

  const transactions = data?.data ?? [];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">최근 거래</h3>
        <Link
          href="/assets/stock/transactions"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          전체 보기
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          아직 거래 내역이 없어요
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Badge
                  variant={tx.type === "buy" ? "default" : "secondary"}
                  className="w-10 justify-center"
                >
                  {tx.type === "buy" ? "매수" : "매도"}
                </Badge>
                <div>
                  <p className="font-medium text-gray-900">{tx.stockName}</p>
                  <p className="text-xs text-gray-500">
                    {tx.quantity.toLocaleString()}주
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {formatDateShort(tx.transactedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
