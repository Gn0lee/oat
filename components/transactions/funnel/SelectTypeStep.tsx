"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface SelectTypeStepProps {
  onSelect: (type: "buy" | "sell") => void;
}

export function SelectTypeStep({ onSelect }: SelectTypeStepProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/assets/stock/transactions")}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">거래 등록</h2>
      </div>

      <p className="text-gray-500">어떤 거래를 등록하시겠어요?</p>

      <div className="space-y-3">
        {/* 매수 버튼 */}
        <button
          type="button"
          onClick={() => onSelect("buy")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-red-200 hover:bg-red-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <span className="text-red-600 text-xl font-bold">B</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">매수</p>
            <p className="text-sm text-gray-500">주식을 구매합니다</p>
          </div>
        </button>

        {/* 매도 버튼 */}
        <button
          type="button"
          onClick={() => onSelect("sell")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-600 text-xl font-bold">S</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">매도</p>
            <p className="text-sm text-gray-500">주식을 판매합니다</p>
          </div>
        </button>
      </div>
    </div>
  );
}
