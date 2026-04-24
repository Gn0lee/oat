"use client";

import { ArrowLeftIcon, UserIcon, UsersIcon } from "lucide-react";

interface SelectPrivacyStepProps {
  onNext: (isShared: boolean) => void;
  onBack: () => void;
}

export function SelectPrivacyStep({ onNext, onBack }: SelectPrivacyStepProps) {
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
        <h2 className="text-xl font-bold text-gray-900">공개 범위 선택</h2>
      </div>

      <p className="text-gray-500">이 내역을 누구와 공유할까요?</p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onNext(true)}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UsersIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">공용</p>
            <p className="text-sm text-gray-500">가족 모두가 볼 수 있어요</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNext(false)}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">개인</p>
            <p className="text-sm text-gray-500">나만 볼 수 있어요</p>
          </div>
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        공용으로 등록하면 가족과 내역을 함께 관리할 수 있어요
      </p>
    </div>
  );
}
