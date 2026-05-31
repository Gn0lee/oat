"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useLedgerStatsDetail } from "@/hooks/use-ledger-stats";
import type { LedgerStatsDetailParams } from "@/lib/api/ledger-stats";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface LedgerStatsDetailDrawerProps {
  open: boolean;
  title: string;
  params: LedgerStatsDetailParams | null;
  onOpenChange: (open: boolean) => void;
}

export function LedgerStatsDetailDrawer({
  open,
  title,
  params,
  onOpenChange,
}: LedgerStatsDetailDrawerProps) {
  const { data, isLoading } = useLedgerStatsDetail(open ? params : null);
  const items = data?.items ?? [];
  const hasMore = (data?.totalCount ?? 0) > items.length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {data ? `총 ${data.totalCount.toLocaleString()}건` : "상세 기록"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-gray-400 text-sm">
              기록이 없어요
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 text-sm">
                        {item.title || item.categoryName || "제목 없음"}
                      </p>
                      <p className="mt-1 text-gray-500 text-xs">
                        {formatDate(item.transactedAt)}
                        {item.fromPaymentMethodName
                          ? ` · ${item.fromPaymentMethodName}`
                          : ""}
                        {item.ownerName ? ` · ${item.ownerName}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-gray-900 text-sm">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data?.viewAllHref && (
          <DrawerFooter>
            <Button asChild variant={hasMore ? "default" : "outline"}>
              <Link href={data.viewAllHref}>전체 기록 보기</Link>
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
