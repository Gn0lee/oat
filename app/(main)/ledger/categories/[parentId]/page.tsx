import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { CategoryChildrenPage } from "@/components/ledger/CategoryChildrenPage";
import { getUserHouseholdId } from "@/lib/api/invitation";
import { createClient } from "@/lib/supabase/server";

interface CategoryChildrenRouteProps {
  params: Promise<{ parentId: string }>;
}

export default async function CategoryChildrenRoute({
  params,
}: CategoryChildrenRouteProps) {
  const { parentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const householdId = await getUserHouseholdId(supabase, user.id);
  if (!householdId) notFound();

  const { data: parent } = await supabase
    .from("categories")
    .select("*")
    .eq("id", parentId)
    .eq("household_id", householdId)
    .is("parent_id", null)
    .maybeSingle();

  if (!parent) notFound();

  return (
    <PageContainer maxWidth="medium">
      <CategoryChildrenPage parent={parent} />
    </PageContainer>
  );
}
