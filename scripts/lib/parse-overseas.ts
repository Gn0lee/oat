import { getChoseong } from "es-hangul";
import iconv from "iconv-lite";
import { US_STOCK_TYPE_MAPPINGS } from "./mappings";
import type { ExchangeType, ParsedStock } from "./types";

/**
 * 해외 주식 마스터파일 파싱
 *
 * 파일 형식: 탭 구분자 (CP949 인코딩)
 * 컬럼: 국가(0), 시장타입(1), 거래소코드(2), 거래소명(3),
 *       심볼(4), 종목코드(5), 한글명(6), 영문명(7), 증권유형(8), ...
 */
export function parseOverseasFile(
  buffer: Buffer,
  exchange: ExchangeType,
): ParsedStock[] {
  const content = iconv.decode(buffer, "cp949");
  const lines = content.split("\n").filter((line) => line.trim());
  const records: ParsedStock[] = [];

  for (const line of lines) {
    const fields = line.split("\t");
    if (fields.length < 9) continue;

    const symbol = fields[4]?.trim();
    const nameKr = fields[6]?.trim();
    const nameEn = fields[7]?.trim();
    const securityType = fields[8]?.trim();

    if (!symbol || !nameKr) continue;

    // 한글 이름이 있으면 초성 생성
    const hasKorean = /[가-힣]/.test(nameKr);
    const choseong = hasKorean ? getChoseong(nameKr) : null;

    // 종목유형 매핑
    const mapping = US_STOCK_TYPE_MAPPINGS[securityType];
    if (!mapping && securityType) {
      console.warn(
        `  [${exchange}] 알 수 없는 증권유형: ${securityType} (${symbol})`,
      );
    }

    records.push({
      code: symbol,
      name: nameKr,
      name_en: nameEn || null,
      choseong,
      market: "US",
      exchange,
      stock_type_code: securityType || null,
      stock_type_name: mapping?.name || null,
      stock_type_category: mapping?.category || null,
      is_active: true,
      is_suspended: false,
    });
  }

  return records;
}
