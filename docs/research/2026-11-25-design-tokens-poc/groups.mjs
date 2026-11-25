// 질문 7: 묶음 색 여섯 개(무채색 계열). OKLCH 밝기를 고르게 나눠 만들고 이웃끼리·카드와의 대비를 잰다.
// 실행: node groups.mjs
import { ratio } from './lib.mjs';
const oklchToHex = (L, C, h) => {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return '#' + rgb.map((v) => { v = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0'); }).join('').toUpperCase();
};
export const ramps = {
  light: { neutral: [0.32, 0.45, 0.58, 0.71, 0.84].map((L) => oklchToHex(L, 0.006, 160)), oat: [0.32, 0.45, 0.58, 0.71, 0.84].map((L) => oklchToHex(L, 0.025, 75)) },
  dark: { neutral: [0.90, 0.77, 0.64, 0.51, 0.40].map((L) => oklchToHex(L, 0.006, 160)), oat: [0.90, 0.77, 0.64, 0.51, 0.40].map((L) => oklchToHex(L, 0.025, 75)) },
};
const card = { light: '#FFFFFF', dark: '#1C1F1E' };
for (const mode of ['light', 'dark']) for (const [k, r] of Object.entries(ramps[mode])) {
  console.log(`\n== ${mode} ${k} ==`, r.join(' '));
  console.log(' 카드와:', r.map((c) => ratio(c, card[mode]).toFixed(2)).join(' '));
  console.log(' 이웃끼리:', r.slice(1).map((c, i) => ratio(c, r[i]).toFixed(2)).join(' '));
}
