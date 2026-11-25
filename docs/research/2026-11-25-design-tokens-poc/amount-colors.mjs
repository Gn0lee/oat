// 질문 6: 숫자 색 재계산(확정한 바탕 기준). 실행: node amount-colors.mjs
import { ratio, fmt } from './lib.mjs';
const L = { bg: '#F4F5F3', surface: '#FFFFFF', 'surface-alt': '#EFECEA' };
const D = { bg: '#121413', surface: '#1C1F1E', 'surface-alt': '#242826' };
const show = (mode, set, list) => { console.log(`\n== ${mode} ==`);
  for (const [n, c] of list) console.log(n.padEnd(16), c, Object.entries(set).map(([k, b]) => `${k} ${fmt(ratio(c, b))}`).join(' | ')); };
show('라이트', L, [['up-strong', '#F04452'], ['up', '#C81E2D'], ['down-strong', '#3182F6'], ['down', '#1B64DA']]);
show('다크', D, [['up', '#FF6B6B'], ['down', '#4795FF'], ['down 후보', '#5B9DFF']]);
