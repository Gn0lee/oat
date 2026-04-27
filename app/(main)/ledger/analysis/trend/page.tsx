import { TrendClient } from "@/components/ledger/analysis/TrendClient";
import type { StatsScope } from "@/lib/api/ledger-stats";

export default async function TrendPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: rawScope } = await searchParams;
  const scope = (rawScope === "personal" ? "personal" : "shared") as StatsScope;
  return <TrendClient scope={scope} />;
}
