import { FeatureCard } from "@/components/home/FeatureCard";
import { PageHeader } from "@/components/layout";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerStatsSummary } from "@/lib/api/ledger-stats";
import { getPortfolioSummary } from "@/lib/api/portfolio";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";

export default async function HomePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const householdId = await getUserHouseholdId(supabase, user.id);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [cashFlow, portfolio] = await Promise.all([
    householdId
      ? getLedgerStatsSummary(supabase, householdId, user.id, year, month)
      : null,
    householdId
      ? getPortfolioSummary(supabase, householdId)
      : { holdingCount: 0, totalValue: 0, totalInvested: 0, returnRate: 0 },
  ]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const userName = profile?.name ?? user.email?.split("@")[0] ?? "사용자";

  const ledgerHint = cashFlow
    ? cashFlow.totalExpense > 0
      ? `이번 달 지출 ${formatCurrency(cashFlow.totalExpense)}`
      : "이번 달 기록이 없어요"
    : "기록을 시작해보세요";

  const assetHint =
    portfolio.holdingCount > 0
      ? `${portfolio.holdingCount}종목 · ${formatCompactNumber(portfolio.totalValue)}`
      : "자산을 등록해보세요";

  const analysisHint = cashFlow?.totalExpense
    ? `저축률 ${cashFlow.savingsRate.toFixed(0)}%`
    : "기록 후 분석이 가능해요";

  return (
    <>
      <PageHeader title={`안녕하세요, ${userName}님`} />

      <div className="space-y-2 pb-2">
        <p className="text-sm text-gray-400">무엇을 해볼까요?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FeatureCard
          icon="📒"
          title="가계부"
          description="수입과 지출을 기록해요"
          hint={ledgerHint}
          href="/ledger"
          colorScheme="amber"
        />
        <FeatureCard
          icon="📈"
          title="자산"
          description="투자 현황을 파악해요"
          hint={assetHint}
          href="/assets"
          colorScheme="blue"
        />
        <FeatureCard
          icon="📊"
          title="지출 분석"
          description="소비 패턴을 분석해요"
          hint={analysisHint}
          href="/ledger/analysis"
          colorScheme="emerald"
        />
        <FeatureCard
          icon="👥"
          title="파트너·설정"
          description="함께 관리해요"
          hint={householdId ? "가구 연결됨" : "파트너를 초대해보세요"}
          href="/settings"
          colorScheme="violet"
        />
      </div>
    </>
  );
}
