"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TaskFormSurface } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { useCreateRecordChangeRequest } from "@/hooks/use-record-change-requests";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { queries } from "@/lib/queries/keys";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

interface LedgerEntryReclassifyRequestDialogProps {
  entry: LedgerEntryWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 기록·장부 상태가 바뀐 오류는 최신 기록과 장부 목록을 다시 읽는다.
const STALE_CODES = ["ENTRY_CHANGED", "BOOK_ARCHIVED", "BOOK_UNAVAILABLE"];

export function LedgerEntryReclassifyRequestDialog({
  entry,
  open,
  onOpenChange,
}: LedgerEntryReclassifyRequestDialogProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateRecordChangeRequest();
  const { data: books = [], isLoading } = useLedgerBooks();
  const [bookId, setBookId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setBookId(null);
    setMessage("");
  }, [open]);

  if (!entry) return null;

  const candidates = books.filter(
    (book) =>
      book.visibility === "shared" &&
      !book.archivedAt &&
      book.id !== entry.bookId,
  );

  const handleSubmit = async () => {
    if (!bookId) return;
    try {
      await createMutation.mutateAsync({
        targetType: "ledger_entry",
        targetId: entry.id,
        requestType: "reclassify",
        proposedChanges: { bookId },
        expectedEntryUpdatedAt: entry.updatedAt,
        message: message.trim() || undefined,
      });
      toast.success("작성자에게 장부 이동을 요청했습니다.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiQueryError && STALE_CODES.includes(error.code)) {
        queryClient.invalidateQueries({
          queryKey: queries.ledgerEntries.detail(entry.id).queryKey,
        });
        queryClient.invalidateQueries({ queryKey: ["ledgerBooks"] });
      }
      toast.error(
        error instanceof Error ? error.message : "요청 생성에 실패했습니다.",
      );
    }
  };

  return (
    <TaskFormSurface
      open={open}
      onOpenChange={onOpenChange}
      title="장부 이동 요청"
      description="작성자가 승인하면 이 기록이 선택한 공용 장부로 옮겨집니다. 금액과 돈 위치는 그대로입니다."
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">
              {entry.title ?? entry.categoryName ?? "미분류"}
            </p>
            <p className="mt-0.5 text-gray-500">
              현재 장부 · {entry.book?.name ?? "알 수 없음"}
            </p>
          </div>
          <span className="shrink-0 font-semibold text-gray-900">
            {formatCurrency(entry.amount)}
          </span>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-gray-700">
            옮길 공용 장부
          </legend>
          {isLoading ? (
            <p className="text-sm text-gray-500">장부를 불러오는 중입니다.</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-gray-500">
              옮길 수 있는 다른 공용 장부가 없습니다.
            </p>
          ) : (
            <div>
              {candidates.map((book) => {
                const isSelected = book.id === bookId;
                return (
                  <label
                    key={book.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 border-b border-gray-100 px-1 py-3 text-base text-gray-900 last:border-b-0",
                      isSelected && "font-semibold text-primary",
                    )}
                  >
                    <input
                      type="radio"
                      name="reclassify-book"
                      value={book.id}
                      checked={isSelected}
                      onChange={() => setBookId(book.id)}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 truncate">{book.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="reclassify-request-message">
            작성자에게 남길 말 (선택)
          </Label>
          <Textarea
            id="reclassify-request-message"
            value={message}
            rows={3}
            maxLength={1000}
            className="resize-none"
            placeholder="왜 옮기면 좋을지 남겨주세요."
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            className="min-h-11"
            onClick={handleSubmit}
            disabled={!bookId || createMutation.isPending}
          >
            {createMutation.isPending ? "요청 중..." : "요청 보내기"}
          </Button>
        </div>
      </div>
    </TaskFormSurface>
  );
}
