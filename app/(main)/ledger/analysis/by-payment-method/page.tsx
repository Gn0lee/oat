import { ByPaymentMethodClient } from "@/components/ledger/analysis/ByPaymentMethodClient";
import type { StatsScope } from "@/lib/api/ledger-stats";

export default async function ByPaymentMethodPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: rawScope } = await searchParams;
  const scope = (rawScope === "personal" ? "personal" : "shared") as StatsScope;
  return <ByPaymentMethodClient scope={scope} />;
}
