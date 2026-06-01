import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import { createUserNotification } from "@/lib/api/notifications";
import type {
  CreateRecordChangeRequestInput,
  ListRecordChangeRequestsInput,
  ResolveRecordChangeRequestInput,
} from "@/schemas/record-change-request";
import type { Database, Json, RecordChangeRequest } from "@/types";

export interface ValidatedRecordChangeRequestTarget {
  householdId: string;
  targetOwnerId: string;
  targetSnapshot: Record<string, unknown>;
}

export interface BuildRecordChangeRequestInsertInput
  extends CreateRecordChangeRequestInput {
  requesterId: string;
  validatedTarget: ValidatedRecordChangeRequestTarget;
}

interface LedgerEntryTargetRow {
  id: string;
  household_id: string;
  owner_id: string;
  type: string;
  amount: number | string;
  title: string | null;
  category_id: string | null;
  is_shared: boolean;
  memo: string | null;
  transacted_at: string;
  categories: { name: string | null; icon?: string | null } | null;
  profiles: { name: string | null } | null;
}

interface StockTransactionTargetRow {
  id: string;
  household_id: string;
  owner_id: string;
  ticker: string;
  type: string;
  quantity: number | string;
  price: number | string;
  transacted_at: string;
  account_id: string | null;
  profiles: { name: string | null } | null;
}

type RequestActionRow = Pick<
  RecordChangeRequest,
  "id" | "requester_id" | "target_owner_id" | "status"
>;

function toJsonObject(value: Record<string, unknown>): Json {
  return value as unknown as Json;
}

export function buildRecordChangeRequestInsert(
  input: BuildRecordChangeRequestInsertInput,
) {
  return {
    household_id: input.validatedTarget.householdId,
    requester_id: input.requesterId,
    target_owner_id: input.validatedTarget.targetOwnerId,
    target_type: input.targetType,
    target_id: input.targetId,
    request_type: input.requestType,
    status: "pending" as const,
    message: input.message ?? null,
    proposed_changes: toJsonObject(input.proposedChanges),
    target_snapshot: toJsonObject(input.validatedTarget.targetSnapshot),
  };
}

export function getRecordChangeRequestListQuery(
  userId: string,
  options: ListRecordChangeRequestsInput,
) {
  return {
    ownerColumn: options.box === "sent" ? "requester_id" : "target_owner_id",
    ownerId: userId,
    status: options.status,
  };
}

export async function validateRecordChangeRequestTarget(
  supabase: SupabaseClient<Database>,
  requesterId: string,
  input: Pick<CreateRecordChangeRequestInput, "targetType" | "targetId">,
): Promise<ValidatedRecordChangeRequestTarget> {
  if (input.targetType === "ledger_entry") {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select(`
        id,
        household_id,
        owner_id,
        type,
        amount,
        title,
        category_id,
        is_shared,
        memo,
        transacted_at,
        categories(name, icon),
        profiles!ledger_entries_owner_id_fkey(name)
      `)
      .eq("id", input.targetId)
      .single();

    if (error || !data) {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_NOT_FOUND",
        "요청 대상 기록을 찾을 수 없습니다.",
        404,
      );
    }

    const row = data as unknown as LedgerEntryTargetRow;

    if (row.owner_id === requesterId) {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_SELF_TARGET",
        "본인 기록에는 변경 요청을 만들 수 없습니다.",
        400,
      );
    }

    if (!row.is_shared) {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_INVALID",
        "개인 가계부 기록은 요청 대상이 될 수 없습니다.",
        400,
      );
    }

    return {
      householdId: row.household_id,
      targetOwnerId: row.owner_id,
      targetSnapshot: {
        targetType: "ledger_entry",
        ownerName: row.profiles?.name ?? "알 수 없음",
        transactedAt: row.transacted_at,
        title: row.title,
        amount: Number(row.amount),
        type: row.type,
        categoryName: row.categories?.name ?? null,
        isShared: row.is_shared,
      },
    };
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      household_id,
      owner_id,
      ticker,
      type,
      quantity,
      price,
      transacted_at,
      account_id,
      profiles!transactions_owner_id_fkey(name)
    `)
    .eq("id", input.targetId)
    .single();

  if (error || !data) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_TARGET_NOT_FOUND",
      "요청 대상 기록을 찾을 수 없습니다.",
      404,
    );
  }

  const row = data as unknown as StockTransactionTargetRow;

  if (row.owner_id === requesterId) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_SELF_TARGET",
      "본인 기록에는 변경 요청을 만들 수 없습니다.",
      400,
    );
  }

  return {
    householdId: row.household_id,
    targetOwnerId: row.owner_id,
    targetSnapshot: {
      targetType: "stock_transaction",
      ownerName: row.profiles?.name ?? "알 수 없음",
      transactedAt: row.transacted_at,
      ticker: row.ticker,
      type: row.type,
      quantity: Number(row.quantity),
      price: Number(row.price),
      accountId: row.account_id,
    },
  };
}

export async function createRecordChangeRequest(
  supabase: SupabaseClient<Database>,
  requesterId: string,
  input: CreateRecordChangeRequestInput,
): Promise<RecordChangeRequest> {
  const validatedTarget = await validateRecordChangeRequestTarget(
    supabase,
    requesterId,
    input,
  );
  const payload = buildRecordChangeRequestInsert({
    ...input,
    requesterId,
    validatedTarget,
  });

  const { data, error } = await supabase
    .from("record_change_requests")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_ALREADY_PENDING",
        "이미 대기 중인 변경 요청이 있습니다.",
        409,
      );
    }
    throw error;
  }

  await createUserNotification({
    recipientId: validatedTarget.targetOwnerId,
    householdId: validatedTarget.householdId,
    type:
      input.targetType === "ledger_entry"
        ? "ledger_record_change_request"
        : "stock_transaction_change_request",
    title: "수정/삭제 요청이 도착했습니다",
    body: input.message ?? null,
    link: {
      kind: "record_change_request_detail",
      params: { requestId: data.id },
    },
    source: { type: "record_change_request", id: data.id },
    dedupeKey: `record_change_request_created:${data.id}`,
  });

  return data;
}

export async function getRecordChangeRequestById(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
): Promise<RecordChangeRequest> {
  const { data, error } = await supabase
    .from("record_change_requests")
    .select("*")
    .eq("id", id)
    .or(`requester_id.eq.${userId},target_owner_id.eq.${userId}`)
    .single();

  if (error || !data) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_NOT_FOUND",
      "변경 요청을 찾을 수 없습니다.",
      404,
    );
  }

  return data;
}

export async function listRecordChangeRequests(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: ListRecordChangeRequestsInput,
): Promise<RecordChangeRequest[]> {
  const listQuery = getRecordChangeRequestListQuery(userId, options);
  let query = supabase
    .from("record_change_requests")
    .select("*")
    .eq(listQuery.ownerColumn, listQuery.ownerId)
    .order("created_at", { ascending: false });

  if (listQuery.status) {
    query = query.eq("status", listQuery.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function assertCanCancelRecordChangeRequest(
  request: RequestActionRow,
  userId: string,
) {
  if (request.status !== "pending") {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_NOT_PENDING",
      "대기 중인 요청만 취소할 수 있습니다.",
      400,
    );
  }
  if (request.requester_id !== userId) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_FORBIDDEN",
      "요청자만 요청을 취소할 수 있습니다.",
      403,
    );
  }
}

export function assertCanResolveRecordChangeRequest(
  request: RequestActionRow,
  userId: string,
) {
  if (request.status !== "pending") {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_NOT_PENDING",
      "대기 중인 요청만 처리할 수 있습니다.",
      400,
    );
  }
  if (request.target_owner_id !== userId) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_FORBIDDEN",
      "대상 기록 소유자만 요청을 처리할 수 있습니다.",
      403,
    );
  }
}

async function applyApprovedRecordChangeRequest(): Promise<void> {
  throw new APIError(
    "RECORD_CHANGE_REQUEST_APPLY_NOT_IMPLEMENTED",
    "요청 승인 반영은 대상 도메인 구현에서 처리해야 합니다.",
    501,
  );
}

export async function cancelRecordChangeRequest(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
): Promise<RecordChangeRequest> {
  const request = await getRecordChangeRequestById(supabase, userId, id);
  assertCanCancelRecordChangeRequest(request, userId);

  const { data, error } = await supabase
    .from("record_change_requests")
    .update({
      status: "cancelled",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function resolveRecordChangeRequest(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  input: ResolveRecordChangeRequestInput,
): Promise<RecordChangeRequest> {
  const request = await getRecordChangeRequestById(supabase, userId, id);
  assertCanResolveRecordChangeRequest(request, userId);

  if (input.decision === "approved") {
    await applyApprovedRecordChangeRequest();
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("record_change_requests")
    .update({
      status: input.decision,
      response_message: input.responseMessage ?? null,
      resolved_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
