// 질문 5: 글자·선 중립 토큰. 실행: node neutrals.mjs
import { ratio, fmt } from './lib.mjs';
const L = { bg: '#F4F5F3', surface: '#FFFFFF', 'surface-alt': '#EFECEA' };
const D = { bg: '#121413', surface: '#1C1F1E', 'surface-alt': '#242826' };
const rows = (title, set, cands) => { console.log(`\n== ${title} ==`);
  for (const c of cands) console.log(c, Object.entries(set).map(([k, b]) => `${k} ${fmt(ratio(c, b))}`).join(' | ')); };
rows('라이트 글자 후보', L, ['#191F28', '#4E5968', '#5B6470', '#6B7684', '#8B95A1', '#B0B8C1']);
rows('다크 글자 후보', D, ['#E8EAE9', '#B4BAB7', '#A3A9A6', '#8E9592', '#6E7572', '#565C59']);
rows('라이트 선 후보(입력칸 테두리는 3 필요)', L, ['#E5E8E6', '#D5D9D7', '#8E9692', '#868E8A']);
rows('다크 선 후보', D, ['#2C302E', '#3A3F3C', '#6E7572', '#767D7A']);
