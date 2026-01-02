/**
 * KIS 마스터파일을 다운로드하여 stock_master 테이블에 동기화하는 스크립트
 *
 * 사용법:
 *   pnpm sync:stocks
 *
 * 환경변수 (fallback 지원):
 *   SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// 로컬 환경에서 .env.local 로드 (GitHub Actions에서는 이미 환경변수가 설정됨)
config({ path: ".env.local" });

import type { Database } from "../types/supabase";
import { downloadAndUnzip } from "./lib/download";
import { parseKosdaqFile } from "./lib/parse-kosdaq";
import { parseKospiFile } from "./lib/parse-kospi";
import { parseOverseasFile } from "./lib/parse-overseas";
import type { StockInsert } from "./lib/types";

// 환경변수 (fallback 지원)
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    "환경변수가 필요합니다: SUPABASE_URL (또는 NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SECRET_KEY",
  );
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY);

// 다운로드 URL 설정
const SOURCES = [
  {
    url: "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
    exchange: "KOSPI",
    parser: parseKospiFile,
  },
  {
    url: "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip",
    exchange: "KOSDAQ",
    parser: parseKosdaqFile,
  },
  {
    url: "https://new.real.download.dws.co.kr/common/master/nasmst.cod.zip",
    exchange: "NASDAQ",
    parser: (buf: Buffer) => parseOverseasFile(buf, "NASDAQ"),
  },
  {
    url: "https://new.real.download.dws.co.kr/common/master/nysmst.cod.zip",
    exchange: "NYSE",
    parser: (buf: Buffer) => parseOverseasFile(buf, "NYSE"),
  },
  {
    url: "https://new.real.download.dws.co.kr/common/master/amsmst.cod.zip",
    exchange: "AMEX",
    parser: (buf: Buffer) => parseOverseasFile(buf, "AMEX"),
  },
];

/**
 * 단일 소스 다운로드 및 파싱
 */
async function processSource(source: (typeof SOURCES)[0]) {
  const buffer = await downloadAndUnzip(source.url);
  const records = source.parser(buffer);
  console.log(`  ${source.exchange}: ${records.length}개`);
  return { exchange: source.exchange, records };
}

/**
 * Supabase에 UPSERT (배치 처리)
 */
async function upsertToSupabase(records: StockInsert[]): Promise<void> {
  if (records.length === 0) return;

  const batchSize = 1000;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("stock_master").upsert(
      batch.map((r) => ({
        ...r,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: "market,code" },
    );

    if (error) {
      console.error(`  UPSERT 오류 (batch ${i / batchSize + 1}):`, error);
      throw error;
    }

    console.log(`  UPSERT 완료: ${i + batch.length}/${records.length}`);
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log("=== 종목 마스터 동기화 시작 ===\n");
  console.log("[다운로드 및 파싱] (병렬 처리)");

  // 모든 소스 병렬 다운로드 및 파싱
  const results = await Promise.allSettled(SOURCES.map(processSource));

  // 결과 집계
  const allRecords: StockInsert[] = [];
  const summary: { exchange: string; count: number; success: boolean }[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const exchange = SOURCES[i].exchange;

    if (result.status === "fulfilled") {
      allRecords.push(...result.value.records);
      summary.push({
        exchange,
        count: result.value.records.length,
        success: true,
      });
    } else {
      console.error(`  ${exchange} 실패:`, result.reason);
      summary.push({ exchange, count: 0, success: false });
    }
  }

  // Supabase UPSERT
  console.log(`\n[Supabase UPSERT] 총 ${allRecords.length}개`);
  await upsertToSupabase(allRecords);

  // 결과 요약
  console.log("\n=== 결과 요약 ===");
  const krCount = summary
    .filter((r) => ["KOSPI", "KOSDAQ"].includes(r.exchange))
    .reduce((sum, r) => sum + r.count, 0);
  const usCount = summary
    .filter((r) => ["NASDAQ", "NYSE", "AMEX"].includes(r.exchange))
    .reduce((sum, r) => sum + r.count, 0);
  const failedCount = summary.filter((r) => !r.success).length;

  console.log(`국내: ${krCount}개 (KOSPI + KOSDAQ)`);
  console.log(`해외: ${usCount}개 (NASDAQ + NYSE + AMEX)`);
  console.log(`총계: ${allRecords.length}개`);
  if (failedCount > 0) {
    console.log(`실패: ${failedCount}개 거래소`);
  }
  console.log("\n=== 종목 마스터 동기화 완료 ===");
}

main().catch((error) => {
  console.error("동기화 실패:", error);
  process.exit(1);
});
