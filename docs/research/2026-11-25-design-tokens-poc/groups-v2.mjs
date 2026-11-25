// 질문 7 다시: 회색 안이 구분 안 된다는 피드백 뒤, 사례 조사 후보를 비교한다.
// 각 안의 묶음 다섯 색에 대해: 카드와 대비, 이웃 대비, 정상·적록색약(protan/deutan) 시야에서 가장 가까운 두 색의 OKLab 거리.
// 실행: node groups-v2.mjs  (결과는 visual 시안에 씀)
import { ratio } from './lib.mjs';
export const oklchToHex = (L, C, h) => {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return '#' + rgb.map((v) => { v = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0'); }).join('').toUpperCase();
};
const toLin = (hex) => hex.replace('#', '').match(/../g).map((h) => { const v = parseInt(h, 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
const oklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
// Machado 2009, severity 1.0 (선형 RGB에 적용)
const CVD = { protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]] };
const sim = (lin, M) => M.map((row) => Math.min(1, Math.max(0, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])));
const minDist = (hexes, M) => { const p = hexes.map((h) => oklab(M ? sim(toLin(h), M) : toLin(h))); let d = 9;
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) d = Math.min(d, Math.hypot(...p[i].map((v, k) => v - p[j][k]))); return d; };
const spec = {
  light: {
    '회색 5단계(앞 시안)': [[0.32, 0.006, 160], [0.45, 0.006, 160], [0.58, 0.006, 160], [0.71, 0.006, 160], [0.84, 0.006, 160]],
    '보라 한 색 단계': [[0.36, 0.10, 295], [0.48, 0.12, 295], [0.60, 0.11, 295], [0.72, 0.08, 295], [0.84, 0.05, 295]],
    '황토(귀리) 한 색 단계': [[0.42, 0.07, 70], [0.54, 0.09, 75], [0.66, 0.10, 80], [0.78, 0.09, 85], [0.88, 0.06, 88]],
    '저채도 카테고리': [[0.45, 0.10, 300], [0.70, 0.10, 85], [0.58, 0.07, 200], [0.80, 0.06, 330], [0.52, 0.06, 55]],
  },
  dark: {
    '보라 한 색 단계': [[0.88, 0.05, 295], [0.77, 0.08, 295], [0.66, 0.11, 295], [0.55, 0.12, 295], [0.44, 0.10, 295]],
    '저채도 카테고리': [[0.66, 0.11, 300], [0.82, 0.10, 85], [0.72, 0.08, 200], [0.86, 0.05, 330], [0.62, 0.07, 55]],
  },
};
export const palettes = {};
const card = { light: '#FFFFFF', dark: '#1C1F1E' };
for (const mode of Object.keys(spec)) for (const [name, list] of Object.entries(spec[mode])) {
  const hex = list.map((x) => oklchToHex(...x)); palettes[`${mode}:${name}`] = hex;
  if (process.argv[1].endsWith('groups-v2.mjs')) console.log(`${mode} ${name}\n  ${hex.join(' ')}\n  카드와 ${hex.map((c) => ratio(c, card[mode]).toFixed(2)).join(' ')}` +
    `\n  가장 가까운 두 색 거리 정상 ${minDist(hex).toFixed(3)} · protan ${minDist(hex, CVD.protan).toFixed(3)} · deutan ${minDist(hex, CVD.deutan).toFixed(3)}`);
}
