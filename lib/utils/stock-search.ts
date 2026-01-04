import type { StockMaster } from "@/types";

/**
 * 초성만으로 이루어진 문자열인지 확인
 */
export function isChoseongOnly(text: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(text);
}

/**
 * 검색어에 대한 종목의 관련도 점수 계산
 */
export function getStockRelevanceScore(
  stock: StockMaster,
  query: string,
): number {
  const q = query.toLowerCase().trim();
  const code = stock.code.toLowerCase();
  const name = stock.name.toLowerCase();
  const nameEn = stock.name_en?.toLowerCase() ?? "";
  const choseong = stock.choseong ?? "";

  // 코드 정확 매칭
  if (code === q) return 100;
  // 코드 시작 매칭
  if (code.startsWith(q)) return 80;
  // 초성 시작 매칭
  if (isChoseongOnly(q) && choseong.startsWith(q)) return 70;
  // 이름 시작 매칭
  if (name.startsWith(q)) return 60;
  if (nameEn.startsWith(q)) return 55;
  // 이름 포함
  if (name.includes(q)) return 40;
  if (nameEn.includes(q)) return 35;

  return 0;
}

/**
 * 종목 검색 결과를 관련도 순으로 정렬
 */
export function sortStocksByRelevance(
  stocks: StockMaster[],
  query: string,
): StockMaster[] {
  return [...stocks].sort((a, b) => {
    const scoreA = getStockRelevanceScore(a, query);
    const scoreB = getStockRelevanceScore(b, query);
    return scoreB - scoreA;
  });
}
