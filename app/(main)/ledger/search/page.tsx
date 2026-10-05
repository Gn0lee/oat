import { PageContainer } from "@/components/layout";
import { LedgerSearchClient } from "@/components/ledger/search/LedgerSearchClient";
import { requireUser } from "@/lib/supabase/auth";

interface LedgerSearchPageProps {
  searchParams: Promise<{
    q?: string;
    book?: string;
  }>;
}

export default async function LedgerSearchPage({
  searchParams,
}: LedgerSearchPageProps) {
  await requireUser();
  const { q, book } = await searchParams;

  return (
    <PageContainer maxWidth="medium">
      <LedgerSearchClient initialQuery={q ?? ""} initialBookId={book} />
    </PageContainer>
  );
}
