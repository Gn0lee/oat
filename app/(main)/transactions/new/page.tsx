"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Button } from "@/components/ui/button";

export default function NewTransactionPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">거래 등록</h1>
        </div>

        <TransactionForm />
      </div>
    </div>
  );
}
