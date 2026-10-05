// Pre-book clients (cached PWA bundles from before the ledger-book release)
// still send these shapes. Each hit is logged as one JSON line so the release
// owner can confirm zero legacy requests in the deployment logs before the
// is_shared / legacy-contract removal (#446) is applied.
export type LegacyLedgerContract =
  | "stats-scope"
  | "summary-scope"
  | "entries-scope"
  | "entries-tag-filter"
  | "search-scope-offset"
  | "entry-create-is-shared"
  | "tags-scope";

export function logLegacyLedgerContract(
  contract: LegacyLedgerContract,
  route: string,
) {
  console.warn(
    JSON.stringify({ event: "legacy-ledger-contract", contract, route }),
  );
}
