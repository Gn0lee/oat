"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function NewTransactionPage() {
  return (
    <PageContainer maxWidth="narrow">
      <PageHeader
        title="주식 거래 등록"
        backHref="/assets/stock/transactions"
      />
      <TransactionForm />
    </PageContainer>
  );
}
