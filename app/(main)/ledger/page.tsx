import { CalendarDays, CreditCard, PieChart, Plus, Tags } from "lucide-react";
import { PageContainer } from "@/components/layout";
import {
  EntryRow,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { LedgerSummarySection } from "@/components/ledger/LedgerSummarySection";
import { getKstNow } from "@/lib/date";
import { requireUser } from "@/lib/supabase/auth";

export default async function LedgerPage() {
  await requireUser();

  const now = getKstNow();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return (
    <PageContainer maxWidth="default">
      <LedgerSummarySection year={year} month={month} />

      <ScreenSection>
        <SectionHeader title="기록" />
        <GroupedList>
          <EntryRow
            icon={Plus}
            title="기록 추가"
            description="수입, 지출, 내부이체, 비지출 출금을 등록해요"
            href="/ledger/records/new/full"
          />
          <EntryRow
            icon={CalendarDays}
            title="기록 조회"
            description="달력에서 수입과 지출 내역을 확인해요"
            href="/ledger/records"
          />
        </GroupedList>
      </ScreenSection>

      <ScreenSection>
        <SectionHeader title="살펴보기" />
        <GroupedList>
          <EntryRow
            icon={PieChart}
            title="분석"
            description="우리 가족의 소비 패턴을 확인해요"
            href="/ledger/analysis"
          />
        </GroupedList>
      </ScreenSection>

      <ScreenSection>
        <SectionHeader title="관리" />
        <GroupedList>
          <EntryRow
            icon={CreditCard}
            title="결제수단"
            description="카드, 페이, 상품권을 관리해요"
            href="/ledger/payment-methods"
          />
          <EntryRow
            icon={Tags}
            title="카테고리"
            description="우리 가족만의 소비 카테고리를 관리해요"
            href="/ledger/categories"
          />
        </GroupedList>
      </ScreenSection>
    </PageContainer>
  );
}
