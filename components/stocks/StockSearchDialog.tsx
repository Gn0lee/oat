"use client";

import { CheckIcon, LoaderIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useStockSearch } from "@/hooks/use-stock-search";
import { cn } from "@/lib/utils/cn";
import type { MarketType, StockMaster } from "@/types";

interface StockSearchDialogProps {
  value?: StockMaster | null;
  onSelect: (stock: StockMaster) => void;
  market?: MarketType;
  placeholder?: string;
  disabled?: boolean;
}

export function StockSearchDialog({
  value,
  onSelect,
  market,
  placeholder = "종목을 검색하세요",
  disabled = false,
}: StockSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const {
    data: stocks,
    isLoading, // 데이터가 없고 첫 로딩일 때만 true
    isFetching, // 데이터를 가져오는 중이면 무조건 true (배경 로딩 포함)
  } = useStockSearch({
    query: debouncedQuery,
    market,
    limit: 50,
    enabled: open && debouncedQuery.length > 0,
  });

  const handleSelect = (stock: StockMaster) => {
    onSelect(stock);
    setOpen(false);
    setQuery("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setQuery("");
    }
  };

  // debouncedQuery가 빈 문자열이면 false로 취급됩니다.
  const hasQuery = debouncedQuery.length > 0;

  const showInitialLoading = isLoading && stocks.length === 0;

  // 검색어가 있고, 로딩이 끝났는데, 결과가 0개일 때
  const showEmptyState =
    !isLoading && !isFetching && stocks.length === 0 && hasQuery;

  // [핵심 변경] 데이터가 있어도, 검색어(hasQuery)가 없으면 리스트를 보여주지 않음
  const showList = stocks.length > 0 && hasQuery;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full justify-start font-normal"
      >
        {value ? (
          <span className="flex items-center gap-2">
            <span className="font-medium">{value.code}</span>
            <span className="text-muted-foreground">{value.name}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground">
            <SearchIcon className="size-4" />
            {placeholder}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogHeader className="sr-only">
          <DialogTitle>종목 검색</DialogTitle>
          <DialogDescription>
            티커, 종목명, 초성으로 검색하세요
          </DialogDescription>
        </DialogHeader>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <Command shouldFilter={false}>
            <div className="relative">
              <CommandInput
                placeholder="종목명, 티커, 초성으로 검색해보세요"
                value={query}
                onValueChange={setQuery}
              />
              {/* 우측 상단에 작은 로딩 인디케이터 표시 (UX 개선) */}
              {isFetching && (
                <div className="absolute right-3 top-3.5">
                  <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* min-h-[300px]를 주어 높이 흔들림 방지 */}
            <CommandList className="max-h-[400px] min-h-[300px]">
              {/* 1. 최초 로딩 (데이터 없음) */}
              {showInitialLoading && (
                <div className="flex h-[300px] items-center justify-center">
                  <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* 2. 검색어 없음 */}
              {!hasQuery && (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  검색어를 입력하세요
                </div>
              )}

              {/* 3. 검색 결과 없음 (로딩 끝난 후) */}
              {showEmptyState && (
                <div className="flex h-[300px] items-center justify-center">
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    검색 결과가 없습니다
                  </CommandEmpty>
                </div>
              )}

              {/* 4. 리스트 표시 (이전 데이터 유지 + 배경 로딩 시 투명도 조절) */}
              {showList && (
                <CommandGroup
                  heading={`검색 결과 ${stocks.length}${
                    stocks.length >= 50 ? "+" : ""
                  }건`}
                  // 새 데이터를 가져오는 중이면 살짝 흐리게 처리
                  className={cn(
                    "transition-opacity duration-200",
                    isFetching && "opacity-60",
                  )}
                >
                  {stocks.map((stock) => (
                    <CommandItem
                      key={stock.id}
                      value={stock.id}
                      onSelect={() => handleSelect(stock)}
                    >
                      <div className="flex flex-1 items-center gap-3 min-w-0">
                        <span className="shrink-0 w-16 font-mono font-medium text-sm">
                          {stock.code}
                        </span>
                        <span className="flex-1 truncate text-muted-foreground">
                          {stock.name}
                        </span>
                        {value?.id === stock.id && (
                          <CheckIcon className="shrink-0 size-4 text-primary" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
