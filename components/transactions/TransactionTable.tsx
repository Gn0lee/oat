"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface TransactionTableProps {
  data: TransactionWithDetails[];
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

const columns: ColumnDef<TransactionWithDetails>[] = [
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
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => row.original.owner.name,
  },
];

export function TransactionTable({ data }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "transactedAt", desc: true },
  ]);

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
    <div className="rounded-xl border bg-white overflow-hidden">
      <Table>
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
              <TableCell colSpan={columns.length} className="h-24 text-center">
                거래 내역이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
