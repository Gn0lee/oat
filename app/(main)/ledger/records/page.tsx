import { PageContainer } from "@/components/layout";
import { LedgerRecordsClient } from "@/components/ledger/records/LedgerRecordsClient";
import { APIError } from "@/lib/api/error";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { getLedgerBook } from "@/lib/api/ledger-books";
import { formatKst, getKstMonthRange, getKstToday } from "@/lib/date";
import { normalizeRecordDate } from "@/lib/stock-records/records";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

interface LedgerRecordsPageProps {
  searchParams: Promise<{
    date?: string;
    book?: string;
    scope?: string;
    categoryId?: string;
    childCategoryId?: string;
    categoryBreakdown?: string;
  }>;
}

export default async function LedgerRecordsPage({
  searchParams,
}: LedgerRecordsPageProps) {
  const user = await requireUser();
  const { date, book } = await searchParams;
  const today = getKstToday();
  let initialDate = normalizeRecordDate(date, today);
  if (book && !date) {
    const supabase = await createClient();
    const householdId = await getUserHouseholdId(supabase, user.id);
    if (householdId) {
      try {
        const selectedBook = await getLedgerBook(supabase, householdId, book);
        let query = supabase
          .from("ledger_entries")
          .select("transacted_at")
          .eq("household_id", householdId)
          .eq("book_id", book);
        if (!selectedBook.archivedAt) {
          const [year, month] = today.split("-").map(Number);
          const range = getKstMonthRange(year, month);
          query = query
            .gte("transacted_at", range.from)
            .lt("transacted_at", range.to);
        }
        const { data, error } = await query
          .order("transacted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw new Error("최근 기록을 불러올 수 없습니다.");
        if (data) initialDate = formatKst(data.transacted_at);
      } catch (error) {
        if (
          !(
            error instanceof APIError &&
            (error.statusCode === 404 || error.statusCode === 400)
          )
        )
          throw error;
        // The client renders the same unavailable state for hidden/deleted IDs.
      }
    }
  }

  return (
    <PageContainer maxWidth="default">
      <LedgerRecordsClient initialDate={initialDate} />
    </PageContainer>
  );
}
