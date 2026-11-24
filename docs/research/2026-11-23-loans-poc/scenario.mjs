// 빌려준 돈·빌린 돈 시나리오 계산기 (DB 없음)
// 실행: node docs/research/2026-11-23-loans-poc/scenario.mjs
// 결정(빌려준 돈·빌린 돈 티켓)을 기존 규칙과 함께 돌려서 숫자가 겹치거나 빠지지 않는지 확인한다.
// - 다리 합 0 = 이체(수입·지출 아님), 0이 아니면 줄(수입 +, 지출 −)
// - 확정 정산은 원 기록의 달 지출을 줄인다(ADR 0006), 예상 정산은 다리 없음
// - 묶음: spendable·saving·investment·points·lent(새)·liability
// - 갚은 원금 = 대출·빌린 돈 지갑의 + 다리 중, 같은 기록에서 부채가 아닌 지갑에서 나간 금액까지만(잔액 맞춤 제외)
// - 받을 돈 카드 = 예상 정산·혜택만, 빌려준 돈은 기한 지나면 "확인할 것"
// v2: Fable 리뷰 반영(갚은 원금 정의, 다시 빌려줄 때 갚기로 한 날 비움, 음수 잔액·보관 지갑은 할 일 아님,
//     섞인 결제의 "남의 몫", 빌린 돈 지갑에서 지출, 다리 없는 지갑은 "다 받음"으로 세지 않음)

import assert from 'node:assert/strict';

const wallets = {
  bank:   { name: '우리은행', kind: 'bank', group: 'spendable', hidden: false },
  card:   { name: '신한카드(25일)', kind: 'credit_card', group: 'liability', hidden: false },
  loan:   { name: '전세대출', kind: 'loan', group: 'liability', hidden: false },
  chulsu: { name: '철수', kind: 'lent', group: 'lent', hidden: false, dueDate: '2026-05-31' },
  younghee: { name: '영희', kind: 'lent', group: 'lent', hidden: true, dueDate: '2026-04-30' },
  jisu:   { name: '지수', kind: 'lent', group: 'lent', hidden: false },
  minsu:  { name: '민수', kind: 'lent', group: 'lent', hidden: false, dueDate: '2026-03-31' },
  gone:   { name: '보관된 대여', kind: 'lent', group: 'lent', hidden: false, dueDate: '2026-02-01', archived: true },
  empty:  { name: '만들다 만 지갑', kind: 'lent', group: 'lent', hidden: false },
  mom:    { name: '엄마', kind: 'borrowed', group: 'liability', hidden: false, dueDate: '2026-12-31' },
};
const LIABILITY_KINDS = new Set(['credit_card', 'loan', 'borrowed']);
const isLiability = (w) => LIABILITY_KINDS.has(wallets[w].kind);
for (const w of Object.values(wallets)) {
  // CHECK: 부채 kind는 liability, lent kind는 lent만, 다른 kind는 lent 불가
  if (LIABILITY_KINDS.has(w.kind)) assert.equal(w.group, 'liability');
  assert.equal(w.kind === 'lent', w.group === 'lent');
}

const M = 10_000; // 만 원
let seq = 0;
const records = [];
const sum = (a) => a.reduce((s, x) => s + x, 0);
function balance(wid, until) {
  return sum(records.filter((r) => (r.confirmDate ?? r.date) <= until).flatMap((r) => r.legs).filter(([w]) => w === wid).map(([, a]) => a));
}
const rec = (r) => {
  const x = { id: ++seq, status: 'confirmed', legs: [], lines: [], ...r };
  // 서버 규칙: 잔액 0인 빌려준 돈·빌린 돈 지갑에 다시 잔액이 생기는 기록이면, 요청에 새 날짜가 없는 한 갚기로 한 날을 비운다
  for (const [w] of x.legs) {
    const wal = wallets[w];
    if ((wal.kind === 'lent' || wal.kind === 'borrowed') && balance(w, x.date) === 0 && records.some((p) => p.legs.some(([pw]) => pw === w))) {
      wal.dueDate = x.newDueDate?.[w] ?? null;
    }
  }
  records.push(x);
  return x;
};

// 기존 잔액
rec({ date: '2026-02-28', kind: 'balance_adjustment', legs: [['bank', 500 * M], ['loan', -5000 * M], ['gone', 10 * M], ['bank', -10 * M]] });

// --- 3월
rec({ date: '2026-03-25', kind: 'general', title: '급여', legs: [['bank', 300 * M]], lines: [{ amt: 300 * M, cat: '급여' }] });
const dinner = rec({ date: '2026-03-07', kind: 'general', title: '저녁(더치페이)', legs: [['card', -4 * M]], lines: [{ amt: -4 * M, cat: '식비' }] });
const settleExp = rec({ date: '2026-03-07', kind: 'settlement', counterparty: '민지', legs: [], lines: [{ amt: 2 * M, cat: '식비', role: 'settlement', origin: dinner.id }] });
rec({ date: '2026-03-10', kind: 'general', title: '철수에게 빌려줌', legs: [['bank', -100 * M], ['chulsu', 100 * M]] });
rec({ date: '2026-03-12', kind: 'general', title: '영희 물건 대신 결제(지출 퍼널, 전부 남의 몫)', legs: [['card', -5 * M], ['younghee', 5 * M]] });
rec({ date: '2026-03-13', kind: 'general', title: '내 것 3만 + 지수 것 5만 한 번에 결제(남의 몫)', legs: [['card', -8 * M], ['jisu', 5 * M]], lines: [{ amt: -3 * M, cat: '쇼핑' }] });
rec({ date: '2026-03-15', kind: 'general', title: '엄마에게 빌림', legs: [['mom', -300 * M], ['bank', 300 * M]] });
rec({ date: '2026-03-20', kind: 'general', title: '전세대출 상환', legs: [['bank', -51 * M], ['loan', 50 * M]], lines: [{ amt: -1 * M, cat: '이자' }] });
rec({ date: '2026-03-01', kind: 'general', title: '민수에게 빌려줌(3/31까지)', legs: [['bank', -10 * M], ['minsu', 10 * M]] });
rec({ date: '2026-03-20', kind: 'general', title: '민수가 다 갚음', legs: [['bank', 10 * M], ['minsu', -10 * M]] });

// --- 4월
rec({ date: '2026-04-05', kind: 'general', title: '철수가 갚음(이자 포함)', legs: [['bank', 51 * M], ['chulsu', -50 * M]], lines: [{ amt: 1 * M, cat: '이자' }] });
rec({ date: '2026-04-10', kind: 'general', title: '엄마에게 갚음', legs: [['bank', -100 * M], ['mom', 100 * M]] });
// 민지 정산 확정: 예상 → 확정(다리 생김). 원 기록(3월)의 식비를 줄인다
Object.assign(settleExp, { confirmDate: '2026-04-11', legs: [['bank', 2 * M]] });
rec({ date: '2026-04-12', kind: 'general', title: '영희가 갚음', legs: [['bank', 5 * M], ['younghee', -5 * M]] });
rec({ date: '2026-04-20', kind: 'general', title: '엄마가 내 병원비를 대신 냄(빌린 돈 지갑에서 지출)', legs: [['mom', -5 * M]], lines: [{ amt: -5 * M, cat: '의료' }] });

// --- 6월 (철수 기한 5/31 지남 → 6/1 확인할 것)
const TODO_CHECK_DATE = '2026-06-01';
rec({ date: '2026-06-10', kind: 'general', title: '철수 30만 안 받기로(탕감)', legs: [['chulsu', -30 * M]], lines: [{ amt: -30 * M, cat: '못 받은 돈' }] });
rec({ date: '2026-06-15', kind: 'general', title: '엄마: 50만 안 갚아도 돼(탕감받음)', legs: [['mom', 50 * M]], lines: [{ amt: 50 * M, cat: '갚지 않아도 된 돈' }] });
rec({ date: '2026-06-20', kind: 'general', title: '엄마 돈으로 전세대출 갚음(빚 갈아타기)', legs: [['mom', -100 * M], ['loan', 100 * M]] });
rec({ date: '2026-06-25', kind: 'general', title: '엄마에게 100만 갚으며 50만 탕감받음(한 기록)', legs: [['bank', -100 * M], ['mom', 150 * M]], lines: [{ amt: 50 * M, cat: '갚지 않아도 된 돈' }] });

// --- 7월: 영희·민수에게 다시 빌려줌(옛 갚기로 한 날은 비워짐), 영희는 더 많이 받고 이자 스위치를 끔
rec({ date: '2026-07-01', kind: 'general', title: '영희에게 또 빌려줌(새 날짜 7/5)', legs: [['bank', -10 * M], ['younghee', 10 * M]], newDueDate: { younghee: '2026-07-05' } });
rec({ date: '2026-07-01', kind: 'general', title: '민수에게 또 빌려줌(날짜 없음)', legs: [['bank', -10 * M], ['minsu', 10 * M]] });
const yhBeforeOverpay = balance('younghee', '2026-07-19');
rec({ date: '2026-07-20', kind: 'general', title: '영희가 12만 보냄(이자로 적지 않음)', legs: [['bank', 12 * M], ['younghee', -12 * M]] });

// ---------- 계산
const month = (d) => d.slice(0, 7);
const legSum = (r) => sum(r.legs.map(([, a]) => a));
const lineSum = (r) => sum(r.lines.map((l) => l.amt));
for (const r of records) if (r.kind !== 'balance_adjustment' && (r.confirmDate || r.kind !== 'settlement')) assert.equal(lineSum(r), legSum(r), `줄 합 = 다리 합: ${r.title ?? r.kind}`);

function repaidPrincipal(r) {
  // 부채(대출·빌린 돈) 지갑의 + 다리 중, 같은 기록에서 부채가 아닌 지갑에서 나간 금액까지만
  const intoDebt = sum(r.legs.filter(([w, a]) => (wallets[w].kind === 'loan' || wallets[w].kind === 'borrowed') && a > 0).map(([, a]) => a));
  const outOfAssets = -sum(r.legs.filter(([w, a]) => !isLiability(w) && a < 0).map(([, a]) => a));
  return Math.min(intoDebt, outOfAssets);
}
function flow(ym) {
  let income = 0, expense = 0, repaid = 0;
  const byId = Object.fromEntries(records.map((r) => [r.id, r]));
  for (const r of records) {
    if (r.kind === 'balance_adjustment') continue;
    if (r.kind === 'settlement' && !r.confirmDate) continue;
    for (const l of r.lines) {
      const m = l.role === 'settlement' ? month(byId[l.origin].date) : month(r.date);
      if (m !== ym) continue;
      if (l.role === 'settlement') expense += l.amt;
      else if (l.amt > 0) income += l.amt; else expense += l.amt;
    }
    if (month(r.date) === ym) repaid += repaidPrincipal(r);
  }
  return { income, expense: -expense || 0, left: income + expense, repaidPrincipal: repaid };
}
function groups(until) {
  const g = {};
  for (const [id, w] of Object.entries(wallets)) if (!w.archived) g[w.group] = (g[w.group] ?? 0) + balance(id, until);
  return g;
}
const netWorth = (until) => sum(Object.keys(wallets).map((id) => balance(id, until)));
function receivableCard(today) {
  return records.filter((r) => r.kind === 'settlement' && r.date <= today && !(r.confirmDate <= today)).map((r) => ({ who: r.counterparty, amt: lineSum(r) }));
}
function todos(today) {
  // 갚기로 한 날이 지났고, 보관되지 않았고, 아직 갚을 쪽으로 잔액이 남은 지갑(빌려준 돈 > 0, 빌린 돈 < 0). 키 = 지갑 + 날짜
  return Object.entries(wallets)
    .filter(([id, w]) => w.dueDate && w.dueDate < today && !w.archived)
    .filter(([id, w]) => (w.kind === 'lent' ? balance(id, today) > 0 : balance(id, today) < 0))
    .map(([id, w]) => ({ key: `loan_due:${id}:${w.dueDate}`, lockscreen: w.hidden ? '할 일 1건' : `${w.name} · 갚기로 한 날이 지났어요` }));
}
function folded(today) {
  // 다리가 있었고 지금 잔액 0인 지갑만 "다 받음/다 갚음"
  return Object.entries(wallets)
    .filter(([id, w]) => (w.kind === 'lent' || w.kind === 'borrowed') && !w.archived)
    .filter(([id]) => records.some((r) => r.date <= today && r.legs.some(([w]) => w === id)) && balance(id, today) === 0)
    .map(([, w]) => w.name);
}

// ---------- 출력
const fmt = (n) => (n / M).toLocaleString('ko-KR') + '만';
const months = ['2026-03', '2026-04', '2026-06', '2026-07'];
const ends = { '2026-03': '2026-03-31', '2026-04': '2026-04-30', '2026-06': '2026-06-30', '2026-07': '2026-07-31' };
const out = [];
for (const ym of months) {
  const f = flow(ym), g = groups(ends[ym]);
  out.push(`## ${ym}\n흐름: 수입 ${fmt(f.income)} · 지출 ${fmt(f.expense)} · 남은 돈 ${fmt(f.left)} · 갚은 원금 ${fmt(f.repaidPrincipal)}`);
  out.push(`묶음(월말): ${Object.entries(g).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ')} · 순자산 ${fmt(netWorth(ends[ym]))}`);
}
out.push(`\n받을 돈 카드(2026-03-31): ${JSON.stringify(receivableCard('2026-03-31'))}`);
out.push(`받을 돈 카드(2026-04-30): ${JSON.stringify(receivableCard('2026-04-30'))}`);
out.push(`확인할 것(${TODO_CHECK_DATE}): ${JSON.stringify(todos(TODO_CHECK_DATE))}`);
out.push(`확인할 것(2026-07-10): ${JSON.stringify(todos('2026-07-10'))}`);
out.push(`확인할 것(2026-07-31): ${JSON.stringify(todos('2026-07-31'))}`);
out.push(`다 받음/다 갚음 접힘(2026-04-30): ${JSON.stringify(folded('2026-04-30'))}`);
out.push(`초과 상환: 영희 잔액 ${fmt(yhBeforeOverpay)}에 12만 받음 → 확인 화면 "빌려준 돈보다 ${fmt(12 * M - yhBeforeOverpay)} 많아요. 차액을 이자로 적을까요?" (이 시나리오는 끄고 저장 → 잔액 ${fmt(balance('younghee', '2026-07-31'))})`);
console.log(out.join('\n'));

// ---------- 확인
// 1. 빌려주기·돌려받기 원금은 수입·지출에 없다. 섞인 결제는 내 몫 3만만 지출
//    (3월 지출 = 식비 4만 − 정산 2만 + 대출 이자 1만 + 쇼핑 3만)
assert.deepEqual(flow('2026-03'), { income: 300 * M, expense: 6 * M, left: 294 * M, repaidPrincipal: 50 * M });
// 2. 4월: 이자 수입 1만, 엄마가 대신 낸 병원비 5만은 지출, 엄마에게 갚은 100만은 갚은 원금
assert.deepEqual(flow('2026-04'), { income: 1 * M, expense: 5 * M, left: -4 * M, repaidPrincipal: 100 * M });
// 3. 탕감은 그날 지출/수입. 빚 갈아타기(엄마 → 대출)는 갚은 원금 0, 갚으며 일부 탕감은 실제 낸 100만만
assert.deepEqual(flow('2026-06'), { income: 100 * M, expense: 30 * M, left: 70 * M, repaidPrincipal: 100 * M });
// 4. 빌려준 돈 묶음 = 사람별 잔액 합(보관 지갑 제외), 빌린 돈은 갚아야 할 돈
assert.equal(groups('2026-03-31').lent, 110 * M);
assert.equal(groups('2026-06-30').lent, 25 * M);
// 5. 순자산 변화 합 = 남은 돈 합(돈이 새거나 두 번 세지지 않음)
assert.equal(netWorth('2026-07-31') - netWorth('2026-02-28'), sum(months.map((m) => flow(m).left)), '순자산 변화 = 남은 돈 합');
// 6. 받을 돈 카드에 빌려준 돈이 없다
assert.deepEqual(receivableCard('2026-03-31').map((x) => x.who), ['민지']);
assert.equal(receivableCard('2026-04-30').length, 0);
// 7. 기한 지난 철수만 할 일. 다 갚은 민수·영희, 보관된 지갑은 아님
assert.deepEqual(todos(TODO_CHECK_DATE).map((t) => t.key), ['loan_due:chulsu:2026-05-31']);
// 8. 다 받은 민수·영희는 접히고, 다리 없는 지갑은 "다 받음"이 아님. 7월에 다시 빌려주면 펼쳐짐
assert.deepEqual(folded('2026-04-30').sort(), ['민수', '영희']);
assert.ok(!folded('2026-07-31').includes('민수'));
// 9. 숨긴 지갑(영희)의 할 일은 잠금화면에 건수만, 새 날짜로 다시 알림
assert.equal(todos('2026-07-10').find((t) => t.key === 'loan_due:younghee:2026-07-05')?.lockscreen, '할 일 1건');
// 10. 다 갚은 민수에게 날짜 없이 다시 빌려주면 옛 3/31은 비워져 할 일이 아님
assert.equal(wallets.minsu.dueDate, null);
assert.ok(!todos('2026-07-10').some((t) => t.key.startsWith('loan_due:minsu')));
// 11. 초과 상환으로 음수가 된 영희는 기한이 지나도 할 일이 아님
assert.equal(balance('younghee', '2026-07-31'), -2 * M);
assert.ok(!todos('2026-07-31').some((t) => t.key.startsWith('loan_due:younghee')));
console.log('\n✅ 확인 11개 통과');
