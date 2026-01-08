"use client";

import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function NewTransactionPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">주식 거래 등록</h1>
      <TransactionForm />
    </div>
  );
}
