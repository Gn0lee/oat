"use client";

import { CheckIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLedgerTitles } from "@/hooks/use-ledger-titles";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils/cn";

export interface LedgerTitleComboboxProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LedgerTitleCombobox({
  id,
  value,
  onValueChange,
  placeholder = "내용 입력",
  className,
}: LedgerTitleComboboxProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Keep internal input value in sync with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Query suggestions based on input value
  const { data, isLoading } = useLedgerTitles(inputValue);
  const suggestions = data?.titles ?? [];
  const hasMore = data?.hasMore ?? false;

  const showSuggestions =
    open && inputValue.trim().length >= 2 && suggestions.length > 0;

  if (isDesktop) {
    return (
      <Popover open={showSuggestions} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="w-full">
            <Input
              id={id}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                onValueChange(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onClick={(e) => {
                // Prevent click on input from toggling PopoverTrigger
                e.stopPropagation();
              }}
              placeholder={placeholder}
              className={className}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border border-border rounded-xl shadow-lg"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandGroup heading="최근 제목 제안">
                {suggestions.map((title) => (
                  <CommandItem
                    key={title}
                    value={title}
                    onSelect={() => {
                      setInputValue(title);
                      onValueChange(title);
                      setOpen(false);
                    }}
                    className="cursor-pointer py-2 hover:bg-accent rounded-md"
                  >
                    <CheckIcon
                      className={cn(
                        "size-4 mr-2 text-primary",
                        value === title ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate font-medium">{title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {hasMore && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-gray-100">
                  결과가 더 있습니다
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile Drawer autocomplete
  return (
    <>
      <Button
        id={id}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "h-10 w-full justify-start px-3 font-normal rounded-xl border border-input bg-background hover:bg-accent text-left",
          !value && "text-muted-foreground",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <span className="truncate">{value || placeholder}</span>
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>내용 입력 및 자동완성</DrawerTitle>
            <DrawerDescription>
              가계부의 내용을 입력하고 과거 기록에서 자동완성을 제안받습니다.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col h-full overflow-hidden">
            {/* Input field inside Drawer */}
            <div className="flex items-center gap-2 border-b px-4 h-14 shrink-0">
              <SearchIcon className="size-5 text-gray-400 shrink-0" />
              <Input
                autoFocus
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                }}
                placeholder="내용 입력"
                className="flex-1 border-0 shadow-none focus-visible:ring-0 text-base h-10 px-0"
              />
              {inputValue.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onValueChange(inputValue);
                    setOpen(false);
                  }}
                  className="font-medium text-primary text-sm px-2 h-9 rounded-lg"
                >
                  완료
                </Button>
              )}
            </div>

            {/* Suggestions list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <Command shouldFilter={false} className="h-full">
                <CommandList className="max-h-none h-full">
                  {inputValue.trim() &&
                    !suggestions.includes(inputValue.trim()) && (
                      <CommandGroup heading="입력 중인 내용">
                        <CommandItem
                          value={inputValue}
                          onSelect={() => {
                            onValueChange(inputValue);
                            setOpen(false);
                          }}
                          className="cursor-pointer py-3"
                        >
                          <span className="font-semibold text-primary truncate">
                            "{inputValue}" 직접 입력
                          </span>
                        </CommandItem>
                      </CommandGroup>
                    )}
                  {suggestions.length > 0 && (
                    <CommandGroup heading="최근 제목 제안">
                      {suggestions.map((title) => (
                        <CommandItem
                          key={title}
                          value={title}
                          onSelect={() => {
                            setInputValue(title);
                            onValueChange(title);
                            setOpen(false);
                          }}
                          className="cursor-pointer py-3"
                        >
                          <CheckIcon
                            className={cn(
                              "size-4 mr-2 text-primary",
                              value === title ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="truncate">{title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {hasMore && (
                    <div className="px-4 py-3 text-xs text-muted-foreground text-center border-t border-gray-100">
                      결과가 더 있습니다
                    </div>
                  )}
                  {inputValue.trim().length >= 2 &&
                    suggestions.length === 0 &&
                    !isLoading && (
                      <div className="p-6 text-center text-sm text-gray-500">
                        최근 기록 중 일치하는 제목이 없습니다.
                      </div>
                    )}
                </CommandList>
              </Command>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
