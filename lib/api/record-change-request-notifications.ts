import type { RecordChangeRequest } from "@/types";
import { createUserNotification } from "./notifications";

type RecordChangeRequestResultNotification = Pick<
  RecordChangeRequest,
  | "id"
  | "household_id"
  | "requester_id"
  | "target_owner_id"
  | "target_type"
  | "status"
  | "response_message"
>;

function getRequestResultType(targetType: RecordChangeRequest["target_type"]) {
  return targetType === "ledger_entry"
    ? "ledger_request_result"
    : "stock_transaction_request_result";
}

function getRequestResultDomainLabel(
  targetType: RecordChangeRequest["target_type"],
) {
  return targetType === "ledger_entry" ? "가계부" : "주식 거래";
}

function getStatusLabel(status: RecordChangeRequest["status"]) {
  switch (status) {
    case "approved":
      return "승인";
    case "rejected":
      return "거절";
    case "cancelled":
      return "취소";
    default:
      return null;
  }
}

export async function notifyRecordChangeRequestResult(
  request: RecordChangeRequestResultNotification,
): Promise<void> {
  const statusLabel = getStatusLabel(request.status);
  if (!statusLabel) return;

  try {
    const recipientId =
      request.status === "cancelled"
        ? request.target_owner_id
        : request.requester_id;
    const domainLabel = getRequestResultDomainLabel(request.target_type);

    await createUserNotification({
      recipientId,
      householdId: request.household_id,
      type: getRequestResultType(request.target_type),
      title: `${domainLabel} 변경 요청이 ${statusLabel}되었습니다`,
      body: request.response_message ?? null,
      link: {
        kind: "record_change_request_detail",
        params: { requestId: request.id },
      },
      source: { type: "record_change_request", id: request.id },
      dedupeKey: `record_change_request_result:${request.id}:${request.status}`,
    });
  } catch (error) {
    console.error(
      "Record change request result notification creation error:",
      error,
    );
  }
}
