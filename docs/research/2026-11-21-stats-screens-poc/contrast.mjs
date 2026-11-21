// 통계 화면 구성 PoC: 상승·하락 색 후보의 대비(WCAG 2.x 상대 휘도) 계산.
// 실행: node contrast.mjs
const lum = (hex) => {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const bgs = {
  'light bg #F4F5F3': '#F4F5F3', 'light surface #FFFFFF': '#FFFFFF',
  'dark bg #121413': '#121413', 'dark surface #1C1F1E': '#1C1F1E',
};
const cands = {
  light: { up: ['#F04452', '#E42939', '#D92B3A', '#C81E2D'], down: ['#3182F6', '#1B64DA', '#1957C2'] },
  dark: { up: ['#F04452', '#FF5C66', '#FF6B6B', '#FF7A80', '#FF8A8F'], down: ['#3182F6', '#4795FF', '#5B9DFF', '#6AA8FF', '#7DB4FF'] },
};
for (const mode of ['light', 'dark']) {
  console.log(`\n== ${mode} ==`);
  for (const [kind, list] of Object.entries(cands[mode])) for (const c of list) {
    const row = Object.entries(bgs).filter(([k]) => k.startsWith(mode))
      .map(([k, b]) => { const r = ratio(c, b); return `${k.split(' ')[1]} ${r.toFixed(2)}${r >= 4.5 ? ' AA' : r >= 3 ? ' 큰글자' : ' ✗'}`; });
    console.log(kind.padEnd(4), c, '|', row.join(' | '));
  }
}
