"use client";

import {
  CreditCard,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import type { PaymentMethodWithDetails } from "@/lib/api/payment-method";
import { PaymentMethodDeleteDialog } from "./PaymentMethodDeleteDialog";
import { PaymentMethodFormDialog } from "./PaymentMethodFormDialog";

const PAYMENT_METHOD_TYPE_LABELS: Record<string, string> = {
  credit_card: "신용카드",
  debit_card: "체크카드",
  prepaid: "선불페이",
  gift_card: "상품권",
  cash: "현금",
};

export function PaymentMethodList() {
  const { data: paymentMethods, isLoading, error } = usePaymentMethods();
  const { userId: currentUserId } = useCurrentUserId();

  const [editingMethod, setEditingMethod] =
    useState<PaymentMethodWithDetails | null>(null);
  const [deletingMethod, setDeletingMethod] =
    useState<PaymentMethodWithDetails | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleEdit = (method: PaymentMethodWithDetails) => {
    setEditingMethod(method);
    setIsFormOpen(true);
  };

  const handleDelete = (method: PaymentMethodWithDetails) => {
    setDeletingMethod(method);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMethod(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-destructive">
          결제수단 목록을 불러오는데 실패했습니다.
        </p>
      </div>
    );
  }

  if (!paymentMethods || paymentMethods.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-gray-500">등록된 결제수단이 없습니다.</p>
        <p className="text-sm text-gray-400 mt-1">
          상단의 &quot;추가&quot; 버튼으로 결제수단을 등록해보세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        {paymentMethods.map((method) => {
          const isOwner = currentUserId === method.ownerId;
          return (
            <article
              key={method.id}
              className="flex min-h-[96px] items-center gap-3 border-gray-100 border-t px-4 py-4 first:border-t-0 sm:px-5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <CreditCard className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h4 className="truncate font-semibold text-gray-900">
                    {method.name}
                  </h4>
                  {method.lastFour && (
                    <span className="text-gray-400 text-xs">
                      {method.lastFour}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-sm">
                  <span>
                    {PAYMENT_METHOD_TYPE_LABELS[method.type] || method.type}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-4" />
                    {method.ownerName}
                  </span>
                  <span>{method.issuer || "발급사 미입력"}</span>
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="size-4" />
                    {method.linkedAccountName || "연결 계좌 없음"}
                  </span>
                </div>
              </div>

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-9">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">메뉴 열기</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(method)}>
                      <Pencil className="mr-2 size-4" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(method)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </article>
          );
        })}
      </div>

      <PaymentMethodFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        paymentMethod={editingMethod}
      />

      <PaymentMethodDeleteDialog
        paymentMethod={deletingMethod}
        open={!!deletingMethod}
        onOpenChange={(open) => !open && setDeletingMethod(null)}
      />
    </>
  );
}
