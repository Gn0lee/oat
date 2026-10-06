import type {
  LedgerItemFormData,
  TransferItemFormData,
} from "@/lib/api/ledger";
import {
  buildLedgerEntryPayload,
  buildTransferLedgerEntryPayload,
} from "@/lib/api/ledger";
import { formatKst } from "@/lib/date";
import type { LedgerComposerItem } from "@/schemas/ledger-composer";
import { ledgerComposerItemSchema } from "@/schemas/ledger-composer";
import type { CreateLedgerEntryInput } from "@/schemas/ledger-entry";
import type { LedgerBook } from "@/types/ledger-book";

export type ComposerStep =
  | "basics"
  | "classification"
  | "sources"
  | "datesBooks"
  | "review";
export type ComposerType = LedgerComposerItem["type"];

export function createComposerDraft(input: {
  clientId: string;
  bookId: string;
  date: string;
}): LedgerComposerItem {
  return {
    clientId: input.clientId,
    type: "expense",
    bookId: input.bookId,
    amount: "",
    title: "",
    categoryId: "",
    paymentMethodId: undefined,
    accountId: undefined,
    fromValue: "",
    toValue: "",
    transactedAt: input.date,
    memo: "",
  };
}

export function normalizeComposerTypeChange<T extends LedgerComposerItem>(
  item: T,
  type: ComposerType,
): LedgerComposerItem {
  if (item.type === type) return item;
  const keepsBothSources =
    type === "expense" || type === "non_expense_withdrawal";
  return {
    ...item,
    type,
    categoryId: "",
    paymentMethodId: keepsBothSources ? item.paymentMethodId : undefined,
    accountId:
      keepsBothSources || type === "income" ? item.accountId : undefined,
    fromValue: type === "transfer" ? (item.fromValue ?? "") : "",
    toValue: type === "transfer" ? (item.toValue ?? "") : "",
  };
}

export function getMissingComposerStep(
  item: LedgerComposerItem,
): Exclude<ComposerStep, "review"> | null {
  return getComposerStepIssues(item, "basics").length
    ? "basics"
    : getComposerStepIssues(item, "classification").length
      ? "classification"
      : getComposerStepIssues(item, "sources").length
        ? "sources"
        : getComposerStepIssues(item, "datesBooks").length
          ? "datesBooks"
          : null;
}

const STEP_FIELDS: Record<Exclude<ComposerStep, "review">, string[]> = {
  basics: ["title", "amount"],
  classification: ["categoryId"],
  sources: ["accountId", "paymentMethodId", "fromValue", "toValue"],
  datesBooks: ["transactedAt", "bookId"],
};

export function getComposerStepIssues(
  item: LedgerComposerItem,
  step: Exclude<ComposerStep, "review">,
) {
  const result = ledgerComposerItemSchema.safeParse(item);
  return result.success
    ? []
    : result.error.issues.filter((issue) =>
        STEP_FIELDS[step].includes(String(issue.path[0])),
      );
}

function parseLocation(value: string | undefined) {
  if (value?.startsWith("acc:"))
    return { kind: "account" as const, id: value.slice(4) };
  return { kind: "paymentMethod" as const, id: (value ?? "").slice(3) };
}

export function toComposerPayload(
  item: LedgerComposerItem,
  books: LedgerBook[],
  categories: Array<{ id: string; type?: string }>,
): CreateLedgerEntryInput {
  const book = books.find((candidate) => candidate.id === item.bookId);
  if (!book || book.archivedAt) throw new Error("활성 장부를 선택해 주세요.");
  const category = categories.find(
    (candidate) => candidate.id === item.categoryId,
  );
  if (
    item.type !== "transfer" &&
    item.type !== "non_expense_withdrawal" &&
    category?.type &&
    category.type !== item.type
  ) {
    throw new Error("기록 유형에 맞는 카테고리를 선택해 주세요.");
  }
  const base =
    item.type === "transfer"
      ? buildTransferLedgerEntryPayload(item.bookId, {
          amount: item.amount,
          title: item.title,
          from: parseLocation(item.fromValue),
          to: parseLocation(item.toValue),
          transactedAt: item.transactedAt,
          memo: item.memo,
        } satisfies TransferItemFormData)
      : buildLedgerEntryPayload(item.type, item.bookId, {
          amount: item.amount,
          title: item.title,
          categoryId: item.categoryId ?? "",
          paymentMethodId: item.paymentMethodId,
          accountId: item.accountId,
          transactedAt: item.transactedAt,
          memo: item.memo,
        } satisfies LedgerItemFormData);
  const { tags: _legacyTags, ...payload } = base;
  return payload;
}

export function selectComposerReturnHref(input: {
  sourceBookId?: string;
  payloads: Array<Pick<CreateLedgerEntryInput, "bookId" | "transactedAt">>;
}): string {
  const destinationBooks = [
    ...new Set(
      input.payloads
        .map((payload) => payload.bookId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const latestDate = input.payloads
    .map((payload) => formatKst(payload.transactedAt))
    .filter(Boolean)
    .sort()
    .at(-1);
  const query = new URLSearchParams();
  if (
    input.sourceBookId &&
    destinationBooks.length === 1 &&
    destinationBooks[0] !== input.sourceBookId
  ) {
    query.set("book", destinationBooks[0]);
  } else if (input.sourceBookId && destinationBooks.length === 1) {
    query.set("book", input.sourceBookId);
  }
  if (latestDate) query.set("date", latestDate);
  return `/ledger/records${query.size ? `?${query}` : ""}`;
}
