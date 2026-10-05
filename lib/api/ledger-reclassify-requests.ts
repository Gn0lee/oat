import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { createUserNotification } from "@/lib/api/notifications";
import type {
  CreateRecordChangeRequestInput,
  ResolveRecordChangeRequestInput,
} from "@/schemas/record-change-request";
import { ledgerReclassifyProposedChangesSchema } from "@/schemas/record-change-request";
import type { Database, RecordChangeRequest } from "@/types";
import { notifyRecordChangeRequestResult } from "./record-change-request-notifications";

interface DatabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

// DB 함수가 message로 올리는 코드 → HTTP 계약 (#437)
const RECLASSIFY_ERRORS: Record<string, { message: string; status: number }> = {
  AUTH_UNAUTHORIZED: { message: "로그인이 필요합니다.", status: 401 },
  VALIDATION_ERROR: { message: "유효하지 않은 요청입니다.", status: 400 },
  REQUEST_SELF_TARGET: {
    message: "본인 기록은 직접 장부를 바꿀 수 있습니다.",
    status: 400,
  },
  RECLASSIFY_DESTINATION_INVALID: {
    message: "현재 장부가 아닌 다른 공용 장부를 선택해주세요.",
    status: 400,
  },
  REQUEST_FORBIDDEN: {
    message: "기록 작성자만 요청을 처리할 수 있습니다.",
    status: 403,
  },
  REQUEST_TARGET_NOT_FOUND: {
    message: "요청 대상 기록을 찾을 수 없습니다.",
    status: 404,
  },
  REQUEST_NOT_FOUND: {
    message: "변경 요청을 찾을 수 없습니다.",
    status: 404,
  },
  BOOK_UNAVAILABLE: { message: "장부를 사용할 수 없습니다.", status: 404 },
  BOOK_ARCHIVED: {
    message: "보관된 장부로는 옮기거나 옮겨올 수 없습니다.",
    status: 409,
  },
  ENTRY_CHANGED: {
    message: "기록이 바뀌었습니다. 새 내용을 확인한 뒤 다시 요청해주세요.",
    status: 409,
  },
  REQUEST_ALREADY_PENDING: {
    message: "이미 대기 중인 변경 요청이 있습니다.",
    status: 409,
  },
  REQUEST_NOT_PENDING: {
    message: "이미 처리된 요청입니다.",
    status: 409,
  },
};

export function throwLedgerReclassifyError(error: DatabaseError): never {
  const source = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ");
  const code = Object.keys(RECLASSIFY_ERRORS).find((known) =>
    source.includes(known),
  );
  if (code) {
    const { message, status } = RECLASSIFY_ERRORS[code];
    throw new APIError(code, message, status);
  }
  throw new APIError(
    "RECLASSIFY_REQUEST_FAILED",
    "장부 이동 요청 처리에 실패했습니다.",
    500,
  );
}

export async function createLedgerReclassifyRequest(
  supabase: SupabaseClient<Database>,
  input: CreateRecordChangeRequestInput,
): Promise<RecordChangeRequest> {
  const { bookId } = ledgerReclassifyProposedChangesSchema.parse(
    input.proposedChanges,
  );
  const { data, error } = await supabase.rpc(
    "create_ledger_reclassify_request",
    {
      p_entry_id: input.targetId,
      p_book_id: bookId,
      p_expected_entry_updated_at: input.expectedEntryUpdatedAt ?? "",
      p_message: input.message ?? null,
    },
  );
  if (error || !data) throwLedgerReclassifyError(error ?? {});

  await createUserNotification({
    recipientId: data.target_owner_id,
    householdId: data.household_id,
    type: "ledger_record_change_request",
    title: "장부 이동 요청이 도착했습니다",
    body: data.message ?? null,
    link: {
      kind: "record_change_request_detail",
      params: { requestId: data.id },
    },
    source: { type: "record_change_request", id: data.id },
    dedupeKey: `record_change_request_created:${data.id}`,
  });

  return data;
}

export async function resolveLedgerReclassifyRequest(
  supabase: SupabaseClient<Database>,
  id: string,
  input: ResolveRecordChangeRequestInput,
): Promise<RecordChangeRequest> {
  const { data, error } = await supabase.rpc(
    "resolve_ledger_reclassify_request",
    {
      p_request_id: id,
      p_decision: input.decision,
      p_response_message: input.responseMessage ?? null,
    },
  );
  if (error || !data) throwLedgerReclassifyError(error ?? {});

  await notifyRecordChangeRequestResult(data);

  if (data.status === "expired") {
    throw new APIError(
      "REQUEST_EXPIRED",
      "기록이나 장부가 바뀌어 요청이 만료되었습니다. 새 요청이 필요합니다.",
      409,
    );
  }

  return data;
}
