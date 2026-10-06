import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { getLedgerBook } from "@/lib/api/ledger-books";
import { formatKst } from "@/lib/date";
import type { Database } from "@/types";

// Date whose month the records screen opens when the URL has neither a date nor
// a month: the current month, or the month of an archived book's last record.
export async function resolveLedgerRecordsInitialDate(
  supabase: SupabaseClient<Database>,
  householdId: string,
  options: { bookId?: string; today: string },
): Promise<string> {
  if (!options.bookId) return options.today;
  try {
    const book = await getLedgerBook(supabase, householdId, options.bookId);
    if (!book.archivedAt) return options.today;
  } catch (error) {
    // The client renders the same unavailable state for hidden/deleted IDs.
    if (
      error instanceof APIError &&
      (error.statusCode === 404 || error.statusCode === 400)
    )
      return options.today;
    throw error;
  }

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("transacted_at")
    .eq("household_id", householdId)
    .eq("book_id", options.bookId)
    .order("transacted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("최근 기록을 불러올 수 없습니다.");
  return data ? formatKst(data.transacted_at) : options.today;
}
