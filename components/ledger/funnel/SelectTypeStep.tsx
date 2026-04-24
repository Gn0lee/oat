"use client";

import { ArrowLeftIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";

interface SelectTypeStepProps {
  onSelect: (type: "expense" | "income") => void;
  onBack: () => void;
}

export function SelectTypeStep({ onSelect, onBack }: SelectTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">기록 추가</h2>
      </div>

      <p className="text-gray-500">어떤 내역을 기록하시겠어요?</p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect("expense")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-red-200 hover:bg-red-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <TrendingDownIcon className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">지출</p>
            <p className="text-sm text-gray-500">식비, 교통비, 쇼핑 등</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("income")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <TrendingUpIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">수입</p>
            <p className="text-sm text-gray-500">급여, 부수입, 이자 등</p>
          </div>
        </button>
      </div>
    </div>
  );
}
