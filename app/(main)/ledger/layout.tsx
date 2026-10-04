import { LedgerIdentityProvider } from "@/hooks/use-ledger-identity";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function LedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: member, error } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("가구 정보를 불러올 수 없습니다.");
  return (
    <LedgerIdentityProvider
      value={{
        userId: user.id,
        householdId: member?.household_id ?? null,
        role: member?.role ?? null,
      }}
    >
      {children}
    </LedgerIdentityProvider>
  );
}
