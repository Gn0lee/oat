import { z } from "zod";
import { APIError } from "@/lib/api/error";

// Keyset position of the last row on a search page (transacted_at, created_at, id DESC).
export interface LedgerSearchCursorPosition {
  transactedAt: string;
  createdAt: string;
  id: string;
}

// A cursor only continues the search it was issued for.
export interface LedgerSearchCursorScope {
  query: string;
  bookId?: string;
}

const payloadSchema = z.object({
  v: z.literal(1),
  t: z.iso.datetime({ offset: true }),
  c: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  q: z.string(),
  b: z.uuid().nullable(),
});

function invalidCursor(): never {
  throw new APIError(
    "LEDGER_SEARCH_CURSOR_INVALID",
    "검색 결과 위치가 올바르지 않습니다. 처음부터 다시 검색해주세요.",
    400,
  );
}

export function encodeLedgerSearchCursor(
  position: LedgerSearchCursorPosition,
  scope: LedgerSearchCursorScope,
): string {
  const payload: z.infer<typeof payloadSchema> = {
    v: 1,
    t: position.transactedAt,
    c: position.createdAt,
    id: position.id,
    q: scope.query,
    b: scope.bookId ?? null,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeLedgerSearchCursor(
  cursor: string,
  scope: LedgerSearchCursorScope,
): LedgerSearchCursorPosition {
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) invalidCursor();
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    invalidCursor();
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) invalidCursor();
  const payload = parsed.data;
  if (payload.q !== scope.query || payload.b !== (scope.bookId ?? null))
    invalidCursor();
  return { transactedAt: payload.t, createdAt: payload.c, id: payload.id };
}
