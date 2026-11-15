// PROTOTYPE 목업 데이터. 서버도 저장소도 없어요.
// 시트 안 스크롤과 시트 드래그 충돌을 시험하려고 목록을 일부러 길게 만들었어요.

export type Option = { id: string; label: string; sub?: string; emoji: string };

export const PAYMENT_METHODS: Option[] = [
  { id: "pm1", emoji: "💳", label: "신한 Deep Dream", sub: "신용 · 신한카드 15일 결제" },
  { id: "pm2", emoji: "💳", label: "현대카드 M", sub: "신용 · 현대카드 25일 결제" },
  { id: "pm3", emoji: "💳", label: "삼성 taptap O", sub: "신용 · 삼성카드 14일 결제" },
  { id: "pm4", emoji: "💳", label: "국민 노리2", sub: "체크 · 국민 입출금" },
  { id: "pm5", emoji: "💳", label: "토스뱅크 체크", sub: "체크 · 토스뱅크 통장" },
  { id: "pm6", emoji: "🟡", label: "카카오페이 머니", sub: "페이머니" },
  { id: "pm7", emoji: "🟢", label: "네이버페이 머니", sub: "페이머니" },
  { id: "pm8", emoji: "🟢", label: "네이버페이 포인트", sub: "포인트" },
  { id: "pm9", emoji: "🎁", label: "온누리상품권", sub: "상품권" },
  { id: "pm10", emoji: "🎁", label: "지역화폐", sub: "상품권" },
  { id: "pm11", emoji: "💵", label: "현금", sub: "지갑" },
  { id: "pm12", emoji: "🏦", label: "국민 입출금", sub: "계좌이체" },
  { id: "pm13", emoji: "🏦", label: "토스뱅크 통장", sub: "계좌이체" },
  { id: "pm14", emoji: "🏦", label: "카카오뱅크 세이프박스", sub: "계좌이체" },
  { id: "pm15", emoji: "💳", label: "롯데 LOCA", sub: "신용 · 롯데카드 10일 결제" },
  { id: "pm16", emoji: "💳", label: "우리 카드의정석", sub: "신용 · 우리카드 23일 결제" },
  { id: "pm17", emoji: "💳", label: "하나 원더카드", sub: "신용 · 하나카드 13일 결제" },
  { id: "pm18", emoji: "🍎", label: "애플페이 (현대카드 M)", sub: "간편결제" },
  { id: "pm19", emoji: "🔵", label: "삼성페이 (taptap O)", sub: "간편결제" },
  { id: "pm20", emoji: "🟣", label: "페이코 포인트", sub: "포인트" },
  { id: "pm21", emoji: "🟠", label: "OK캐쉬백", sub: "포인트" },
  { id: "pm22", emoji: "🔴", label: "CJ ONE", sub: "포인트" },
  { id: "pm23", emoji: "⚪️", label: "해피머니", sub: "상품권" },
  { id: "pm24", emoji: "⚫️", label: "컬쳐랜드", sub: "상품권" },
];

export const CATEGORIES: Option[] = [
  "🍚 식비", "☕️ 카페·간식", "🛒 장보기", "🍺 술·유흥", "🚌 대중교통", "🚕 택시", "⛽️ 주유",
  "🅿️ 주차·통행료", "🏠 월세·관리비", "💡 공과금", "📱 통신비", "🎬 문화·여가", "📚 도서",
  "🏋️ 운동", "💊 의료·약국", "💇 미용", "👕 의류", "👟 신발·잡화", "🧴 생활용품", "🛋️ 가구·가전",
  "🎁 선물·경조사", "✈️ 여행", "🏨 숙박", "🐶 반려동물", "👶 육아", "🎓 교육", "💼 업무",
  "🧾 세금·보험", "📦 구독", "🍽️ 외식", "🧸 취미", "❓ 기타",
].map((s, i) => {
  const [emoji, ...rest] = s.split(" ");
  return { id: `c${i}`, emoji, label: rest.join(" ") };
});
