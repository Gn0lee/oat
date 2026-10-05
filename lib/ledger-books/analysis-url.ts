// Analysis screens keep their scope in the URL (#436/#437): `book` (none =
// all books), `year`/`month` and the category screen's `type`. Moving between
// analysis screens carries the book and the period.
export interface LedgerAnalysisState {
  bookId?: string;
  year: number;
  month: number;
  type: "expense" | "income";
}

export function readLedgerAnalysisState(
  searchParams: URLSearchParams,
  today: string,
): LedgerAnalysisState {
  const [currentYear, currentMonth] = today.split("-").map(Number);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const isValidPeriod =
    Number.isInteger(year) &&
    year >= 1900 &&
    year <= 9999 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12;
  return {
    bookId: searchParams.get("book") ?? undefined,
    year: isValidPeriod ? year : currentYear,
    month: isValidPeriod ? month : currentMonth,
    type: searchParams.get("type") === "income" ? "income" : "expense",
  };
}

export function ledgerAnalysisHref(
  pathname: string,
  state: LedgerAnalysisState,
): string {
  const search = new URLSearchParams();
  if (state.bookId) search.set("book", state.bookId);
  search.set("year", String(state.year));
  search.set("month", String(state.month));
  return `${pathname}?${search}`;
}

export function withLedgerAnalysisState(
  searchParams: URLSearchParams,
  changes: Partial<LedgerAnalysisState>,
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  if ("bookId" in changes) {
    next.delete("scope");
    if (changes.bookId) next.set("book", changes.bookId);
    else next.delete("book");
  }
  if (changes.year !== undefined) next.set("year", String(changes.year));
  if (changes.month !== undefined) next.set("month", String(changes.month));
  if (changes.type !== undefined) next.set("type", changes.type);
  return next;
}
