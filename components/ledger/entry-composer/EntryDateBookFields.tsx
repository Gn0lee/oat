"use client";

import { ChevronsUpDownIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { composerFieldClassName } from "@/components/composer/field-styles";
import { LedgerBookPickerPanel } from "@/components/ledger/LedgerBookPickerPanel";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils/cn";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";

const BOOK_PLACEHOLDER = "장부 선택";

const BookTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { label?: string; open: boolean }
>(function BookTrigger({ label, open, className, ...props }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "h-11 min-h-11 w-full justify-between px-3 font-normal",
        className,
      )}
      {...props}
    >
      <span className={cn("truncate", !label && "text-muted-foreground")}>
        {label ?? BOOK_PLACEHOLDER}
      </span>
      <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
    </Button>
  );
});

export function EntryDateBookFields({ index }: { index: number }) {
  const form = useFormContext<LedgerComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const { data: books = [] } = useLedgerBooks();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isBookOpen, setIsBookOpen] = useState(false);
  const bookTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasBookOpen = useRef(false);
  const book = books.find((candidate) => candidate.id === item?.bookId);
  const rowNumber = index + 1;

  // 모바일 시트가 닫히면 트리거로 포커스를 돌려준다. 데스크톱 Popover는 Radix가 처리한다.
  useEffect(() => {
    if (!isDesktop && !isBookOpen && wasBookOpen.current) {
      bookTriggerRef.current?.focus();
    }
    wasBookOpen.current = isBookOpen;
  }, [isBookOpen, isDesktop]);

  if (!item) return null;

  const selectBook = (bookId: string) => {
    form.setValue(`items.${index}.bookId`, bookId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setIsBookOpen(false);
  };
  const bookTriggerProps = {
    id: `entry-book-${rowNumber}`,
    className: composerFieldClassName,
    "aria-label": `장부 ${rowNumber}`,
    label: book
      ? `${book.name}${book.archivedAt ? " (보관됨)" : ""}`
      : undefined,
    open: isBookOpen,
  };
  const bookPanel = (
    <LedgerBookPickerPanel
      books={books}
      value={item.bookId}
      title={BOOK_PLACEHOLDER}
      archived="current-disabled"
      onBack={() => setIsBookOpen(false)}
      onValueChange={selectBook}
    />
  );

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`entry-date-${rowNumber}`}>날짜</Label>
        <DatePickerInput
          id={`entry-date-${rowNumber}`}
          aria-label={`날짜 ${rowNumber}`}
          className={composerFieldClassName}
          value={item.transactedAt}
          onChange={(value) =>
            form.setValue(`items.${index}.transactedAt`, value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`entry-book-${rowNumber}`}>장부</Label>
        {isDesktop ? (
          <Popover open={isBookOpen} onOpenChange={setIsBookOpen}>
            <PopoverTrigger asChild>
              <BookTrigger {...bookTriggerProps} />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="flex max-h-[min(24rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] flex-col p-0"
            >
              {bookPanel}
            </PopoverContent>
          </Popover>
        ) : (
          <>
            <BookTrigger
              ref={bookTriggerRef}
              {...bookTriggerProps}
              onClick={() => setIsBookOpen(true)}
            />
            <Drawer open={isBookOpen} onOpenChange={setIsBookOpen}>
              <DrawerContent
                className="max-h-[85dvh] p-0 pb-[env(safe-area-inset-bottom)]"
                showHandle={false}
              >
                <DrawerTitle className="sr-only">
                  {BOOK_PLACEHOLDER}
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  기록을 넣을 장부를 고르세요.
                </DrawerDescription>
                {bookPanel}
              </DrawerContent>
            </Drawer>
          </>
        )}
      </div>
    </>
  );
}

export function EntryBookNotice({ index }: { index: number }) {
  const form = useFormContext<LedgerComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const { data: books = [] } = useLedgerBooks();
  const book = books.find((candidate) => candidate.id === item?.bookId);
  if (!book)
    return (
      <p className="text-sm text-muted-foreground">장부를 선택해 주세요.</p>
    );
  return (
    <output className="text-xs text-muted-foreground">
      {book.visibility === "shared" ? "공용 장부" : "개인 장부"}
    </output>
  );
}
