// 종목 검색 PoC: KIS 마스터 파일 전체를 메모리에 올리고 검색 한 번이 얼마나 걸리는지 잰다.
// 실행: node security-search.mjs <마스터 파일 폴더>
//   폴더에는 kospi_code.mst, kosdaq_code.mst, NASMST.COD, NYSMST.COD, AMSMST.COD (KIS 공개 마스터, 압축 해제)
// 의존성 없음. CP949는 Node 내장 TextDecoder('euc-kr')로 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node security-search.mjs <dir>");
const dec = new TextDecoder("euc-kr");

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const choseong = (s) =>
  [...s].map((c) => {
    const k = c.charCodeAt(0) - 0xac00;
    return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : c;
  }).join("");
const norm = (s) => s.toLowerCase().replace(/\s+/g, "");
const isChoseongOnly = (q) => /^[ㄱ-ㅎ]+$/.test(q);

function splitLines(buf) {
  const out = []; let s = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) { out.push(buf.subarray(s, buf[i - 1] === 13 ? i - 1 : i)); s = i + 1; }
  if (s < buf.length) out.push(buf.subarray(s));
  return out;
}
function parseKr(file, exchange, tail) {
  return splitLines(readFileSync(join(dir, file))).filter((l) => l.length > tail + 21).map((l) => {
    const p1 = dec.decode(l.subarray(0, l.length - tail));
    return { market: "KR", exchange, code: p1.slice(0, 9).trim(), name: p1.slice(21).trim(), nameEn: "" };
  }).filter((r) => /^[0-9A-Z]{6}$/.test(r.code));
}
function parseUs(file, exchange) {
  return dec.decode(readFileSync(join(dir, file))).split("\n").map((l) => l.split("\t")).filter((f) => f.length >= 9 && f[4]?.trim())
    .map((f) => ({ market: "US", exchange, code: f[4].trim(), name: f[6].trim(), nameEn: f[7].trim() }));
}

let t0 = performance.now();
const rows = [
  ...parseKr("kospi_code.mst", "KOSPI", 227),
  ...parseKr("kosdaq_code.mst", "KOSDAQ", 221),
  ...parseUs("NASMST.COD", "NASDAQ"), ...parseUs("NYSMST.COD", "NYSE"), ...parseUs("AMSMST.COD", "AMEX"),
];
const parseMs = performance.now() - t0;

// 인덱스: 행마다 검색용 문자열을 미리 만든다(정규화한 이름, 초성, 영문명, 코드).
const heapBefore = process.memoryUsage().heapUsed;
t0 = performance.now();
const idx = rows.map((r) => ({ r, code: r.code.toLowerCase(), name: norm(r.name), cho: choseong(norm(r.name)), en: norm(r.nameEn) }));
const indexMs = performance.now() - t0;
const heapMb = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;

// 보유 종목(가짜): 이 가구가 가진 종목은 맨 위로.
const held = new Set(["005930", "AAPL", "360750"]);

function search(qRaw, limit = 20) {
  const q = norm(qRaw); if (!q) return [];
  const cho = isChoseongOnly(q);
  const hits = [];
  for (const e of idx) {
    let score = -1;
    if (e.code === q) score = 100;
    else if (e.code.startsWith(q)) score = 80;
    else if (cho ? e.cho.startsWith(q) : e.name.startsWith(q)) score = 70;
    else if (e.en.startsWith(q)) score = 60;
    else if (cho ? e.cho.includes(q) : e.name.includes(q)) score = 50;
    else if (q.length >= 2 && e.en.includes(q)) score = 40;
    if (score < 0) continue;
    if (held.has(e.r.code)) score += 1000;
    hits.push({ score, e });
  }
  hits.sort((a, b) => b.score - a.score || a.e.name.length - b.e.name.length);
  return hits.slice(0, limit).map((h) => h.e.r);
}

const queries = ["삼성", "ㅅㅅㅈㅈ", "005930", "애플", "aapl", "apple", "tiger", "ㅋ", "a", "카카오", "엔비디아", "ㅌㅇㄱ", "s&p", "kodex200", "삼성전자우"];
const show = (q) => console.log(`  "${q}" → ${search(q, 5).map((r) => `${r.name}(${r.code})`).join(", ")}`);

console.log(`종목 수: ${rows.length} (KR ${rows.filter((r) => r.market === "KR").length}, US ${rows.filter((r) => r.market === "US").length})`);
console.log(`파싱 ${parseMs.toFixed(0)}ms, 인덱스 ${indexMs.toFixed(0)}ms, 인덱스 힙 약 ${heapMb.toFixed(1)}MB`);
console.log("예시(보유 가정: 005930·AAPL·360750):"); queries.forEach(show);

// 지연: 쿼리마다 1,000번 반복해 평균과 p99
for (let i = 0; i < 200; i++) queries.forEach((q) => search(q));
const times = [];
for (let i = 0; i < 1000; i++) for (const q of queries) { const s = performance.now(); search(q); times.push(performance.now() - s); }
times.sort((a, b) => a - b);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
console.log(`검색 1회: 평균 ${avg.toFixed(2)}ms, p50 ${times[times.length >> 1].toFixed(2)}ms, p99 ${times[Math.floor(times.length * 0.99)].toFixed(2)}ms, 최대 ${times.at(-1).toFixed(2)}ms (${times.length}회)`);
