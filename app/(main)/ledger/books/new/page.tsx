import { PageContainer } from "@/components/layout";
import { LedgerBookCreateForm } from "@/components/ledger/books/LedgerBookCreateForm";
import { requireUser } from "@/lib/supabase/auth";

export default async function LedgerBookCreatePage({
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
    <PageContainer maxWidth="medium">
      <div className="mb-6">
        <p className="text-sm text-gray-500">장부 관리</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900">새 장부</h1>
      </div>
      <LedgerBookCreateForm returnTo={returnTo} />
    </PageContainer>
  );
}
