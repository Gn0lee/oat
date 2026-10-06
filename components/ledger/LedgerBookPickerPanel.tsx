"use client";

import { CheckIcon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { orderRecentBooks } from "@/lib/ledger-books/recent-books";
import { cn } from "@/lib/utils/cn";
import type { LedgerBookListItem } from "@/types/ledger-book";

interface LedgerBookPickerPanelProps {
  books: LedgerBookListItem[];
  /** 선택된 장부 id */
  value?: string;
  title: string;
  onBack?: () => void;
  onValueChange: (bookId: string) => void;
  /**
   * section: 활성 장부 아래 "보관" 구역에서 보관 장부도 고른다 (장부 칩).
   * current-disabled: 보관 장부는 숨기고, 선택된 보관 장부만 선택 불가로 보인다 (기록 입력).
   */
  archived: "section" | "current-disabled";
}

function BookRow({
  book,
  isSelected,
  isDisabled = false,
  onSelect,
}: {
  book: LedgerBookListItem;
  isSelected: boolean;
  isDisabled?: boolean;
  onSelect: (bookId: string) => void;
}) {
  const meta = [
    book.visibility === "shared" ? "공용" : "개인",
    book.isDefault ? "기본" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        aria-pressed={isSelected}
        disabled={isDisabled}
        onClick={() => onSelect(book.id)}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {book.name}
            {isDisabled && " (보관됨)"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {meta}
          </span>
        </span>
        <CheckIcon
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            isSelected ? "opacity-100" : "opacity-0",
          )}
        />
      </button>
    </li>
  );
}

export function LedgerBookPickerPanel({
  books,
  value,
  title,
  onBack,
  onValueChange,
  archived,
}: LedgerBookPickerPanelProps) {
  const archivedHeadingId = useId();
  const ordered = orderRecentBooks(books);
  const activeBooks = ordered.filter((book) => !book.archivedAt);
  const archivedBooks = ordered.filter((book) => book.archivedAt);
  const currentArchivedBook =
    archived === "current-disabled"
      ? archivedBooks.find((book) => book.id === value)
      : undefined;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <h2 className="font-semibold">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onBack}
        >
          닫기
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <ul aria-label="장부">
          {currentArchivedBook && (
            <BookRow
              book={currentArchivedBook}
              isSelected
              isDisabled
              onSelect={onValueChange}
            />
          )}
          {activeBooks.map((book) => (
            <BookRow
              key={book.id}
              book={book}
              isSelected={book.id === value}
              onSelect={onValueChange}
            />
          ))}
        </ul>
        {archived === "section" && archivedBooks.length > 0 && (
          <section aria-labelledby={archivedHeadingId} className="mt-2">
            <h3
              id={archivedHeadingId}
              className="px-4 py-2 text-xs font-medium text-muted-foreground"
            >
              보관
            </h3>
            <ul aria-label="보관">
              {archivedBooks.map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  isSelected={book.id === value}
                  onSelect={onValueChange}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
