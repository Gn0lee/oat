"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StockSearchDialog } from "@/components/stocks/StockSearchDialog";
import { Button } from "@/components/ui/button";
import type { StockMaster } from "@/types";

export default function TransactionsPage() {
  const [selectedStock, setSelectedStock] = useState<StockMaster | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">거래 등록</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">종목 검색</p>
            <StockSearchDialog
              value={selectedStock}
              onSelect={setSelectedStock}
            />
          </div>

          {selectedStock && (
            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <p className="text-sm text-gray-500">선택된 종목</p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{selectedStock.code}</span>
                <span className="text-gray-600">{selectedStock.name}</span>
                <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                  {selectedStock.exchange}
                </span>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-400">
            거래 등록 폼은 #19 이슈에서 구현 예정
          </p>
        </div>
      </div>
    </div>
  );
}
