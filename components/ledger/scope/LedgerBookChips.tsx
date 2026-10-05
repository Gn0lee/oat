"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import type { LedgerBook } from "@/types/ledger-book";

interface LedgerBookChipsProps {
  books: LedgerBook[];
  /** 없으면 전체 장부 범위 */
  selectedBookId?: string;
  onSelect: (bookId: string | undefined) => void;
}

function orderBooks(books: LedgerBook[]) {
  const active = books.filter((book) => !book.archivedAt);
  return [
    ...active.filter((book) => book.isDefault),
    ...active.filter((book) => !book.isDefault),
    ...books.filter((book) => book.archivedAt),
  ];
}

export function LedgerBookChips({
  books,
  selectedBookId,
  onSelect,
}: LedgerBookChipsProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Keep a book picked from a direct link visible in the scroller.
  useEffect(() => {
    if (!selectedBookId) return;
    selectedRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "center",
    });
  }, [selectedBookId]);

  const chips = [
    { id: undefined, name: "전체", note: null },
    ...orderBooks(books).map((book) => ({
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
    <fieldset
      aria-label="조회 장부"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-4 text-[15px] font-semibold transition-colors",
              isSelected
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 active:bg-gray-50",
            )}
          >
            {chip.name}
            {chip.note && (
              <span className="text-xs font-medium text-gray-400">
                {chip.note}
              </span>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
