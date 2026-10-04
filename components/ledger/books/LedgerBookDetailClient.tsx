"use client";

import { Archive, ArrowLeft, RotateCcw, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScreenState } from "@/components/layout/screen/ScreenState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLedgerBook, useLedgerBookActions } from "@/hooks/use-ledger-books";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { ApiQueryError } from "@/lib/api/client";
import { safeLedgerReturnTo } from "@/lib/ledger-books/navigation";

interface LedgerBookDetailClientProps {
  id: string;
  returnTo?: string | null;
}

export function LedgerBookDetailClient({
  id,
  returnTo,
}: LedgerBookDetailClientProps) {
  const {
    data: book,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useLedgerBook(id);
  const { userId, householdId, role } = useLedgerIdentity();
  const actions = useLedgerBookActions();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const safeReturn = safeLedgerReturnTo(returnTo, "/ledger/books");

  if (userId && !householdId) {
    return (
      <ScreenState
        type="empty"
        title="가구 설정이 필요해요"
        description="가구에 가입하거나 설정한 뒤 장부를 확인할 수 있어요."
        action={
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/settings/household">가구 설정으로 이동</Link>
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse py-12 text-center text-sm text-gray-400">
        장부 정보를 불러오고 있어요
      </div>
    );
  }
  if (error || !book) {
    const unavailable =
      error instanceof ApiQueryError && error.isCode("BOOK_UNAVAILABLE");
    return (
      <ScreenState
        type="error"
        title={unavailable ? "장부를 볼 수 없어요" : "장부를 불러올 수 없어요"}
        description={
          unavailable
            ? "장부가 없거나 접근할 수 없어요."
            : "잠시 후 다시 시도해 주세요."
        }
        action={
          unavailable ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/ledger/records">전체 기록으로 이동</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="min-h-11"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? "불러오는 중..." : "다시 시도"}
            </Button>
          )
        }
      />
    );
  }

  const bookId = book.id;
  const archived = Boolean(book.archivedAt);
  const isCreator = Boolean(userId && book.createdBy === userId);
  const canManage = book.visibility === "shared" ? true : isCreator;
  const canRename =
    canManage &&
    !archived &&
    !(
      book.visibility === "personal" &&
      book.name.toLocaleLowerCase() === "개인 생활비".toLocaleLowerCase()
    );
  const canArchive = canManage && !archived && !book.isDefault;
  const canReactivate = canManage && archived;
  const canDefault =
    role === "owner" &&
    book.visibility === "shared" &&
    !archived &&
    !book.isDefault;
  const canDelete =
    (isCreator || (book.visibility === "shared" && role === "owner")) &&
    !archived &&
    !book.isDefault &&
    !(
      book.visibility === "personal" &&
      book.name.toLocaleLowerCase() === "개인 생활비".toLocaleLowerCase()
    );
  const legacyProtected =
    book.visibility === "personal" &&
    book.name.toLocaleLowerCase() === "개인 생활비".toLocaleLowerCase();
  const isBusy =
    actions.rename.isPending ||
    actions.archive.isPending ||
    actions.reactivate.isPending ||
    actions.makeDefault.isPending ||
    actions.remove.isPending;

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "장부를 변경하지 못했어요.",
      );
    }
  }

  async function deleteBook() {
    setActionError(null);
    try {
      await actions.remove.mutateAsync({ id: bookId });
      setDeleteOpen(false);
      router.replace(safeReturn);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "장부를 삭제하지 못했어요.",
      );
    }
  }

  return (
    <Dialog
      open={deleteOpen}
      onOpenChange={(open) => {
        if (!isBusy) setDeleteOpen(open);
      }}
    >
      <div className="space-y-6">
        <Link
          href={safeReturn}
          className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> 관리 마치기
        </Link>

        <section className="space-y-5" aria-labelledby="book-detail-title">
          <div>
            <p className="mb-2 text-sm text-gray-500">
              {book.visibility === "shared" ? "공용 장부" : "개인 장부"}
              {book.isDefault ? " · 기본" : ""}
              {archived ? " · 보관됨 · 읽기 전용" : " · 사용 중"}
            </p>
            <h1
              id="book-detail-title"
              className="break-words text-2xl font-bold text-gray-900"
            >
              {book.name}
            </h1>
          </div>

          {legacyProtected && (
            <p className="rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-600">
              현재 이 장부는 이름을 바꾸거나 삭제할 수 없어요.
            </p>
          )}

          {canRename && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const nextName = (name ?? book.name).trim();
                if (nextName && nextName !== book.name) {
                  void run(async () => {
                    await actions.rename.mutateAsync({
                      id: book.id,
                      name: nextName,
                    });
                    setName(null);
                  });
                }
              }}
            >
              <label
                htmlFor="book-rename"
                className="text-sm font-medium text-gray-700"
              >
                이름 바꾸기
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="book-rename"
                  className="min-h-11"
                  value={name ?? book.name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="min-h-11"
                  disabled={
                    isBusy ||
                    !(name ?? book.name).trim() ||
                    (name ?? book.name).trim() === book.name
                  }
                >
                  저장
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2 border-t border-gray-100 pt-4">
            {canDefault && (
              <Button
                variant="outline"
                className="min-h-11 w-full justify-start"
                disabled={isBusy}
                onClick={() =>
                  void run(() =>
                    actions.makeDefault.mutateAsync({ id: book.id }),
                  )
                }
              >
                <Star className="mr-2 size-4" /> 기본 장부로 설정
              </Button>
            )}
            {canArchive && (
              <Button
                variant="outline"
                className="min-h-11 w-full justify-start"
                disabled={isBusy}
                onClick={() =>
                  void run(() => actions.archive.mutateAsync({ id: book.id }))
                }
              >
                <Archive className="mr-2 size-4" /> 보관하기
              </Button>
            )}
            {book.isDefault && !archived && (
              <p className="py-2 text-sm text-gray-500">
                다른 공용 장부를 기본으로 바꾼 뒤 보관할 수 있어요.
              </p>
            )}
            {canReactivate && (
              <Button
                variant="outline"
                className="min-h-11 w-full justify-start"
                disabled={isBusy}
                onClick={() =>
                  void run(() =>
                    actions.reactivate.mutateAsync({ id: book.id }),
                  )
                }
              >
                <RotateCcw className="mr-2 size-4" /> 다시 사용하기
              </Button>
            )}
            {canDelete && (
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="min-h-11 w-full justify-start text-destructive hover:text-destructive"
                  disabled={isBusy}
                >
                  <Trash2 className="mr-2 size-4" /> 삭제하기
                </Button>
              </DialogTrigger>
            )}
            {!deleteOpen && actionError && (
              <p role="alert" className="pt-2 text-sm text-destructive">
                {actionError}
              </p>
            )}
          </div>
        </section>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>‘{book.name}’ 장부를 삭제할까요?</DialogTitle>
            <DialogDescription>
              기록이 없는 장부만 삭제할 수 있어요. 삭제한 장부는 복구할 수
              없어요.
            </DialogDescription>
          </DialogHeader>
          {deleteOpen && actionError && (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={isBusy}
              onClick={() => setDeleteOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={isBusy}
              onClick={() => void deleteBook()}
            >
              {actions.remove.isPending ? "삭제 중..." : "삭제하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </div>
    </Dialog>
  );
}
