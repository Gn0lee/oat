export type LedgerBookVisibility = "shared" | "personal";

export interface LedgerBook {
  id: string;
  name: string;
  visibility: LedgerBookVisibility;
  createdBy: string | null;
  isDefault: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 장부 목록 응답 항목. 최근 사용 장부 정렬에 쓰는 최근 입력 시각을 함께 준다. */
export interface LedgerBookListItem extends LedgerBook {
  /** 내가 볼 수 있는 이 장부 거래 중 가장 최근 입력(created_at) 시각. 거래가 없으면 null */
  lastEntryAt: string | null;
}
