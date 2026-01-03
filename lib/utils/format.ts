/**
 * 숫자를 통화 형식으로 포맷
 */
export function formatCurrency(
  value: number,
  currency: "KRW" | "USD" = "KRW",
): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value);
}

/**
 * 숫자를 퍼센트 형식으로 포맷
 */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * 큰 숫자를 축약 형식으로 포맷 (예: 1.2억, 3,400만)
 */
export function formatCompactNumber(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}억`;
  }
  if (value >= 10_000) {
    return `${Math.floor(value / 10_000).toLocaleString()}만`;
  }
  return value.toLocaleString();
}

/**
 * 날짜를 한국어 형식으로 포맷
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * 날짜를 짧은 형식으로 포맷 (YYYY.MM.DD)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

/**
 * 남은 시간을 한국어 형식으로 포맷
 */
export function formatRemainingTime(targetDate: Date | string): string {
  const target =
    typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "만료됨";
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}시간 ${diffMinutes}분 후 만료`;
  }
  return `${diffMinutes}분 후 만료`;
}

/**
 * 초대 코드를 포맷 (예: ABC123 -> ABC-123)
 */
export function formatInvitationCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}
