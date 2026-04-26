"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import { CategoryList } from "@/components/ledger/CategoryList";

export default function CategoriesPage() {
  return (
    <PageContainer maxWidth="medium">
      <PageHeader title="카테고리 관리" backHref="/ledger" />
      <CategoryList />
    </PageContainer>
  );
}
