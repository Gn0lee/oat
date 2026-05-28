"use client";

interface SelectTypeStepProps {
  onSelect: (type: "buy" | "sell") => void;
}

export function SelectTypeStep({ onSelect }: SelectTypeStepProps) {
  return (
    <div className="space-y-6">
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
