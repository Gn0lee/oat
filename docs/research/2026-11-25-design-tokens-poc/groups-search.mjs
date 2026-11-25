// 저채도 카테고리 다섯 색을 찾는다: 예약 색상각(빨강 0~45°, Pine 초록 125~185°, 파랑 230~285°)을 피하고,
// 정상·protan·deutan 세 시야에서 가장 가까운 두 색 거리(OKLab)의 최솟값을 최대화(무작위 탐색, 시드 고정).
// 실행: node groups-search.mjs
import { oklchToHex } from './groups-v2.mjs';
import { ratio } from './lib.mjs';
const toLin = (hex) => hex.replace('#', '').match(/../g).map((h) => { const v = parseInt(h, 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
const oklab = ([r, g, b]) => { const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; };
const M = [null, [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]], [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]]];
const sim = (lin, m) => (m ? m.map((r) => Math.min(1, Math.max(0, r[0] * lin[0] + r[1] * lin[1] + r[2] * lin[2]))) : lin);
const score = (hex) => Math.min(...M.map((m) => { const p = hex.map((h) => oklab(sim(toLin(h), m))); let d = 9;
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) d = Math.min(d, Math.hypot(...p[i].map((v, k) => v - p[j][k]))); return d; }));
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ranges = [[45, 125], [185, 230], [285, 345]];
const hue = () => { const r = ranges[Math.floor(rnd() * 3)]; return r[0] + rnd() * (r[1] - r[0]); };
for (const [mode, Lr, card] of [['light', [0.42, 0.86], '#FFFFFF'], ['dark', [0.55, 0.9], '#1C1F1E']]) {
  let best = null;
  for (let t = 0; t < 60000; t++) {
    const spec = Array.from({ length: 5 }, () => [Lr[0] + rnd() * (Lr[1] - Lr[0]), 0.04 + rnd() * 0.08, hue()]);
    const hex = spec.map((s) => oklchToHex(...s)); const sc = score(hex);
    if (!best || sc > best.sc) best = { sc, hex, spec };
  }
  console.log(mode, best.hex.join(' '), '최소거리', best.sc.toFixed(3));
  console.log('  L C h', best.spec.map((s) => s.map((v, i) => v.toFixed(i === 2 ? 0 : 2)).join('/')).join('  '));
  console.log('  카드와', best.hex.map((c) => ratio(c, card).toFixed(2)).join(' '));
}
