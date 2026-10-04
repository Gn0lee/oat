"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  EntryRow,
  GroupedList,
  ScreenSection,
  SectionHeader,
} from "@/components/layout/screen";
import { ScreenState } from "@/components/layout/screen/ScreenState";
import { useLedgerBooks } from "@/hooks/use-ledger-books";

export function LedgerBooksSection() {
  const { data: books, isLoading, error } = useLedgerBooks();
  const activeBooks = (books ?? []).filter((book) => !book.archivedAt);

  return (
    <ScreenSection>
      <SectionHeader
        title="장부 목록"
        action={
          <Link
            href="/ledger/books"
            className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary"
          >
            관리 <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      {isLoading ? (
        <GroupedList>
          <div className="min-h-16 animate-pulse bg-white px-4 py-5 text-sm text-gray-400">
            장부를 불러오고 있어요
          </div>
        </GroupedList>
      ) : error ? (
        <ScreenState type="error" title="장부를 불러오지 못했어요" />
      ) : activeBooks.length === 0 ? (
        <ScreenState type="empty" title="사용할 수 있는 장부가 없어요" />
      ) : (
        <GroupedList>
          {activeBooks.map((book) => (
            <EntryRow
              key={book.id}
              href={`/ledger/records?book=${encodeURIComponent(book.id)}`}
              icon={BookOpen}
              title={
                <span className="line-clamp-2 whitespace-normal break-words">
                  {book.name}
                </span>
              }
              description={
                book.visibility === "shared" ? "공용 장부" : "개인 장부"
              }
              trailing={
                book.isDefault ? (
                  <span className="text-xs text-gray-500">기본</span>
                ) : undefined
              }
            />
          ))}
        </GroupedList>
      )}
    </ScreenSection>
  );
}
