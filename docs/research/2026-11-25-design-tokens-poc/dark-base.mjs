// 질문 3: 다크 바탕 후보와 Pine 다크 후보의 대비. 실행: node dark-base.mjs
import { ratio, fmt } from './lib.mjs';
const bases = {
  'A 중립 회색': { bg: '#121212', card: '#1E1E1E', text: '#ECECEC' },
  'B Pine 기운(초록빛 회색)': { bg: '#121413', card: '#1C1F1E', text: '#E8EAE9' },
  'C 귀리 기운(따뜻한 회색)': { bg: '#141311', card: '#1F1D1A', text: '#ECE9E4' },
  'D 순수 검정(OLED)': { bg: '#000000', card: '#1C1C1E', text: '#F2F2F2' },
};
console.log('== 바탕별 본문 글자 대비 ==');
for (const [k, b] of Object.entries(bases)) console.log(k.padEnd(22), 'text/bg', fmt(ratio(b.text, b.bg)), '| text/card', fmt(ratio(b.text, b.card)), '| card/bg', ratio(b.card, b.bg).toFixed(2));
const pines = ['#2E8B63', '#3FA37A', '#4CB98A', '#5CC59A', '#7AD3AC'];
console.log('\n== Pine 다크 후보 (B 바탕 기준) ==');
const B = bases['B Pine 기운(초록빛 회색)'];
for (const p of pines) console.log(p, '| 글자로 bg', fmt(ratio(p, B.bg)), '| card', fmt(ratio(p, B.card)),
  '| 버튼 흰 글자', fmt(ratio('#FFFFFF', p)), '| 버튼 검은 글자 #0B1F17', fmt(ratio('#0B1F17', p)));
