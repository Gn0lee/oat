"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import {
  AccountFormDialog,
  AccountList,
  PaymentMethodFormDialog,
  PaymentMethodList,
} from "@/components/accounts";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AddDialogType = "bank" | "investment" | "payment" | null;

export default function AccountsPage() {
  const [openDialog, setOpenDialog] = useState<AddDialogType>(null);

  return (
    <PageContainer maxWidth="medium">
      <PageHeader
        title="계좌 / 결제수단"
        backHref="/assets"
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                추가
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOpenDialog("bank")}>
                은행 계좌 추가
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenDialog("investment")}>
                투자 계좌 추가
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenDialog("payment")}>
                결제수단 추가
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold mb-3">자산 계좌</h2>
          <AccountList />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">결제수단</h2>
          <PaymentMethodList />
        </section>
      </div>

      <AccountFormDialog
        open={openDialog === "bank" || openDialog === "investment"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        category={openDialog === "bank" ? "bank" : "investment"}
      />

      <PaymentMethodFormDialog
        open={openDialog === "payment"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      />
    </PageContainer>
  );
}
