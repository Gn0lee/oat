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

  const { data: stocks = [], isLoading } = useStockSearch({
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
            <CommandInput
              placeholder="종목명, 티커, 초성으로 검색해보세요"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[400px]">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && !debouncedQuery && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  검색어를 입력하세요
                </div>
              )}
              {!isLoading && debouncedQuery && stocks.length === 0 && (
                <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
              )}
              {!isLoading && stocks.length > 0 && (
                <CommandGroup
                  heading={`검색 결과 ${stocks.length}${stocks.length >= 50 ? "+" : ""}건`}
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
