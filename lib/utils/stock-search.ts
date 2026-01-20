import type { StockMaster } from "@/types";

/**
 * 초성만으로 이루어진 문자열인지 확인
 */
export function isChoseongOnly(text: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(text);
}

/**
 * 영문 키보드 배치를 한글 초성으로 매핑 (두벌식 기준)
 */
const EN_TO_KR_CHOSEONG: Record<string, string> = {
  r: "ㄱ",
  R: "ㄲ",
  s: "ㄴ",
  e: "ㄷ",
  E: "ㄸ",
  f: "ㄹ",
  a: "ㅁ",
  q: "ㅂ",
  Q: "ㅃ",
  t: "ㅅ",
  T: "ㅆ",
  d: "ㅇ",
  w: "ㅈ",
  W: "ㅉ",
  c: "ㅊ",
  z: "ㅋ",
  x: "ㅌ",
  v: "ㅍ",
  g: "ㅎ",
};

/**
 * 영문 문자열을 한글 초성 문자열로 변환
 */
export function convertEnToChoseong(text: string): string {
  return text
    .split("")
    .map((char) => EN_TO_KR_CHOSEONG[char] || char)
    .join("");
}

/**
 * 문자열 정규화 (공백 및 특수문자 제거)
 */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g, "");
}

/**
 * 검색어에 대한 종목의 관련도 점수 계산
 */
export function getStockRelevanceScore(
  stock: StockMaster,
  query: string,
): number {
  const rawQ = query.trim();
  const lowerRawQ = rawQ.toLowerCase();
  const q = normalize(lowerRawQ);

  if (!q) return 0;

  const code = stock.code.toLowerCase();
  const name = stock.name.toLowerCase();
  const nameEn = stock.name_en?.toLowerCase() ?? "";
  const choseong = stock.choseong ?? "";

  const normName = normalize(name);
  const normNameEn = normalize(nameEn);

  // 영문 오타 변환 (예: tt -> ㅅㅅ)
  const convertedQ = convertEnToChoseong(rawQ);
  const isEnOnly = /^[a-zA-Z]+$/.test(rawQ);

  // 1. 코드 정확 매칭 (100점)
  if (code === lowerRawQ || code === q) return 100;

  // 2. 이름 정확 매칭 (95점)
  if (normName === q || normNameEn === q) return 95;

  // 3. 코드 시작 매칭 (85점)
  if (code.startsWith(q)) return 85;

  // 4. 이름 단어 시작 매칭 (80점)
  // 예: "삼성" 검색 시 "삼성전자" 또는 "에스엔에스 삼성" (삼성으로 시작하는 단어가 있는 경우)
  const words = name.split(/\s+/);
  const wordsEn = nameEn.split(/\s+/);
  if (
    words.some((w) => normalize(w).startsWith(q)) ||
    wordsEn.some((w) => normalize(w).startsWith(q))
  ) {
    return 80;
  }

  // 5. 초성 시작 매칭 (75점)
  if (isChoseongOnly(rawQ) && choseong.startsWith(rawQ)) return 75;

  // 5-1. 영문 오타 -> 초성 시작 매칭 (70점)
  if (isEnOnly && choseong.startsWith(convertedQ)) return 70;

  // 6. 이름 포함 (공백 유지 상태에서의 포함 우선 - 60점)
  if (name.includes(lowerRawQ) || nameEn.includes(lowerRawQ)) {
    return q.length > 2 ? 60 : 30;
  }

  // 7. 공백 제거 후 포함 (사용자님이 명시하신 'tt'가 단어 사이에 걸친 경우 - 40점)
  if (normName.includes(q) || normNameEn.includes(q)) {
    return q.length > 2 ? 40 : 10; // 점수를 더 낮춤
  }

  // 8. 초성 중간 포함
  if (isChoseongOnly(rawQ) && choseong.includes(rawQ)) {
    return rawQ.length > 2 ? 50 : 20;
  }

  // 8-1. 영문 오타 -> 초성 중간 포함 (15점)
  if (isEnOnly && choseong.includes(convertedQ)) {
    return 15;
  }

  return 0;
}

/**
 * 종목 검색 결과를 관련도 순으로 정렬
 */
export function sortStocksByRelevance(
  stocks: StockMaster[],
  query: string,
): StockMaster[] {
  if (!query.trim()) return stocks;

  return [...stocks]
    .map((stock) => ({
      stock,
      score: getStockRelevanceScore(stock, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      // 1. 점수 순 (내림차순)
      if (b.score !== a.score) return b.score - a.score;
      // 2. 점수가 같으면 이름 길이 순 (짧은 것 우선 - 정확도 높음)
      if (a.stock.name.length !== b.stock.name.length) {
        return a.stock.name.length - b.stock.name.length;
      }
      // 3. 이름 알파벳 순
      return a.stock.name.localeCompare(b.stock.name);
    })
    .map((item) => item.stock);
}
