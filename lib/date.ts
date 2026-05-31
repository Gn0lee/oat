import { isValid } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const KST_TZ = "Asia/Seoul";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface IsoDateRange {
  from: string;
  to: string;
}

/**
 * UTC 또는 기타 시간대의 Date/문자열을 입력받아 KST(한국 표준시) 기준의 문자열로 포맷팅합니다.
 * @example formatKst(new Date(), "yyyy-MM-dd")
 */
export function formatKst(
  date: Date | string | number | null | undefined,
  formatStr: string = "yyyy-MM-dd",
): string {
  if (!date) return "";
  const d =
    typeof date === "string"
      ? new Date(date)
      : typeof date === "number"
        ? new Date(date)
        : date;
  if (!isValid(d)) return "";
  return formatInTimeZone(d, KST_TZ, formatStr, { locale: ko });
}

/**
 * KST 기준의 현재 시간을 반환합니다.
 */
export function getKstNow(): Date {
  return toZonedTime(new Date(), KST_TZ);
}

/**
 * 서버에서 온 UTC 날짜를 KST 기준의 로컬 Date 객체로 변환합니다.
 * UI 컴포넌트(예: Calendar, DatePicker)에 전달할 때 사용합니다.
 */
export function toKstDate(date: Date | string | number): Date {
  const d =
    typeof date === "string"
      ? new Date(date)
      : typeof date === "number"
        ? new Date(date)
        : date;
  return toZonedTime(d, KST_TZ);
}

/**
 * UI에서 선택된 Date 객체(시스템 로컬 기준)를 받아 KST 기준으로 해석한 뒤 UTC Date로 변환합니다.
 */
export function fromKstDate(date: Date): Date {
  // 시스템의 로컬 시간을 연/월/일/시/분/초로 뽑아낸 후 KST로 취급하여 UTC로 변환
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return fromZonedTime(dateStr, KST_TZ);
}

/**
 * 주어진 KST 연, 월에 해당하는 월의 시작일과 종료일(다음달 1일)을 UTC ISO 문자열로 반환합니다.
 */
export function getKstMonthRange(year: number, month: number): IsoDateRange {
  const from = new Date(Date.UTC(year, month - 1, 1) - KST_OFFSET_MS);
  const to = new Date(Date.UTC(year, month, 1) - KST_OFFSET_MS);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * YYYY-MM-DD 형식의 문자열(KST 기준 날짜)을 해당 일의 0시부터 다음날 0시까지의 UTC ISO 문자열로 반환합니다.
 */
export function getKstDayRange(dateStr: string): IsoDateRange {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("date는 YYYY-MM-DD 형식이어야 합니다.");
  }

  const fromTime = Date.UTC(year, month - 1, day) - KST_OFFSET_MS;
  const from = new Date(fromTime);
  const to = new Date(fromTime + 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}
