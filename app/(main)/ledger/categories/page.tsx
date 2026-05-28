"use client";

import { PageContainer } from "@/components/layout";
import { CategoryList } from "@/components/ledger/CategoryList";

export default function CategoriesPage() {
  return (
    <PageContainer maxWidth="medium">
      <CategoryList />
    </PageContainer>
  );
}
