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
import { MARKET_LABELS } from "@/constants/enums";
import type { HoldingWithDetails } from "@/lib/api/holdings";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

interface HoldingsTableProps {
  data: HoldingWithDetails[];
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

const columns: ColumnDef<HoldingWithDetails>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>종목</SortableHeader>
    ),
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-gray-500">{row.original.ticker}</div>
      </div>
    ),
  },
  {
    id: "owner",
    accessorKey: "owner",
    header: "소유자",
    cell: ({ row }) => row.original.owner.name,
  },
  {
    id: "account",
    accessorKey: "account",
    header: "계좌",
    cell: ({ row }) => row.original.account.name ?? "-",
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <SortableHeader column={column}>수량</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.quantity.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "avgPrice",
    header: ({ column }) => (
      <SortableHeader column={column}>평균 매수가</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.avgPrice, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "totalInvested",
    header: ({ column }) => (
      <SortableHeader column={column}>투자 금액</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {formatCurrency(row.original.totalInvested, row.original.currency)}
      </span>
    ),
  },
  {
    id: "market",
    accessorKey: "market",
    header: "시장",
    cell: ({ row }) => (
      <Badge variant="outline">
        {MARKET_LABELS[row.original.market] ?? row.original.market}
      </Badge>
    ),
  },
];

export function HoldingsTable({ data }: HoldingsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalInvested", desc: true },
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
    <div className="rounded-xl border bg-white overflow-x-auto">
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
                보유 종목이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
