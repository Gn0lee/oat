import Link from "next/link";
import { CategoryIcon } from "@/components/ledger/CategoryIcon";
import type { CategoryStatItem } from "@/lib/api/ledger-stats";
import { formatCurrency } from "@/lib/utils/format";

interface HomeTopCategoriesProps {
  items: CategoryStatItem[];
}

export function HomeTopCategories({ items }: HomeTopCategoriesProps) {
  const top3 = items.slice(0, 3);

  if (top3.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-2">이번 달 주요 지출</p>
        <p className="text-sm text-gray-400 text-center py-2">
          이번 달 지출 내역이 없어요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">이번 달 주요 지출 (공용)</p>
        <Link
          href="/ledger/analysis?scope=shared"
          className="text-xs text-primary"
        >
          분석 보기 →
        </Link>
      </div>
      <div className="space-y-3">
        {top3.map((item) => (
          <div key={item.categoryId ?? "null"} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CategoryIcon
                  iconName={item.categoryIcon}
                  className="w-4 h-4 text-gray-600"
                />
                <span className="text-gray-700">{item.categoryName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {item.percentage.toFixed(1)}%
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full"
                style={{ width: `${Math.min(item.percentage, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
