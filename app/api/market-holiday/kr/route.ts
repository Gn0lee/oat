import { NextResponse } from "next/server";
import type { MarketHolidayCache, MarketHolidayItem } from "@/lib/kis/types";
import { getSystemConfigClient } from "@/lib/supabase/system-config-client";

const HOLIDAY_KEY = "market_holidays_kr";

export interface MarketHolidayResponse {
  isHoliday: boolean;
  todayDate: string; // YYYYMMDD
  holidayInfo?: MarketHolidayItem;
  nextTradingDate?: string; // YYYYMMDD
  updatedAt: string;
}

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환
 */
function formatToday(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * 다음 거래일 찾기
 */
function findNextTradingDate(
  today: string,
  holidays: MarketHolidayItem[],
): string | undefined {
  const holidaySet = new Set(holidays.map((h) => h.date));

  // 오늘부터 최대 30일 후까지 검색
  const todayDate = parseDate(today);

  for (let i = 1; i <= 30; i++) {
    const nextDate = new Date(todayDate);
    nextDate.setDate(nextDate.getDate() + i);

    const dateStr = formatDateToYYYYMMDD(nextDate);
    const dayOfWeek = nextDate.getDay();

    // 주말이 아니고 휴장일 목록에 없으면 거래일
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
      return dateStr;
    }
  }

  return undefined;
}

/**
 * YYYYMMDD 문자열을 Date로 파싱
 */
function parseDate(dateStr: string): Date {
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  const month = Number.parseInt(dateStr.slice(4, 6), 10) - 1;
  const day = Number.parseInt(dateStr.slice(6, 8), 10);
  return new Date(year, month, day);
}

/**
 * Date를 YYYYMMDD 형식으로 변환
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 국내 시장 휴장일 조회
 * GET /api/market-holiday/kr
 *
 * 응답:
 * - isHoliday: 오늘이 휴장일인지 여부
 * - todayDate: 오늘 날짜 (YYYYMMDD)
 * - holidayInfo: 휴장일 정보 (휴장일인 경우)
 * - nextTradingDate: 다음 거래일 (휴장일인 경우)
 * - updatedAt: 마지막 동기화 시각
 */
export async function GET() {
  try {
    const supabase = getSystemConfigClient();

    const { data, error } = await supabase
      .from("system_config")
      .select("value, updated_at")
      .eq("key", HOLIDAY_KEY)
      .single();

    const today = formatToday();

    if (error || !data) {
      // 캐시 미스 시 휴장일 아님으로 처리
      return NextResponse.json<MarketHolidayResponse>(
        {
          isHoliday: false,
          todayDate: today,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
          },
        },
      );
    }

    const cache = data.value as unknown as MarketHolidayCache;

    // 오늘이 휴장일인지 확인
    const todayHoliday = cache.holidays.find((h) => h.date === today);

    if (todayHoliday) {
      // 다음 거래일 계산
      const nextTradingDate = findNextTradingDate(today, cache.holidays);

      return NextResponse.json<MarketHolidayResponse>(
        {
          isHoliday: true,
          todayDate: today,
          holidayInfo: todayHoliday,
          nextTradingDate,
          updatedAt: cache.syncedAt,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
          },
        },
      );
    }

    return NextResponse.json<MarketHolidayResponse>(
      {
        isHoliday: false,
        todayDate: today,
        updatedAt: cache.syncedAt,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("휴장일 조회 실패:", error);

    // 에러 시에도 휴장일 아님으로 처리 (서비스 연속성)
    return NextResponse.json<MarketHolidayResponse>(
      {
        isHoliday: false,
        todayDate: formatToday(),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60",
        },
      },
    );
  }
}
