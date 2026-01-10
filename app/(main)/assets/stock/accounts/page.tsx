"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AccountFormDialog, AccountList } from "@/components/accounts";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function AccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <PageContainer maxWidth="medium">
      <PageHeader
        title="계좌 관리"
        backHref="/assets/stock"
        action={
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            계좌 추가
          </Button>
        }
      />

      <AccountList />

      <AccountFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </PageContainer>
  );
}
