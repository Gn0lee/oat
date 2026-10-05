import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { ledgerBookIdSchema } from "@/schemas/ledger-book";
import type { Database } from "@/types";
import type { LedgerBook } from "@/types/ledger-book";

type LedgerBookRow = Database["public"]["Tables"]["ledger_books"]["Row"];
type BookAction = "rename" | "archive" | "reactivate" | "delete";

function toLedgerBook(row: LedgerBookRow): LedgerBook {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility as LedgerBook["visibility"],
    createdBy: row.created_by,
    isDefault: row.is_default,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function throwQueryError(): never {
  throw new APIError("BOOK_QUERY_FAILED", "장부 조회에 실패했습니다.", 500);
}

function databaseErrorCode(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}) {
  const source = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ");
  const knownCodes = [
    "BOOK_UNAVAILABLE",
    "BOOK_ACTION_FORBIDDEN",
    "BOOK_ARCHIVED",
    "BOOK_DEFAULT_REQUIRED",
    "BOOK_NOT_EMPTY",
    "BOOK_NAME_CONFLICT",
  ];
  return knownCodes.find((code) => source.includes(code));
}

export function throwLedgerBookMutationError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}): never {
  const code = databaseErrorCode(error);
  if (code === "BOOK_UNAVAILABLE") {
    throw new APIError(code, "장부를 사용할 수 없습니다.", 404);
  }
  if (code === "BOOK_ACTION_FORBIDDEN") {
    throw new APIError(code, "이 장부를 변경할 권한이 없습니다.", 403);
  }
  if (code === "BOOK_ARCHIVED") {
    throw new APIError(code, "보관된 장부는 먼저 재활성화해야 합니다.", 409);
  }
  if (code === "BOOK_DEFAULT_REQUIRED") {
    throw new APIError(code, "기본 장부를 변경한 뒤 다시 시도해주세요.", 409);
  }
  if (code === "BOOK_NOT_EMPTY") {
    throw new APIError(code, "거래가 있는 장부는 삭제할 수 없습니다.", 409);
  }
  const source = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ");
  const isBookNameConstraint =
    source.includes("ledger_books_shared_name_key") ||
    source.includes("ledger_books_personal_name_key");
  if (
    code === "BOOK_NAME_CONFLICT" ||
    (error.code === "23505" && isBookNameConstraint)
  ) {
    throw new APIError(
      "BOOK_NAME_CONFLICT",
      "이미 사용 중인 장부 이름입니다.",
      409,
    );
  }
  if (error.code === "22023" || source.includes("VALIDATION_ERROR")) {
    throw new APIError("VALIDATION_ERROR", "유효하지 않은 요청입니다.", 400);
  }
  if (error.code === "42501") {
    throw new APIError(
      "BOOK_ACTION_FORBIDDEN",
      "이 장부를 변경할 권한이 없습니다.",
      403,
    );
  }

  throw new APIError("BOOK_MUTATION_FAILED", "장부 변경에 실패했습니다.", 500);
}

export function validateLedgerBookId(id: string): string {
  if (!ledgerBookIdSchema.safeParse(id).success) {
    throw new APIError("VALIDATION_ERROR", "장부 ID가 올바르지 않습니다.", 400);
  }
  return id;
}

export async function getLedgerBooks(
  supabase: SupabaseClient<Database>,
  householdId: string,
): Promise<LedgerBook[]> {
  const { data, error } = await supabase
    .from("ledger_books")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) throwQueryError();
  return (data ?? []).map(toLedgerBook);
}

export async function getLedgerBook(
  supabase: SupabaseClient<Database>,
  householdId: string,
  id: string,
): Promise<LedgerBook> {
  validateLedgerBookId(id);
  const { data, error } = await supabase
    .from("ledger_books")
    .select("*")
    .eq("household_id", householdId)
    .eq("id", id)
    .maybeSingle();

  if (error) throwQueryError();
  if (!data) {
    throw new APIError("BOOK_UNAVAILABLE", "장부를 사용할 수 없습니다.", 404);
  }
  return toLedgerBook(data);
}

export interface CreateLedgerBookParams {
  householdId: string;
  userId: string;
  name: string;
  visibility: LedgerBook["visibility"];
}

export async function createLedgerBook(
  supabase: SupabaseClient<Database>,
  params: CreateLedgerBookParams,
): Promise<LedgerBook> {
  const { data, error } = await supabase
    .from("ledger_books")
    .insert({
      household_id: params.householdId,
      created_by: params.userId,
      name: params.name,
      visibility: params.visibility,
      is_default: false,
    })
    .select("*")
    .single();

  if (error) throwLedgerBookMutationError(error);
  return toLedgerBook(data);
}

async function getVisibleBookForMutation(
  supabase: SupabaseClient<Database>,
  householdId: string,
  id: string,
): Promise<LedgerBook> {
  return getLedgerBook(supabase, householdId, id);
}

async function mutateLedgerBook(
  supabase: SupabaseClient<Database>,
  householdId: string,
  id: string,
  action: BookAction,
  name: string | null = null,
): Promise<LedgerBook> {
  await getVisibleBookForMutation(supabase, householdId, id);
  const { data, error } = await supabase.rpc("mutate_ledger_book", {
    p_book_id: id,
    p_action: action,
    p_name: name,
  });

  if (error) throwLedgerBookMutationError(error);
  return toLedgerBook(data);
}

export function renameLedgerBook(
  supabase: SupabaseClient<Database>,
  householdId: string,
  id: string,
  name: string,
): Promise<LedgerBook> {
  return mutateLedgerBook(supabase, householdId, id, "rename", name);
}

export function archiveLedgerBook(
  supabase: SupabaseClient<Database>,
  householdId: string,
  id: string,
): Promise<LedgerBook> {
  return mutateLedgerBook(supabase, householdId, id, "archive");
}

export function reactivateLedgerBook(
  supabase: SupabaseClient<Database>,
  householdId: string,
  id: string,
): Promise<LedgerBook> {
  return mutateLedgerBook(supabase, householdId, id, "reactivate");
}

export async function deleteLedgerBook(
  supabase: SupabaseClient<Database>,
  householdId: string,
  id: string,
): Promise<void> {
  await mutateLedgerBook(supabase, householdId, id, "delete");
}

export async function makeDefaultLedgerBook(
  supabase: SupabaseClient<Database>,
  householdId: string,
  id: string,
): Promise<LedgerBook> {
  const book = await getVisibleBookForMutation(supabase, householdId, id);
  if (book.visibility !== "shared") {
    throw new APIError(
      "BOOK_ACTION_FORBIDDEN",
      "개인 장부는 기본 장부로 지정할 수 없습니다.",
      403,
    );
  }
  const { data, error } = await supabase.rpc("make_default_ledger_book", {
    p_book_id: id,
  });

  if (error) throwLedgerBookMutationError(error);
  return toLedgerBook(data);
}
