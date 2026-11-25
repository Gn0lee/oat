// 질문 4: Pine 다크 값. 바탕 B(#121413·카드 #1C1F1E). 실행: node pine-dark.mjs
import { ratio, fmt } from './lib.mjs';
const bg = '#121413', card = '#1C1F1E';
const show = (name, btn, label, text) => console.log(name.padEnd(28), `버튼 ${btn}+${label} ${fmt(ratio(btn, label))}`,
  `| 버튼면/카드 ${ratio(btn, card).toFixed(2)}`, `| 글자 ${text} bg ${fmt(ratio(text, bg))} card ${fmt(ratio(text, card))}`);
show('A 밝은 Pine 하나 + 어두운 글자', '#4CB98A', '#0B1F17', '#4CB98A');
show('B 중간 Pine 하나 + 어두운 글자', '#3FA37A', '#0B1F17', '#3FA37A');
show('C 버튼은 진한 면 + 흰 글자', '#1F7A55', '#FFFFFF', '#5CC59A');
show('C2 버튼 진한 면 #19694A', '#19694A', '#FFFFFF', '#5CC59A');
