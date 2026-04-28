import { ByCategoryClient } from "@/components/ledger/analysis/ByCategoryClient";
import type { StatsScope } from "@/lib/api/ledger-stats";

export default async function ByCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: rawScope } = await searchParams;
  const scope = (rawScope === "personal" ? "personal" : "shared") as StatsScope;
  return <ByCategoryClient scope={scope} />;
}
