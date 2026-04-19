"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">결제수단명</TableHead>
              <TableHead>소유자</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>카드사/서비스</TableHead>
              <TableHead>연결 계좌</TableHead>
              <TableHead className="w-12 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.map((method) => {
              const isOwner = currentUserId === method.ownerId;
              return (
                <TableRow key={method.id}>
                  <TableCell className="font-medium pl-5">
                    <div className="flex items-center gap-2">
                      {method.name}
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          기본
                        </Badge>
                      )}
                      {method.lastFour && (
                        <span className="text-xs text-gray-400">
                          ···· {method.lastFour}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {method.ownerName}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {PAYMENT_METHOD_TYPE_LABELS[method.type] || method.type}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {method.issuer || "-"}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {method.linkedAccountName || "-"}
                  </TableCell>
                  <TableCell className="pr-5">
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">메뉴 열기</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(method)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(method)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
