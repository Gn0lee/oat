import {
  AnalysisTypeSection,
  BreakdownSection,
  DashboardSummarySection,
} from "@/components/dashboard";
import { getUser } from "@/lib/supabase/auth";

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <>
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500">안녕하세요, {user?.email}님</p>
      </div>

      {/* 총 자산 / 수익률 카드 */}
      <DashboardSummarySection />

      {/* 자산 유형별 분석 */}
      <AnalysisTypeSection />

      {/* 비중 분석 */}
      <BreakdownSection />
    </>
  );
}
