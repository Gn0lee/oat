// Only product ledger pages are accepted as a return destination. Never follow
// external URLs, protocol-relative URLs or encoded path separators.
export function safeLedgerReturnTo(
  value: string | null | undefined,
  fallback = "/ledger",
): string {
  if (!value || !value.startsWith("/ledger") || /[\\\r\n]/.test(value))
    return fallback;
  try {
    const url = new URL(value, "https://oat.invalid");
    if (
      url.origin !== "https://oat.invalid" ||
      !/^\/ledger(?:\/[a-zA-Z0-9_-]+)*$/.test(url.pathname)
    )
      return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function isLedgerRecordDate(
  value: string | null | undefined,
): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Date to open when moving to another month: today for the current month,
// otherwise the month's last day so the whole month's records are listed.
export function ledgerMonthAnchorDate(
  year: number,
  month: number,
  today: string,
): string {
  const lastDay = new Date(Date.UTC(year, month, 0));
  const anchor = lastDay.toISOString().slice(0, 10);
  return anchor.slice(0, 7) === today.slice(0, 7) ? today : anchor;
}

// Moving between ledger views carries only the book (and the target's own params).
export function ledgerScopeHref(
  pathname: string,
  bookId: string | undefined,
  params?: Record<string, string>,
): string {
  const search = new URLSearchParams(params);
  if (bookId) search.set("book", bookId);
  return search.size ? `${pathname}?${search}` : pathname;
}
