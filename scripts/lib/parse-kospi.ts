import { getChoseong } from "es-hangul";
import iconv from "iconv-lite";
import { KR_STOCK_TYPE_MAPPINGS } from "./mappings";
import type { ParsedStock } from "./types";

/**
 * KOSPI 마스터파일 파싱
 *
 * 파일 형식: 고정폭 (바이트 단위, CP949 인코딩)
 * - Part 1: 단축코드(9) + 표준코드(12) + 한글명(가변)
 * - Part 2: 마지막 227바이트 (고정폭 데이터)
 *   - offset 0-1: 그룹코드 (ST, EF, EN 등)
 */
export function parseKospiFile(buffer: Buffer): ParsedStock[] {
  const lines = splitLines(buffer);
  const records: ParsedStock[] = [];

  for (const lineBuffer of lines) {
    if (lineBuffer.length < 250) continue;

    // Part 1: 처음부터 마지막 227바이트 전까지
    const part1Buffer = lineBuffer.subarray(0, lineBuffer.length - 227);
    const part1 = iconv.decode(part1Buffer, "cp949");

    // Part 2: 마지막 227바이트
    const part2Buffer = lineBuffer.subarray(-227);
    const part2 = iconv.decode(part2Buffer, "cp949");

    // Part 1에서 종목코드, 종목명 추출
    const shortCode = part1.substring(0, 9).trim();
    const name = part1.substring(21).trim();

    // Part 2에서 그룹코드 추출
    const groupCode = part2.substring(0, 2).trim();

    // 종목코드가 숫자 6자리인 경우만 처리
    if (!/^\d{6}$/.test(shortCode)) continue;

    // 종목유형 매핑
    const mapping = KR_STOCK_TYPE_MAPPINGS[groupCode];
    if (!mapping && groupCode) {
      console.warn(
        `  [KOSPI] 알 수 없는 그룹코드: ${groupCode} (${shortCode})`,
      );
    }

    records.push({
      code: shortCode,
      name,
      name_en: null,
      choseong: getChoseong(name),
      market: "KR",
      exchange: "KOSPI",
      stock_type_code: groupCode || null,
      stock_type_name: mapping?.name || null,
      stock_type_category: mapping?.category || null,
      is_active: true,
      is_suspended: false,
    });
  }

  return records;
}

function splitLines(buffer: Buffer): Buffer[] {
  const lines: Buffer[] = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0x0a) {
      lines.push(buffer.subarray(start, i));
      start = i + 1;
    }
  }
  if (start < buffer.length) {
    lines.push(buffer.subarray(start));
  }
  return lines;
}
