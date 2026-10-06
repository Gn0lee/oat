"use client";

import { useEffect, useRef, useState } from "react";
import { LedgerBookPickerPanel } from "@/components/ledger/LedgerBookPickerPanel";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { selectChipBooks } from "@/lib/ledger-books/recent-books";
import { cn } from "@/lib/utils/cn";
import type { LedgerBookListItem } from "@/types/ledger-book";

const chipClassName =
  "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-4 text-[15px] font-semibold transition-colors";

interface LedgerBookChipsProps {
  books: LedgerBookListItem[];
  /** 없으면 전체 장부 범위 */
  selectedBookId?: string;
  onSelect: (bookId: string | undefined) => void;
}

export function LedgerBookChips({
  books,
  selectedBookId,
  onSelect,
}: LedgerBookChipsProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLButtonElement>(null);
  const previousOpen = useRef(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Return focus to the picker chip once the sheet closes.
  useEffect(() => {
    if (!isPickerOpen && previousOpen.current) pickerRef.current?.focus();
    previousOpen.current = isPickerOpen;
  }, [isPickerOpen]);

  // Keep a book picked from a direct link visible in the scroller.
  useEffect(() => {
    if (!selectedBookId) return;
    selectedRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "center",
    });
  }, [selectedBookId]);

  const { books: chipBooks, hasPicker } = selectChipBooks(
    books,
    selectedBookId,
  );
  const chips = [
    { id: undefined, name: "전체", note: null },
    ...chipBooks.map((book) => ({
      id: book.id,
      name: book.name,
      note: book.archivedAt
        ? "보관"
        : book.visibility === "personal"
          ? "개인"
          : null,
    })),
  ];

  return (
    <>
      <fieldset
        aria-label="조회 장부"
        className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map((chip) => {
          const isSelected = chip.id === selectedBookId;
          return (
            <button
              key={chip.id ?? "all"}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                if (!isSelected) onSelect(chip.id);
              }}
              className={cn(
                chipClassName,
                isSelected
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 active:bg-gray-50",
              )}
            >
              <span className="max-w-40 truncate">{chip.name}</span>
              {chip.note && (
                <span className="text-xs font-medium text-gray-500">
                  {chip.note}
                </span>
              )}
            </button>
          );
        })}
        {hasPicker && (
          <button
            ref={pickerRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setIsPickerOpen(true)}
            className={cn(chipClassName, "text-gray-500 active:bg-gray-50")}
          >
            장부 선택
          </button>
        )}
      </fieldset>
      {hasPicker && (
        <Drawer open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DrawerContent
            className="h-[85dvh] max-h-[85dvh] p-0"
            showHandle={false}
          >
            <DrawerTitle className="sr-only">장부 선택</DrawerTitle>
            <DrawerDescription className="sr-only">
              조회할 장부를 선택하세요.
            </DrawerDescription>
            <LedgerBookPickerPanel
              books={books}
              value={selectedBookId}
              title="장부 선택"
              archived="section"
              onBack={() => setIsPickerOpen(false)}
              onValueChange={(bookId) => {
                setIsPickerOpen(false);
                if (bookId !== selectedBookId) onSelect(bookId);
              }}
            />
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
