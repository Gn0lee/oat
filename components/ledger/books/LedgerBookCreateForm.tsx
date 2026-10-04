"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLedgerBookActions } from "@/hooks/use-ledger-books";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { safeLedgerReturnTo } from "@/lib/ledger-books/navigation";
import type { LedgerBookVisibility } from "@/types/ledger-book";

export function LedgerBookCreateForm({
  returnTo,
}: {
  returnTo?: string | null;
}) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<LedgerBookVisibility>("shared");
  const router = useRouter();
  const { role, userId, householdId } = useLedgerIdentity();
  const { create } = useLedgerBookActions();
  const canCreate = Boolean(userId && householdId);
  const safeReturn = safeLedgerReturnTo(returnTo, "/ledger/books");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const book = await create.mutateAsync({ name: name.trim(), visibility });
      router.replace(
        `/ledger/books/${encodeURIComponent(book.id)}?returnTo=${encodeURIComponent(safeReturn)}`,
      );
    } catch {
      // The mutation error is rendered in the form below.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="book-name"
          className="text-sm font-medium text-gray-700"
        >
          장부 이름 *
        </label>
        <Input
          id="book-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="예: 여행 준비"
          className="min-h-12"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">
          공개 범위 *
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex min-h-[72px] cursor-pointer items-start gap-3 rounded-lg border p-4 ${visibility === "shared" ? "border-primary bg-primary/5" : "border-gray-200"}`}
          >
            <input
              type="radio"
              name="visibility"
              value="shared"
              checked={visibility === "shared"}
              onChange={() => setVisibility("shared")}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block font-medium text-gray-900">공용 장부</span>
              <span className="mt-1 block text-sm text-gray-500">
                가구 구성원이 함께 볼 수 있어요
              </span>
            </span>
          </label>
          <label
            className={`flex min-h-[72px] cursor-pointer items-start gap-3 rounded-lg border p-4 ${visibility === "personal" ? "border-primary bg-primary/5" : "border-gray-200"}`}
          >
            <input
              type="radio"
              name="visibility"
              value="personal"
              checked={visibility === "personal"}
              onChange={() => setVisibility("personal")}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block font-medium text-gray-900">개인 장부</span>
              <span className="mt-1 block text-sm text-gray-500">
                나만 볼 수 있어요
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {!canCreate && (
        <p role="alert" className="text-sm text-destructive">
          가구 정보를 확인한 뒤 다시 시도해 주세요.
        </p>
      )}
      {create.error && (
        <p role="alert" className="text-sm text-destructive">
          {create.error.message}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button asChild type="button" variant="outline" className="min-h-11">
          <Link href={safeReturn}>취소</Link>
        </Button>
        <Button
          type="submit"
          disabled={!canCreate || !name.trim() || create.isPending}
          className="min-h-11"
        >
          {create.isPending ? "만드는 중..." : "장부 만들기"}
        </Button>
      </div>
      {role === "member" && (
        <p className="text-xs text-gray-500">
          공용 장부는 구성원 누구나 만들 수 있어요.
        </p>
      )}
    </form>
  );
}
