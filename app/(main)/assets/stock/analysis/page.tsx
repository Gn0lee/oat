import { BarChart3, Shield, Users } from "lucide-react";
import {
  EntryRow,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";

export default function StockAnalysisHubPage() {
  return (
    <ScreenSection>
      <SectionHeader title="분석 관점" />
      <GroupedList>
        <EntryRow
          href="/assets/stock/analysis/overview"
          icon={BarChart3}
          title="종합 분석"
          description="평가금액, 수익률, 비중, 상위 종목"
        />
        <EntryRow
          href="/assets/stock/analysis/by-owner"
          icon={Users}
          title="소유자별"
          description="가족 구성원별 평가액과 보유 종목"
        />
        <EntryRow
          href="/assets/stock/analysis/by-risk"
          icon={Shield}
          title="위험도별"
          description="안전, 중립, 공격 자산 구성"
        />
      </GroupedList>
    </ScreenSection>
  );
}
