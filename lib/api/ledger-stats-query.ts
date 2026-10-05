import { APIError } from "@/lib/api/error";
import type {
  LedgerStatsMonth,
  LedgerStatsScope,
} from "@/lib/api/ledger-stats";
import {
  type LegacyLedgerContract,
  logLegacyLedgerContract,
} from "@/lib/api/legacy-ledger-contract";
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

// `book` is the contract. The pre-book `scope=shared|personal` is still
// honoured for old clients as a visibility subset until the legacy removal.
export function parseLedgerStatsScope(
  searchParams: URLSearchParams,
  route: string,
  legacyContract: LegacyLedgerContract = "stats-scope",
): LedgerStatsScope {
  const bookId = searchParams.get("book");
  if (bookId !== null && !ledgerBookIdSchema.safeParse(bookId).success) {
    throw new APIError("VALIDATION_ERROR", "유효하지 않은 장부 ID입니다.", 400);
  }
  const scope = searchParams.get("scope");
  if (scope !== null && !["all", "shared", "personal"].includes(scope)) {
    throw new APIError(
      "VALIDATION_ERROR",
      "유효하지 않은 조회 범위입니다.",
      400,
    );
  }
  if (bookId) return { bookId };
  if (scope === "shared" || scope === "personal") {
    logLegacyLedgerContract(legacyContract, route);
    return { visibility: scope };
  }
  return {};
}
