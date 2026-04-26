"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { CategoryFormDialog } from "@/components/ledger/CategoryFormDialog";
import { CategoryList } from "@/components/ledger/CategoryList";
import { Button } from "@/components/ui/button";
import type { CategoryType } from "@/types";

export default function CategoriesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryType>("expense");

  return (
    <PageContainer maxWidth="medium">
      <PageHeader
        title="카테고리 관리"
        backHref="/ledger"
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            카테고리 추가
          </Button>
        }
      />

      <CategoryList activeTab={activeTab} onTabChange={setActiveTab} />

      <CategoryFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        type={activeTab}
        mode="create"
      />
    </PageContainer>
  );
}
