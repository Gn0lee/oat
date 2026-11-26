// 시안 빌드: src/*.html의 /*TOKENS*/·/*BASE*/ 자리에 DESIGN.md 토큰(CSS 변수)과 폰 틀 스타일을 넣어 mockups/*.html로 쓴다.
// 토큰 다시 뽑기: npx @google/design.md@0.4.0 export --format dtcg ../../design/DESIGN.md > tokens.dtcg.json
// 실행: node build.mjs [복사할 폴더]
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const t = JSON.parse(readFileSync(here('./tokens.dtcg.json')));
const vars = (mode) => Object.entries(t.color)
  .filter(([k]) => k.startsWith(mode + '.'))
  .map(([k, v]) => `--o-${k.slice(mode.length + 1)}:${v.$value.hex}`).join(';');
const TOKENS = `.ph{${vars('light')}} .ph.dark{${vars('dark')}}`;
const BASE = readFileSync(here('./base.css'), 'utf8');
mkdirSync(here('./mockups/'), { recursive: true });
const out = process.argv[2];
for (const f of readdirSync(here('./src/')).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(here('./src/' + f), 'utf8').replace('/*TOKENS*/', TOKENS).replace('/*BASE*/', BASE);
  writeFileSync(here('./mockups/' + f), html);
  if (out) copyFileSync(here('./mockups/' + f), `${out}/${f}`);
  console.log('built', f);
}
