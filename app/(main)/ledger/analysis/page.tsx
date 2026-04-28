import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  PieChart,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { CategoryTopPreview } from "@/components/ledger/analysis/CategoryTopPreview";
import { ScopeTabs } from "@/components/ledger/analysis/ScopeTabs";
import { SummaryStatCard } from "@/components/ledger/analysis/SummaryStatCard";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  getLedgerStatsByCategory,
  getLedgerStatsSummary,
} from "@/lib/api/ledger-stats";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NAV_CARDS = [
  {
    key: "by-category",
    icon: PieChart,
    title: "카테고리 분석",
    description: "카테고리별 지출·수입 비중 확인",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    scopeAware: true,
    sharedOnly: false,
  },
  {
    key: "by-member",
    icon: Users,
    title: "구성원별 지출",
    description: "공용 지출에서 누가 얼마나 결제했는지",
    color: "text-rose-500",
    bg: "bg-rose-50",
    scopeAware: false,
    sharedOnly: true,
  },
  {
    key: "by-payment-method",
    icon: CreditCard,
    title: "결제수단 분석",
    description: "어떤 카드·페이로 지출했는지",
    color: "text-blue-500",
    bg: "bg-blue-50",
    scopeAware: true,
    sharedOnly: false,
  },
  {
    key: "trend",
    icon: TrendingUp,
    title: "월별 수입·지출",
    description: "최근 6개월 수입·지출 흐름",
    color: "text-amber-500",
    bg: "bg-amber-50",
    scopeAware: true,
    sharedOnly: false,
  },
  {
    key: "daily",
    icon: CalendarDays,
    title: "일별 지출 현황",
    description: "이번 달 날짜별 소비 패턴",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    scopeAware: true,
    sharedOnly: false,
  },
];

export default async function LedgerAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: rawScope } = await searchParams;
  const scope: "shared" | "personal" =
    rawScope === "personal" ? "personal" : "shared";

  const user = await requireUser();
  const supabase = await createClient();
  const householdId = await getUserHouseholdId(supabase, user.id);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [summary, categoryData] = await Promise.all([
    householdId
      ? getLedgerStatsSummary(supabase, householdId, user.id, year, month)
      : null,
    householdId
      ? getLedgerStatsByCategory(
          supabase,
          householdId,
          user.id,
          year,
          month,
          "expense",
          scope,
        )
      : null,
  ]);

  const visibleCards = NAV_CARDS.filter(
    (card) => !(card.sharedOnly && scope === "personal"),
  );

  return (
    <>
      <PageHeader title="통계 대시보드" backHref="/ledger" />

      <ScopeTabs scope={scope} />

      {summary ? (
        <SummaryStatCard summary={summary} scope={scope} />
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <p className="text-sm text-gray-400 text-center">
            가구 정보를 불러올 수 없어요
          </p>
        </div>
      )}

      {categoryData && categoryData.items.length > 0 && (
        <CategoryTopPreview
          items={categoryData.items}
          total={categoryData.total}
        />
      )}

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 px-1">
          분석 보기
        </h3>
        {visibleCards.map(
          ({ key, icon: Icon, title, description, color, bg, scopeAware }) => {
            const href = scopeAware
              ? `/ledger/analysis/${key}?scope=${scope}`
              : `/ledger/analysis/${key}`;
            return (
              <Link
                key={key}
                href={href}
                className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </Link>
            );
          },
        )}
      </div>
    </>
  );
}
