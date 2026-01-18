"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type React from "react";
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
import type { TransactionWithDetails } from "@/lib/api/transaction";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDateShort } from "@/lib/utils/format";
import { TransactionDeleteDialog } from "./TransactionDeleteDialog";
import { TransactionEditDialog } from "./TransactionEditDialog";

interface TransactionTableProps {
  data: TransactionWithDetails[];
  currentUserId: string;
}

// 정렬 버튼 헤더 컴포넌트
function SortableHeader({
  column,
  children,
}: {
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc: boolean) => void;
  };
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="h-8 px-2 hover:bg-transparent"
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 size-4" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 size-4" />
      ) : (
        <ArrowUpDown className="ml-1 size-4 opacity-50" />
      )}
    </Button>
  );
}

// 기본 컬럼 정의 (액션 컬럼 제외)
const baseColumns: ColumnDef<TransactionWithDetails>[] = [
  {
    accessorKey: "transactedAt",
    header: ({ column }) => (
      <SortableHeader column={column}>거래일</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-gray-600">
        {formatDateShort(row.original.transactedAt)}
      </span>
    ),
  },
  {
    accessorKey: "stockName",
    header: ({ column }) => (
      <SortableHeader column={column}>종목</SortableHeader>
    ),
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.stockName}</div>
        <div className="text-xs text-gray-500">{row.original.ticker}</div>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "유형",
    cell: ({ row }) => (
      <Badge variant={row.original.type === "buy" ? "default" : "secondary"}>
        {row.original.type === "buy" ? "매수" : "매도"}
      </Badge>
    ),
  },
  {
    id: "quantity",
    accessorKey: "quantity",
    header: "수량",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.quantity.toLocaleString()}
      </span>
    ),
  },
  {
    id: "price",
    accessorKey: "price",
    header: "단가",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.price, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "금액",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {formatCurrency(row.original.totalAmount, row.original.currency)}
      </span>
    ),
  },
  {
    id: "owner",
    accessorKey: "owner",
    header: "소유자",
    cell: ({ row }) => row.original.owner.name,
  },
];

export function TransactionTable({
  data,
  currentUserId,
}: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "transactedAt", desc: true },
  ]);

  // 수정/삭제 다이얼로그 상태
  const [editTransaction, setEditTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [deleteTransaction, setDeleteTransaction] =
    useState<TransactionWithDetails | null>(null);

  // 액션 컬럼 추가
  const columns: ColumnDef<TransactionWithDetails>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "",
      meta: { className: "w-12" },
      cell: ({ row }) => {
        const transaction = row.original;
        const isOwner = transaction.owner.id === currentUserId;

        // 본인 거래가 아니면 액션 버튼 숨김
        if (!isOwner) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">메뉴 열기</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditTransaction(transaction)}>
                <Pencil className="mr-2 size-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteTransaction(transaction)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-50">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { className?: string }
                    | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn("px-4 py-3", meta?.className)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | { className?: string }
                      | undefined;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn("px-4 py-3", meta?.className)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  거래 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 수정 다이얼로그 */}
      <TransactionEditDialog
        transaction={editTransaction}
        open={!!editTransaction}
        onOpenChange={(open) => !open && setEditTransaction(null)}
      />

      {/* 삭제 확인 다이얼로그 */}
      <TransactionDeleteDialog
        transaction={deleteTransaction}
        open={!!deleteTransaction}
        onOpenChange={(open) => !open && setDeleteTransaction(null)}
      />
    </>
  );
}
