/**
 * KIS API에서 휴장일 데이터를 조회하여 system_config에 저장하는 스크립트
 *
 * 사용법:
 *   pnpm sync:holiday
 *
 * 환경변수:
 *   SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   KIS_BASE_URL
 *   KIS_APP_KEY
 *   KIS_APP_SECRET
 */

import { config } from "dotenv";

// 로컬 환경에서 .env.local 로드 (GitHub Actions에서는 이미 환경변수가 설정됨)
config({ path: ".env.local" });

import type {
  KISHolidayOutput,
  MarketHolidayCache,
  MarketHolidayItem,
} from "@/lib/kis/types";
import type { Json } from "@/types/supabase";

// system_config 키
const HOLIDAY_KEY = "market_holidays_kr";

// 요일 코드 → 한글 변환
const DAY_OF_WEEK_MAP: Record<string, string> = {
  "01": "일",
  "02": "월",
  "03": "화",
  "04": "수",
  "05": "목",
  "06": "금",
  "07": "토",
};

/**
 * 휴장일 필터링 (개장일이 아닌 날만)
 */
function filterHolidays(items: KISHolidayOutput[]): MarketHolidayItem[] {
  return items
    .filter((item) => item.opnd_yn === "N")
    .map((item) => ({
      date: item.bass_dt,
      dayOfWeek: DAY_OF_WEEK_MAP[item.wday_dvsn_cd] ?? "",
    }));
}

/**
 * 메인 함수
 */
async function main() {
  console.log("=== 휴장일 동기화 시작 ===\n");

  // dotenv 로드 후 dynamic import (환경변수 의존 모듈)
  const { getDomesticHolidays } = await import("@/lib/kis/client");
  const { getSystemConfigClient } = await import(
    "@/lib/supabase/system-config-client"
  );

  // 오늘 날짜 (YYYYMMDD)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  console.log(`[기준일자] ${today}\n`);

  console.log("[KIS API 휴장일 조회]");
  const rawItems = await getDomesticHolidays(today);
  console.log(`  조회된 일자: ${rawItems.length}개`);

  const holidays = filterHolidays(rawItems);
  console.log(`  휴장일: ${holidays.length}개`);

  if (holidays.length > 0) {
    console.log("  휴장일 목록:");
    for (const h of holidays) {
      console.log(`    - ${h.date} (${h.dayOfWeek})`);
    }
  }

  console.log("\n[Supabase UPSERT]");
  const supabase = getSystemConfigClient();

  const cache: MarketHolidayCache = {
    holidays,
    syncedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from("system_config").upsert(
    {
      key: HOLIDAY_KEY,
      value: cache as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(`UPSERT 오류: ${error.message}`);
  }

  console.log("  UPSERT 완료");
  console.log("\n=== 휴장일 동기화 완료 ===");
}

main().catch((error) => {
  console.error("동기화 실패:", error);
  process.exit(1);
});
