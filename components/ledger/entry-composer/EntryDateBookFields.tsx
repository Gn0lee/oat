"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { composerFieldClassName } from "@/components/composer/field-styles";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import type { LedgerComposerValues } from "@/schemas/ledger-composer";

export function EntryDateBookFields({ index }: { index: number }) {
  const form = useFormContext<LedgerComposerValues>();
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const { data: books = [] } = useLedgerBooks();
  const book = books.find((candidate) => candidate.id === item?.bookId);
  const rowNumber = index + 1;
  if (!item) return null;

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
        <Select
          value={item.bookId}
          onValueChange={(value) =>
            form.setValue(`items.${index}.bookId`, value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger
            id={`entry-book-${rowNumber}`}
            className={composerFieldClassName}
            aria-label={`장부 ${rowNumber}`}
          >
            <SelectValue placeholder="장부 선택" />
          </SelectTrigger>
          <SelectContent>
            {book?.archivedAt && (
              <SelectItem disabled value={book.id} className="min-h-11">
                {book.name} (보관됨)
              </SelectItem>
            )}
            {books
              .filter((candidate) => !candidate.archivedAt)
              .map((candidate) => (
                <SelectItem
                  key={candidate.id}
                  className="min-h-11"
                  value={candidate.id}
                >
                  {candidate.name} ·{" "}
                  {candidate.visibility === "shared" ? "공용" : "개인"}
                  {candidate.isDefault ? " · 기본" : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
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
