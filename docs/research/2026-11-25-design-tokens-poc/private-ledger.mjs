// 질문 8: 개인 장부 색. 칩(옅은 면 + 진한 글자)과 목록 표시의 대비. 실행: node private-ledger.mjs
import { ratio, fmt } from './lib.mjs';
const c = {
  'A 보라': { l: ['#6246B5', '#EFEAFB'], d: ['#B9A6F2', '#2C2540'] },
  'B 자두': { l: ['#8E3B7E', '#F7E8F3'], d: ['#E7A3D8', '#3A2335'] },
  'C 무채색': { l: ['#191F28', '#E5E8E6'], d: ['#E8EAE9', '#2F3331'] },
};
for (const [n, { l, d }] of Object.entries(c)) console.log(n.padEnd(8), `라이트 칩 ${fmt(ratio(l[0], l[1]))} · 카드 위 글자 ${fmt(ratio(l[0], '#FFFFFF'))}`,
  `| 다크 칩 ${fmt(ratio(d[0], d[1]))} · 카드 위 글자 ${fmt(ratio(d[0], '#1C1F1E'))}`);
