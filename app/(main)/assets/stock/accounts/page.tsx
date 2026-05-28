"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AccountFormDialog, AccountList } from "@/components/accounts";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function AccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <PageContainer maxWidth="medium">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          계좌 추가
        </Button>
      </div>

      <AccountList filter="investment" />

      <AccountFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </PageContainer>
  );
}
