"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils/format";

export interface ExchangeRateData {
  from: string;
  to: string;
  rate: number;
  updatedAt: string | null;
}

interface ExchangeRateCardProps {
  rates: ExchangeRateData[];
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatRateValue(rate: number, toCurrency: string): string {
  if (toCurrency === "KRW") {
    return formatCurrency(rate, "KRW");
  }
  if (toCurrency === "USD") {
    return `$${rate.toFixed(6)}`;
  }
  return rate.toFixed(4);
}

export function ExchangeRateCard({ rates }: ExchangeRateCardProps) {
  // 모든 통화 목록 추출
  const currencies = Array.from(
    new Set(rates.flatMap((r) => [r.from, r.to])),
  ).sort();

  const [fromCurrency, setFromCurrency] = useState(currencies[0] || "USD");
  const [toCurrency, setToCurrency] = useState(currencies[1] || "KRW");
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  if (rates.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">현재 환율</span>
        </div>
        <p className="text-sm text-gray-500">환율 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  // 선택한 통화쌍의 환율 찾기
  const findRate = (): { rate: number; updatedAt: string | null } | null => {
    // 정방향 검색
    const direct = rates.find(
      (r) => r.from === fromCurrency && r.to === toCurrency,
    );
    if (direct) {
      return { rate: direct.rate, updatedAt: direct.updatedAt };
    }

    // 역방향 검색
    const reverse = rates.find(
      (r) => r.from === toCurrency && r.to === fromCurrency,
    );
    if (reverse) {
      return { rate: 1 / reverse.rate, updatedAt: reverse.updatedAt };
    }

    return null;
  };

  const rateData = findRate();
  const formattedRate = rateData
    ? formatRateValue(rateData.rate, toCurrency)
    : "-";
  const formattedTime = rateData?.updatedAt
    ? formatTime(rateData.updatedAt)
    : null;

  const handleFromSelect = (currency: string) => {
    setFromCurrency(currency);
    if (currency === toCurrency) {
      setToCurrency(fromCurrency);
    }
    setIsFromOpen(false);
  };

  const handleToSelect = (currency: string) => {
    setToCurrency(currency);
    if (currency === fromCurrency) {
      setFromCurrency(toCurrency);
    }
    setIsToOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">현재 환율</span>

        <div className="flex items-center gap-1.5">
          {/* From 통화 드롭다운 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsFromOpen(!isFromOpen);
                setIsToOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-700"
            >
              {fromCurrency}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isFromOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[70px]">
                {currencies.map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => handleFromSelect(currency)}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 ${
                      currency === fromCurrency
                        ? "text-sky-600 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />

          {/* To 통화 드롭다운 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsToOpen(!isToOpen);
                setIsFromOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-700"
            >
              {toCurrency}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isToOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[70px]">
                {currencies.map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => handleToSelect(currency)}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 ${
                      currency === toCurrency
                        ? "text-sky-600 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xl font-bold text-gray-900">
          1 {fromCurrency} = {formattedRate}
        </p>
        {formattedTime && (
          <p className="text-xs text-gray-400">{formattedTime} 기준</p>
        )}
      </div>
    </div>
  );
}
