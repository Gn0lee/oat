import {
  AnalysisTypeSection,
  BreakdownSection,
  DashboardSummarySection,
} from "@/components/dashboard";
import { PageHeader } from "@/components/layout";

export default async function DashboardPage() {
  return (
    <>
      <PageHeader title="대시보드" />

      {/* 총 자산 / 수익률 카드 */}
      <DashboardSummarySection />

      {/* 자산 유형별 분석 */}
      <AnalysisTypeSection />

      {/* 비중 분석 */}
      <BreakdownSection />
    </>
  );
}
