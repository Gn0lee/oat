"use client";

import {
  ArrowRightLeftIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";

interface SelectTypeStepProps {
  onSelect: (type: "expense" | "income" | "transfer") => void;
}

export function SelectTypeStep({ onSelect }: SelectTypeStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-gray-500">어떤 내역을 기록하시겠어요?</p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect("expense")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <TrendingDownIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">지출</p>
            <p className="text-sm text-gray-500">식비, 교통비, 쇼핑 등</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("income")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-red-200 hover:bg-red-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <TrendingUpIcon className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">수입</p>
            <p className="text-sm text-gray-500">급여, 부수입, 이자 등</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("transfer")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <ArrowRightLeftIcon className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">이체</p>
            <p className="text-sm text-gray-500">
              계좌, 선불페이, 상품권 간 이동
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
