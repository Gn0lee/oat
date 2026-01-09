import {
  AnalysisTypeSection,
  BreakdownSection,
  DashboardSummarySection,
} from "@/components/dashboard";
import { PageHeader } from "@/components/layout";
import { getUser } from "@/lib/supabase/auth";

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <>
      <PageHeader title="대시보드" subtitle={`안녕하세요, ${user?.email}님`} />

      {/* 총 자산 / 수익률 카드 */}
      <DashboardSummarySection />

      {/* 자산 유형별 분석 */}
      <AnalysisTypeSection />

      {/* 비중 분석 */}
      <BreakdownSection />
    </>
  );
}
