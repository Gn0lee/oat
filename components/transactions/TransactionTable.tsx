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
import { formatCurrency, formatDateShort } from "@/lib/utils/format";

interface TransactionTableProps {
  data: TransactionWithDetails[];
}

const columns: ColumnDef<TransactionWithDetails>[] = [
  {
    accessorKey: "transactedAt",
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(sorted === "asc")}
          className="-ml-4 h-8 hover:bg-transparent"
        >
          거래일
          {sorted === "asc" ? (
            <ArrowUp className="ml-2 size-4" />
          ) : sorted === "desc" ? (
            <ArrowDown className="ml-2 size-4" />
          ) : (
            <ArrowUpDown className="ml-2 size-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => formatDateShort(row.original.transactedAt),
  },
  {
    accessorKey: "stockName",
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(sorted === "asc")}
          className="-ml-4 h-8 hover:bg-transparent"
        >
          종목
          {sorted === "asc" ? (
            <ArrowUp className="ml-2 size-4" />
          ) : sorted === "desc" ? (
            <ArrowDown className="ml-2 size-4" />
          ) : (
            <ArrowUpDown className="ml-2 size-4" />
          )}
        </Button>
      );
    },
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
    accessorKey: "quantity",
    header: "수량",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.quantity.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "price",
    header: "단가",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.price, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "총 금액",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {formatCurrency(row.original.totalAmount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "owner",
    header: "소유자",
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
    <div className="rounded-xl border bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
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
