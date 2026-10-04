import { PageContainer } from "@/components/layout";
import { LedgerBookDetailClient } from "@/components/ledger/books/LedgerBookDetailClient";
import { requireUser } from "@/lib/supabase/auth";

interface LedgerBookDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export default async function LedgerBookDetailPage({
  params,
  searchParams,
}: LedgerBookDetailPageProps) {
  await requireUser();
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const returnTo = Array.isArray(search.returnTo)
    ? search.returnTo[0]
    : search.returnTo;

  return (
    <PageContainer maxWidth="medium">
      <LedgerBookDetailClient id={id} returnTo={returnTo} />
    </PageContainer>
  );
}
