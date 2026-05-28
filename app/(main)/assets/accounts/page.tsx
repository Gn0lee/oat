import { Plus } from "lucide-react";
import Link from "next/link";
import { AccountList } from "@/components/accounts";
import { PageActions, PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function AccountsPage() {
  return (
    <PageContainer maxWidth="medium">
      <PageActions>
        <Button size="sm" asChild>
          <Link href="/assets/accounts/new">
            <Plus className="w-4 h-4 mr-1" />
            계좌 추가
          </Link>
        </Button>
      </PageActions>

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold mb-3">자산 계좌</h2>
          <AccountList />
        </section>
      </div>
    </PageContainer>
  );
}
