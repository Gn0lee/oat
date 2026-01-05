/**
 * 페이지네이션 옵션
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

/**
 * 정렬 옵션
 */
export interface SortOptions<T extends string = string> {
  field: T;
  direction: "asc" | "desc";
}

/**
 * 페이지네이션 결과
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 기본 페이지네이션 값
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * 페이지네이션 range 계산
 */
export function calculateRange(options?: PaginationOptions): {
  from: number;
  to: number;
  page: number;
  pageSize: number;
} {
  const page = options?.page ?? DEFAULT_PAGE;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { from, to, page, pageSize };
}

/**
 * 페이지네이션 결과 생성
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  options?: PaginationOptions,
): PaginatedResult<T> {
  const { page, pageSize } = calculateRange(options);
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
