// DESIGN.md에서 뽑은 tokens.dtcg.json으로 글자·면 쌍의 대비를 모두 검사한다.
// 다시 뽑기: npx @google/design.md@0.4.0 export --format dtcg ../../design/DESIGN.md > tokens.dtcg.json
// 실행: node check-tokens.mjs  (기준 미달이면 종료 코드 1)
import { readFileSync } from 'node:fs';
import { ratio } from './lib.mjs';
const t = JSON.parse(readFileSync(new URL('./tokens.dtcg.json', import.meta.url)));
const hex = (v) => '#' + v.$value.components.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
const need = [
  // [글자/표시 토큰, 면 토큰들, 기준]
  ['text', ['background', 'surface', 'surface-alt'], 4.5],
  ['text-sub', ['background', 'surface', 'surface-alt'], 4.5],
  ['primary-text', ['background', 'surface', 'surface-alt', 'primary-soft'], 4.5],
  ['on-primary', ['primary', 'primary-pressed'], 4.5],
  ['amount-income', ['background', 'surface', 'surface-alt'], 4.5],
  ['amount-up', ['background', 'surface', 'surface-alt'], 4.5],
  ['amount-down', ['background', 'surface', 'surface-alt'], 4.5],
  ['amount-up-display', ['background', 'surface', 'surface-alt'], 3],
  ['amount-down-display', ['background', 'surface', 'surface-alt'], 3],
  ['danger', ['background', 'surface', 'surface-alt'], 4.5],
  ['ledger-private', ['background', 'surface', 'ledger-private-soft'], 4.5],
  ['border-strong', ['background', 'surface'], 3],
  ['primary', ['surface'], 3],
  ['chart-line', ['surface'], 3],
  ['chart-axis', ['surface'], 3],
];
let fail = 0;
for (const mode of ['light', 'dark']) {
  const c = Object.fromEntries(Object.entries(t.color).filter(([k]) => k.startsWith(mode + '.')).map(([k, v]) => [k.slice(mode.length + 1), hex(v)]));
  console.log(`\n== ${mode} ==`);
  for (const [fg, bgs, min] of need) {
    const rs = bgs.map((b) => [b, ratio(c[fg], c[b])]); const bad = rs.filter(([, r]) => r < min);
    if (bad.length) fail++;
    console.log(`${bad.length ? '✗' : '✓'} ${fg} (≥${min}) ` + rs.map(([b, r]) => `${b} ${r.toFixed(2)}`).join(' · '));
  }
}
process.exit(fail ? 1 : 0);
