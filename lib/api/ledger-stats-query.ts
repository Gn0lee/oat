import { APIError } from "@/lib/api/error";
import type {
  LedgerStatsMonth,
  LedgerStatsScope,
} from "@/lib/api/ledger-stats";
import { getKstToday } from "@/lib/date";
import { ledgerBookIdSchema } from "@/schemas/ledger-book";

export function parseLedgerStatsMonth(
  searchParams: URLSearchParams,
): LedgerStatsMonth {
  const [currentYear, currentMonth] = getKstToday().split("-").map(Number);
  const year = Number(searchParams.get("year") ?? currentYear);
  const month = Number(searchParams.get("month") ?? currentMonth);
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new APIError(
      "VALIDATION_ERROR",
      "유효하지 않은 조회 기간입니다.",
      400,
    );
  }
  return { year, month };
}

export function parseLedgerStatsScope(
  searchParams: URLSearchParams,
): LedgerStatsScope {
  const bookId = searchParams.get("book");
  if (bookId !== null && !ledgerBookIdSchema.safeParse(bookId).success) {
    throw new APIError("VALIDATION_ERROR", "유효하지 않은 장부 ID입니다.", 400);
  }
  return bookId ? { bookId } : {};
}
