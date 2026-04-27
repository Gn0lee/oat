import { DailyClient } from "@/components/ledger/analysis/DailyClient";
import type { StatsScope } from "@/lib/api/ledger-stats";

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: rawScope } = await searchParams;
  const scope = (rawScope === "personal" ? "personal" : "shared") as StatsScope;
  return <DailyClient scope={scope} />;
}
