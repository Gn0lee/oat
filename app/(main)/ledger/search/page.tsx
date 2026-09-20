import { PageContainer } from "@/components/layout";
import { LedgerSearchClient } from "@/components/ledger/search/LedgerSearchClient";
import { requireUser } from "@/lib/supabase/auth";

interface LedgerSearchPageProps {
  searchParams: Promise<{
    q?: string;
    scope?: string;
  }>;
}

export default async function LedgerSearchPage({
  searchParams,
}: LedgerSearchPageProps) {
  await requireUser();
  const { q, scope } = await searchParams;

  return (
    <PageContainer maxWidth="medium">
      <LedgerSearchClient
        initialQuery={q ?? ""}
        initialScope={scope === "personal" ? "personal" : "shared"}
      />
    </PageContainer>
  );
}
