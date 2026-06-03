import type { SupabaseClient } from "@supabase/supabase-js";
import { APIError } from "@/lib/api/error";
import {
  deleteLedgerEntryWithBalanceSync,
  updateLedgerEntryWithBalanceSync,
} from "@/lib/api/ledger";
import { createUserNotification } from "@/lib/api/notifications";
import { deleteTransaction, updateTransaction } from "@/lib/api/transaction";
import type {
  CreateRecordChangeRequestInput,
  ListRecordChangeRequestsInput,
  ResolveRecordChangeRequestInput,
} from "@/schemas/record-change-request";
import {
  ledgerRecordUpdateProposedChangesSchema,
  stockTransactionUpdateProposedChangesSchema,
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
  memo: string | null;
  profiles: { name: string | null } | null;
}

type RequestActionRow = Pick<
  RecordChangeRequest,
  "id" | "requester_id" | "target_owner_id" | "status"
>;

type ApprovableRecordChangeRequest = Pick<
  RecordChangeRequest,
  | "household_id"
  | "message"
  | "target_owner_id"
  | "target_type"
  | "target_id"
  | "request_type"
  | "proposed_changes"
  | "target_snapshot"
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
  input: Pick<
    CreateRecordChangeRequestInput,
    "targetType" | "targetId" | "requestType"
  >,
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

    if (row.type === "transfer" && input.requestType === "update") {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_TARGET_INVALID",
        "이체 기록은 삭제 요청만 보낼 수 있습니다.",
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
      memo,
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
      memo: row.memo,
    },
  };
}

export function validateLedgerRecordChangeRequestInput(
  input: CreateRecordChangeRequestInput,
) {
  if (input.targetType !== "ledger_entry" || input.requestType !== "update") {
    return;
  }

  const result = ledgerRecordUpdateProposedChangesSchema.safeParse(
    input.proposedChanges,
  );

  if (!result.success) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_PROPOSED_CHANGES_INVALID",
      result.error.issues[0]?.message ?? "유효하지 않은 수정 요청입니다.",
      400,
    );
  }
}

export function validateStockTransactionRecordChangeRequestInput(
  input: CreateRecordChangeRequestInput,
) {
  if (input.targetType !== "stock_transaction") {
    return;
  }

  if (input.requestType === "delete") {
    if (!input.message?.trim()) {
      throw new APIError(
        "RECORD_CHANGE_REQUEST_MESSAGE_REQUIRED",
        "삭제 요청 사유를 입력해주세요.",
        400,
      );
    }
    return;
  }

  const result = stockTransactionUpdateProposedChangesSchema.safeParse(
    input.proposedChanges,
  );

  if (!result.success) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_PROPOSED_CHANGES_INVALID",
      result.error.issues[0]?.message ?? "유효하지 않은 수정 요청입니다.",
      400,
    );
  }
}

async function buildStockTransactionRequestNotificationTitle(
  supabase: SupabaseClient<Database>,
  requesterId: string,
  requestType: "update" | "delete",
  targetSnapshot: Record<string, unknown>,
) {
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", requesterId)
    .single();
  const requesterName = data?.name ?? "가구 구성원";
  const ticker =
    typeof targetSnapshot.ticker === "string" ? targetSnapshot.ticker : "주식";
  const action = requestType === "update" ? "수정" : "삭제";

  return `${requesterName}님이 ${ticker} 거래 ${action}을 요청했습니다`;
}

export async function createRecordChangeRequest(
  supabase: SupabaseClient<Database>,
  requesterId: string,
  input: CreateRecordChangeRequestInput,
): Promise<RecordChangeRequest> {
  validateLedgerRecordChangeRequestInput(input);
  validateStockTransactionRecordChangeRequestInput(input);

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

  const notificationTitle =
    input.targetType === "stock_transaction"
      ? await buildStockTransactionRequestNotificationTitle(
          supabase,
          requesterId,
          input.requestType,
          validatedTarget.targetSnapshot,
        )
      : "수정/삭제 요청이 도착했습니다";

  await createUserNotification({
    recipientId: validatedTarget.targetOwnerId,
    householdId: validatedTarget.householdId,
    type:
      input.targetType === "ledger_entry"
        ? "ledger_record_change_request"
        : "stock_transaction_change_request",
    title: notificationTitle,
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

export async function applyApprovedRecordChangeRequest(
  supabase: SupabaseClient<Database>,
  request: ApprovableRecordChangeRequest,
): Promise<void> {
  if (request.target_type === "ledger_entry") {
    if (request.request_type === "delete") {
      await deleteLedgerEntryWithBalanceSync(
        supabase,
        request.target_id,
        request.target_owner_id,
      );
      return;
    }

    const proposedChanges = ledgerRecordUpdateProposedChangesSchema.parse(
      request.proposed_changes,
    );
    await updateLedgerEntryWithBalanceSync(
      supabase,
      request.target_id,
      request.target_owner_id,
      proposedChanges,
    );
    return;
  }

  await applyApprovedStockTransactionChangeRequest(supabase, request);
}

interface CurrentStockTransactionRow {
  id: string;
  household_id: string;
  owner_id: string;
  ticker: string;
  type: string;
  quantity: number | string;
  price: number | string;
  transacted_at: string;
  account_id: string | null;
  memo: string | null;
}

function toRecord(value: Json): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function assertStockTransactionSnapshotMatches(
  current: CurrentStockTransactionRow,
  snapshot: Record<string, unknown>,
) {
  const matches =
    snapshot.targetType === "stock_transaction" &&
    snapshot.ticker === current.ticker &&
    snapshot.type === current.type &&
    Number(snapshot.quantity) === Number(current.quantity) &&
    Number(snapshot.price) === Number(current.price) &&
    snapshot.transactedAt === current.transacted_at &&
    (snapshot.accountId ?? null) === current.account_id &&
    (snapshot.memo ?? null) === current.memo;

  if (!matches) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_TARGET_STALE",
      "요청 이후 대상 기록이 변경되었습니다. 새 요청이 필요합니다.",
      409,
    );
  }
}

export async function applyApprovedStockTransactionChangeRequest(
  supabase: SupabaseClient<Database>,
  request: ApprovableRecordChangeRequest,
): Promise<void> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, household_id, owner_id, ticker, type, quantity, price, transacted_at, account_id, memo",
    )
    .eq("id", request.target_id)
    .eq("household_id", request.household_id)
    .single();

  if (error || !data) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_TARGET_NOT_FOUND",
      "요청 대상 기록을 찾을 수 없습니다.",
      404,
    );
  }

  const current = data as unknown as CurrentStockTransactionRow;

  if (current.owner_id !== request.target_owner_id) {
    throw new APIError(
      "RECORD_CHANGE_REQUEST_TARGET_STALE",
      "요청 이후 대상 기록이 변경되었습니다. 새 요청이 필요합니다.",
      409,
    );
  }

  assertStockTransactionSnapshotMatches(
    current,
    toRecord(request.target_snapshot),
  );

  if (request.request_type === "delete") {
    await deleteTransaction(
      supabase,
      request.target_id,
      request.household_id,
      request.target_owner_id,
    );
    return;
  }

  const proposedChanges = stockTransactionUpdateProposedChangesSchema.parse(
    request.proposed_changes,
  );
  await updateTransaction(
    supabase,
    request.target_id,
    request.household_id,
    request.target_owner_id,
    proposedChanges,
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
    await applyApprovedRecordChangeRequest(supabase, request);
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
