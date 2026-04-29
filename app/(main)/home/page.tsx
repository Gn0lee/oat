import {
  CashFlowCard,
  HomeTopCategories,
  QuickActionButtons,
  TotalAssetCard,
} from "@/components/home";
import { PageHeader } from "@/components/layout";
import { getUserHouseholdId } from "@/lib/api/invitation";
import {
  getLedgerStatsByCategory,
  getLedgerStatsSummary,
} from "@/lib/api/ledger-stats";
import { getPortfolioSummary } from "@/lib/api/portfolio";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const householdId = await getUserHouseholdId(supabase, user.id);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [cashFlow, categoryResult, portfolio] = await Promise.all([
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
          "shared",
        )
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

  return (
    <>
      <PageHeader title={`안녕하세요, ${userName}님`} />

      <CashFlowCard
        totalIncome={cashFlow?.totalIncome ?? 0}
        totalExpense={cashFlow?.totalExpense ?? 0}
        balance={cashFlow?.balance ?? 0}
        savingsRate={cashFlow?.savingsRate ?? 0}
        month={month}
      />

      <TotalAssetCard totalValue={portfolio.totalValue} />

      <HomeTopCategories items={categoryResult?.items ?? []} />

      <QuickActionButtons />
    </>
  );
}
