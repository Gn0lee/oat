import { BarChart3, Shield, Users } from "lucide-react";
import {
  EntryRow,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";

export default function StockAnalysisHubPage() {
  return (
    <>
      <ScreenSection>
        <SectionHeader title="주식 분석" />
        <GroupedList>
          <EntryRow
            href="/assets/stock/analysis/overview"
            icon={BarChart3}
            title="종합 분석"
            description="보유 종목, 시장, 계좌, 수익률을 한눈에 봐요"
          />
        </GroupedList>
      </ScreenSection>

      <ScreenSection>
        <SectionHeader title="구성 분석" />
        <GroupedList>
          <EntryRow
            href="/assets/stock/analysis/by-owner"
            icon={Users}
            title="소유자별"
            description="가족 구성원별 주식 평가액과 보유 종목을 봐요"
          />
          <EntryRow
            href="/assets/stock/analysis/by-risk"
            icon={Shield}
            title="위험도별"
            description="안전/중립/공격 자산으로 나눈 주식 구성을 봐요"
          />
        </GroupedList>
      </ScreenSection>
    </>
  );
}
