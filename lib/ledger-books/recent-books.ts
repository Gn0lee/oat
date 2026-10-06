/**
 * 최근 사용 장부 정렬·선별 (#460).
 * 허브, 장부 관리 목록, 장부 칩, 입력 피커가 모두 이 모듈 하나의 순서를 쓴다.
 */

export interface RecentBookFields {
  id: string;
  isDefault: boolean;
  archivedAt: string | null;
  createdAt: string;
  /** 내가 볼 수 있는 거래 중 가장 최근 입력 시각. 없거나 모르면 기록 없는 장부로 본다 */
  lastEntryAt?: string | null;
}

export const HUB_BOOK_LIMIT = 4;
export const CHIP_BOOK_LIMIT = 6;

function time(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareRecent(a: RecentBookFields, b: RecentBookFields) {
  const aLast = time(a.lastEntryAt);
  const bLast = time(b.lastEntryAt);
  if (aLast !== bLast) {
    if (aLast === null) return 1;
    if (bLast === null) return -1;
    return bLast - aLast;
  }
  return (time(a.createdAt) ?? 0) - (time(b.createdAt) ?? 0);
}

/**
 * 최근 사용 순서: 기본 장부 → 최근 입력 시각 내림차순 → 기록 없는 장부는 생성순 → 보관 장부.
 * 피커·장부 관리 목록도 이 순서를 그대로 쓴다.
 */
export function orderRecentBooks<T extends RecentBookFields>(books: T[]): T[] {
  const active = books.filter((book) => !book.archivedAt);
  return [
    ...active.filter((book) => book.isDefault),
    ...active.filter((book) => !book.isDefault).sort(compareRecent),
    ...books.filter((book) => book.archivedAt).sort(compareRecent),
  ];
}

/** 허브: 기본 장부 + 최근 사용 3개. 활성 장부가 더 있으면 "장부 전체 n개"를 보여준다 */
export function selectHubBooks<T extends RecentBookFields>(books: T[]) {
  const active = orderRecentBooks(books).filter((book) => !book.archivedAt);
  return {
    books: active.slice(0, HUB_BOOK_LIMIT),
    activeCount: active.length,
    hasMore: active.length > HUB_BOOK_LIMIT,
  };
}

/**
 * 장부 칩: 보관 포함 6개 이하이면 전부, 넘으면 기본 장부 + 최근 사용 활성 장부 5개와 "장부 선택".
 * 칩 밖 장부가 선택되면 맨 앞(전체 칩 바로 뒤)에 임시 칩으로 넣는다.
 */
export function selectChipBooks<T extends RecentBookFields>(
  books: T[],
  selectedBookId?: string,
) {
  const ordered = orderRecentBooks(books);
  if (ordered.length <= CHIP_BOOK_LIMIT) {
    return { books: ordered, hasPicker: false };
  }

  const chips = ordered
    .filter((book) => !book.archivedAt)
    .slice(0, CHIP_BOOK_LIMIT);
  const selected = ordered.find((book) => book.id === selectedBookId);
  const hasSelectedChip = chips.some((book) => book.id === selectedBookId);
  return {
    books: selected && !hasSelectedChip ? [selected, ...chips] : chips,
    hasPicker: true,
  };
}
