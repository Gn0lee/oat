"use client";

import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import {
  EntryRow,
  GroupedList,
  ScreenSection,
  ScreenState,
  SectionHeader,
} from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { safeLedgerReturnTo } from "@/lib/ledger-books/navigation";

export function LedgerBooksClient({ returnTo }: { returnTo?: string | null }) {
  const { data: books, isLoading, error } = useLedgerBooks();
  const { userId, householdId } = useLedgerIdentity();
  const hasHousehold = Boolean(userId && householdId);
  const safeReturn = safeLedgerReturnTo(returnTo, "/ledger");

  return (
    <div className="space-y-6">
      <ScreenSection>
        <SectionHeader
          title="장부 관리"
          description="공용 장부와 내 개인 장부를 관리해요"
          action={
            hasHousehold ? (
              <Button asChild className="min-h-11">
                <Link
                  href={`/ledger/books/new?returnTo=${encodeURIComponent(safeReturn)}`}
                >
                  <Plus className="mr-2 size-4" />새 장부
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/settings/household">가구 설정</Link>
              </Button>
            )
          }
        />

        {userId && !householdId ? (
          <ScreenState
            type="empty"
            title="가구 설정이 필요해요"
            description="가구에 가입하거나 설정한 뒤 장부를 관리할 수 있어요."
            action={
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/settings/household">가구 설정으로 이동</Link>
              </Button>
            }
          />
        ) : isLoading ? (
          <GroupedList>
            <div className="min-h-16 animate-pulse px-4 py-5 text-sm text-gray-400">
              장부를 불러오고 있어요
            </div>
          </GroupedList>
        ) : error ? (
          <ScreenState
            type="error"
            title="장부를 불러오지 못했어요"
            description={error.message}
          />
        ) : books?.length ? (
          <GroupedList>
            {books.map((book) => (
              <EntryRow
                key={book.id}
                href={`/ledger/books/${encodeURIComponent(book.id)}?returnTo=${encodeURIComponent(safeReturn)}`}
                icon={BookOpen}
                title={
                  <span className="line-clamp-2 whitespace-normal break-words">
                    {book.name}
                  </span>
                }
                description={[
                  book.visibility === "shared" ? "공용" : "개인",
                  book.isDefault ? "기본" : null,
                  book.archivedAt ? "보관됨 · 읽기 전용" : "사용 중",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </GroupedList>
        ) : (
          <ScreenState
            type="empty"
            title="장부가 없어요"
            description="새 장부를 만들어 기록을 나눠 보세요."
          />
        )}
      </ScreenSection>

      <Link
        href={safeReturn}
        className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-primary"
      >
        관리 마치기
      </Link>
    </div>
  );
}
