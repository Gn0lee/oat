import type { NotificationLink, NotificationLinkKind } from "./schema";

interface NotificationLinkParts {
  linkKind: NotificationLinkKind | null;
  linkParams: unknown;
}

function getParamObject(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return {};
  }

  return params as Record<string, unknown>;
}

export function buildNotificationHref(link: NotificationLinkParts): string {
  const params = getParamObject(link.linkParams);

  switch (link.linkKind) {
    case "ledger_record_detail":
      return typeof params.entryId === "string"
        ? `/ledger/records/${encodeURIComponent(params.entryId)}?from=notification`
        : "/ledger/records";
    case "ledger_record_date":
      return typeof params.date === "string"
        ? `/ledger/records?date=${encodeURIComponent(params.date)}`
        : "/ledger/records";
    case "stock_transaction_detail":
      return typeof params.transactionId === "string"
        ? `/assets/stock/transactions/${encodeURIComponent(params.transactionId)}?from=notification`
        : "/assets/stock/transactions";
    case "stock_record_date":
      return typeof params.date === "string"
        ? `/assets/stock/records?date=${encodeURIComponent(params.date)}`
        : "/assets/stock/records";
    case "record_change_request_detail":
      return typeof params.requestId === "string"
        ? `/notifications/requests/${encodeURIComponent(params.requestId)}`
        : "/notifications";
    case "household_settings":
      return "/settings/household";
    case "notification_settings":
      return "/settings/notifications";
    default:
      return "/notifications";
  }
}

export function toNotificationLinkParts(link?: NotificationLink | null) {
  return {
    linkKind: link?.kind ?? null,
    linkParams: link?.params ?? {},
  };
}
