"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { StockSettingEditDialog } from "@/components/stock-settings/StockSettingEditDialog";
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
import {
  ASSET_TYPE_LABELS,
  MARKET_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
} from "@/constants/enums";
import type { StockSettingWithDetails } from "@/lib/api/stock-settings";
import { cn } from "@/lib/utils/cn";

interface StockSettingsTableProps {
  data: StockSettingWithDetails[];
}

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

function createColumns(
  onEdit: (setting: StockSettingWithDetails) => void,
): ColumnDef<StockSettingWithDetails>[] {
  return [
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
      id: "market",
      accessorKey: "market",
      header: "시장",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <Badge variant="outline">
          {MARKET_LABELS[row.original.market] ?? row.original.market}
        </Badge>
      ),
    },
    {
      id: "assetType",
      accessorKey: "assetType",
      header: ({ column }) => (
        <SortableHeader column={column}>자산유형</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-gray-600">
          {ASSET_TYPE_LABELS[row.original.assetType] ?? row.original.assetType}
        </span>
      ),
    },
    {
      id: "riskLevel",
      accessorKey: "riskLevel",
      header: ({ column }) => (
        <SortableHeader column={column}>위험도</SortableHeader>
      ),
      cell: ({ row }) => {
        const riskLevel = row.original.riskLevel;
        if (!riskLevel) {
          return <span className="text-gray-400">미설정</span>;
        }
        return (
          <Badge
            variant="secondary"
            className={RISK_LEVEL_COLORS[riskLevel] ?? ""}
          >
            {RISK_LEVEL_LABELS[riskLevel] ?? riskLevel}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      meta: { className: "w-[60px]" },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(row.original)}
        >
          <Pencil className="size-4" />
          <span className="sr-only">수정</span>
        </Button>
      ),
    },
  ];
}

export function StockSettingsTable({ data }: StockSettingsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [selectedSetting, setSelectedSetting] =
    useState<StockSettingWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEdit = useCallback((setting: StockSettingWithDetails) => {
    setSelectedSetting(setting);
    setDialogOpen(true);
  }, []);

  const columns = useMemo(() => createColumns(handleEdit), [handleEdit]);

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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  등록된 종목이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <StockSettingEditDialog
        setting={selectedSetting}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
