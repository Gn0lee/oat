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
