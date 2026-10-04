import { PageContainer } from "@/components/layout";
import { LedgerBooksClient } from "@/components/ledger/books/LedgerBooksClient";
import { requireUser } from "@/lib/supabase/auth";

export default async function LedgerBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  await requireUser();
  const search = await searchParams;
  const returnTo = Array.isArray(search.returnTo)
    ? search.returnTo[0]
    : search.returnTo;

  return (
    <PageContainer maxWidth="default">
      <LedgerBooksClient returnTo={returnTo} />
    </PageContainer>
  );
}
