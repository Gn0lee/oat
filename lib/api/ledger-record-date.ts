import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { getLedgerBook } from "@/lib/api/ledger-books";
import { formatKst, getKstMonthRange } from "@/lib/date";
import type { Database } from "@/types";

// Date a calendar opens on when the URL has no date (#434/#436): the most recent
// record of the current month in the scope, or the last record of an archived book.
export async function resolveLedgerRecordsInitialDate(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options: { bookId?: string; today: string },
): Promise<string> {
  let archived = false;
  if (options.bookId) {
    try {
      const book = await getLedgerBook(supabase, householdId, options.bookId);
      archived = Boolean(book.archivedAt);
    } catch (error) {
      // The client renders the same unavailable state for hidden/deleted IDs.
      if (
        error instanceof APIError &&
        (error.statusCode === 404 || error.statusCode === 400)
      )
        return options.today;
      throw error;
    }
  }

  let query = supabase
    .from("ledger_entries")
    .select("transacted_at")
    .eq("household_id", householdId);
  if (options.bookId) query = query.eq("book_id", options.bookId);
  if (!archived) {
    const [year, month] = options.today.split("-").map(Number);
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
  return data ? formatKst(data.transacted_at) : options.today;
}
