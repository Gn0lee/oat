import type { NotificationType } from "./schema";

export interface NotificationPreferenceView {
  type: NotificationType;
  label: string;
  description: string;
  group: "requests" | "results" | "changes" | "newRecords" | "household";
  inAppEnabled: boolean;
  pushEnabled: boolean;
  defaults: {
    inAppEnabled: boolean;
    pushEnabled: boolean;
  };
}

interface NotificationTypeConfig {
  label: string;
  description: string;
  group: NotificationPreferenceView["group"];
  defaults: {
    inAppEnabled: boolean;
    pushEnabled: boolean;
  };
}

export const NOTIFICATION_TYPE_CONFIG = {
  ledger_record_change_request: {
    label: "가계부 수정/삭제 요청",
    description: "공용 가계부 기록에 대한 수정 또는 삭제 요청",
    group: "requests",
    defaults: { inAppEnabled: true, pushEnabled: false },
  },
  stock_transaction_change_request: {
    label: "주식 거래 수정/삭제 요청",
    description: "주식 거래 기록에 대한 수정 또는 삭제 요청",
    group: "requests",
    defaults: { inAppEnabled: true, pushEnabled: false },
  },
  ledger_request_result: {
    label: "가계부 요청 처리 결과",
    description: "가계부 기록 요청의 승인 또는 거절 결과",
    group: "results",
    defaults: { inAppEnabled: true, pushEnabled: false },
  },
  stock_transaction_request_result: {
    label: "주식 요청 처리 결과",
    description: "주식 거래 요청의 승인 또는 거절 결과",
    group: "results",
    defaults: { inAppEnabled: true, pushEnabled: false },
  },
  ledger_record_changed: {
    label: "가계부 기록 수정/삭제",
    description: "함께 보는 가계부 기록이 수정되거나 삭제됨",
    group: "changes",
    defaults: { inAppEnabled: true, pushEnabled: false },
  },
  stock_transaction_changed: {
    label: "주식 거래 수정/삭제",
    description: "함께 보는 주식 거래 기록이 수정되거나 삭제됨",
    group: "changes",
    defaults: { inAppEnabled: true, pushEnabled: false },
  },
  ledger_record_created: {
    label: "새 공용 가계부 기록",
    description: "가구 구성원이 새 공용 가계부 기록을 추가함",
    group: "newRecords",
    defaults: { inAppEnabled: false, pushEnabled: false },
  },
  stock_transaction_created: {
    label: "새 주식 거래",
    description: "가구 구성원이 새 주식 거래 기록을 추가함",
    group: "newRecords",
    defaults: { inAppEnabled: false, pushEnabled: false },
  },
  invitation_accepted: {
    label: "초대 수락",
    description: "초대받은 사용자가 가구에 합류함",
    group: "household",
    defaults: { inAppEnabled: true, pushEnabled: false },
  },
} as const satisfies Record<NotificationType, NotificationTypeConfig>;

export const NOTIFICATION_PREFERENCE_GROUP_LABELS = {
  requests: "협업 요청",
  results: "요청 처리 결과",
  changes: "공유 기록 변경",
  newRecords: "새 공유 기록 추가",
  household: "가구",
} as const satisfies Record<NotificationPreferenceView["group"], string>;

export function getDefaultNotificationPreference(type: NotificationType) {
  return NOTIFICATION_TYPE_CONFIG[type].defaults;
}
