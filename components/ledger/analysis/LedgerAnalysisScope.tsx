"use client";

import { Fragment, type ReactNode } from "react";
import { LedgerBookChips } from "@/components/ledger/scope/LedgerBookChips";
import { LedgerBookUnavailable } from "@/components/ledger/scope/LedgerBookUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { useLedgerAnalysisUrl } from "@/hooks/use-ledger-analysis-url";
import { useLedgerBook, useLedgerBooks } from "@/hooks/use-ledger-books";
import { ApiQueryError } from "@/lib/api/client";

// The book selector replaces the old shared/personal tabs on every analysis
// screen. Figures render only once the selected book is known to be visible.
export function LedgerAnalysisScope({ children }: { children: ReactNode }) {
  const { bookId, setBook, allBooksHref } = useLedgerAnalysisUrl();
  const { data: books = [], isPending: booksPending } = useLedgerBooks();
  const {
    data: book,
    isPending: bookPending,
    error: bookError,
  } = useLedgerBook(bookId ?? "");

  if (
    bookId &&
    bookError instanceof ApiQueryError &&
    (bookError.status === 404 || bookError.status === 400)
  ) {
    return <LedgerBookUnavailable href={allBooksHref} />;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {booksPending ? (
          <Skeleton className="h-11 w-full rounded-xl" />
        ) : (
          <LedgerBookChips
            books={books}
            selectedBookId={bookId}
            onSelect={setBook}
          />
        )}
        {book && (
          <output className="block text-sm text-gray-500">
            {book.visibility === "shared" ? "공용 장부" : "개인 장부"}
            {book.archivedAt ? " · 보관됨" : ""}
          </output>
        )}
      </div>
      {bookId && bookPending ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : (
        // Remount per book so per-screen selections never leak across books.
        <Fragment key={bookId ?? "all"}>{children}</Fragment>
      )}
    </div>
  );
}
