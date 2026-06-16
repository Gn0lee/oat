import { Plus } from "lucide-react";
import Link from "next/link";
import { AccountList } from "@/components/accounts";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function AccountsPage() {
  return (
    <PageContainer maxWidth="medium">
      <AccountList
        action={
          <Button size="sm" asChild>
            <Link href="/assets/accounts/new">
              <Plus className="w-4 h-4 mr-1" />
              계좌 추가
            </Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
