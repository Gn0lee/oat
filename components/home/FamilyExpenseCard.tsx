import { formatCurrency } from "@/lib/utils/format";

interface FamilyExpenseCardProps {
  sharedExpense: number;
  personalExpense: number;
}

export function FamilyExpenseCard({
  sharedExpense,
  personalExpense,
}: FamilyExpenseCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">가족 지출</p>
          <p className="mt-1 text-xs text-gray-500">
            개인 지출은 세부 내역 없이 합계만 함께 봐요
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">공용</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatCurrency(sharedExpense)}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">개인 합산</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatCurrency(personalExpense)}
          </p>
        </div>
      </div>
    </div>
  );
}
