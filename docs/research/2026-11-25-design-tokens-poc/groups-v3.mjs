// 질문 7 세 번째: 톤을 올린 카테고리 색. 숫자 색 문법 A(가계부 수입 파랑, 투자 상승 빨강·하락 파랑) 뒤.
// 예약 색상각(빨강 0~45°, Pine 초록 125~185°, 파랑 230~285°)을 피한다. 실행: node groups-v3.mjs
import { oklchToHex } from './groups-v2.mjs';
import { ratio } from './lib.mjs';
const toLin = (hex) => hex.replace('#', '').match(/../g).map((h) => { const v = parseInt(h, 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
const oklab = ([r, g, b]) => { const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; };
const M = { 정상: null, protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]], deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]] };
const sim = (lin, m) => (m ? m.map((r) => Math.min(1, Math.max(0, r[0] * lin[0] + r[1] * lin[1] + r[2] * lin[2]))) : lin);
const minD = (hex, m) => { const p = hex.map((h) => oklab(sim(toLin(h), m))); let d = 9;
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) d = Math.min(d, Math.hypot(...p[i].map((v, k) => v - p[j][k]))); return d; };
const spec = {
  light: [[0.80, 0.14, 80], [0.55, 0.16, 295], [0.58, 0.10, 205], [0.84, 0.08, 335], [0.60, 0.12, 55]],
  dark: [[0.84, 0.13, 80], [0.68, 0.15, 295], [0.66, 0.11, 205], [0.90, 0.06, 335], [0.70, 0.12, 55]],
};
const debt = { light: '#8E9592', dark: '#6E7572' }, card = { light: '#FFFFFF', dark: '#1C1F1E' };
for (const mode of ['light', 'dark']) {
  const hex = spec[mode].map((s) => oklchToHex(...s));
  console.log(mode, hex.join(' '), '| 부채', debt[mode]);
  console.log('  카드와', hex.map((c) => ratio(c, card[mode]).toFixed(2)).join(' '));
  console.log('  가장 가까운 두 색(부채 포함)', Object.entries(M).map(([k, m]) => `${k} ${minD([...hex, debt[mode]], m).toFixed(3)}`).join(' · '));
}
// 가장 가까운 쌍 이름 출력
const names = ['쓸 수 있는 돈', '모으는 돈', '투자', '포인트·상품권', '빌려준 돈', '갚아야 할 돈'];
for (const mode of ['light', 'dark']) {
  const hex = [...spec[mode].map((s) => oklchToHex(...s)), debt[mode]];
  for (const [k, m] of Object.entries(M)) {
    const p = hex.map((h) => oklab(sim(toLin(h), m))); const pairs = [];
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) pairs.push([Math.hypot(...p[i].map((v, x) => v - p[j][x])), names[i], names[j]]);
    pairs.sort((a, b) => a[0] - b[0]); console.log(mode, k, pairs.slice(0, 2).map((q) => `${q[1]}~${q[2]} ${q[0].toFixed(3)}`).join(', '));
  }
}
