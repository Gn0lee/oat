// 빌려준 돈·빌린 돈 시나리오 계산기 (DB 없음)
// 실행: node docs/research/2026-11-23-loans-poc/scenario.mjs
// 결정(빌려준 돈·빌린 돈 티켓)을 기존 규칙과 함께 돌려서 숫자가 겹치거나 빠지지 않는지 확인한다.
// - 다리 합 0 = 이체(수입·지출 아님), 0이 아니면 줄(수입 +, 지출 −)
// - 확정 정산은 원 기록의 달 지출을 줄인다(ADR 0006), 예상 정산은 다리 없음
// - 묶음: spendable·saving·investment·points·lent(새)·liability
// - 갚은 원금 = 대출·빌린 돈 지갑에 들어간 + 다리(잔액 맞춤 제외)
// - 받을 돈 카드 = 예상 정산·혜택만, 빌려준 돈은 기한 지나면 "확인할 것"

import assert from 'node:assert/strict';

const wallets = {
  bank:   { name: '우리은행', kind: 'bank', group: 'spendable', hidden: false },
  card:   { name: '신한카드(25일)', kind: 'credit_card', group: 'liability', hidden: false },
  loan:   { name: '전세대출', kind: 'loan', group: 'liability', hidden: false },
  chulsu: { name: '철수', kind: 'lent', group: 'lent', hidden: false, dueDate: '2026-05-31' },
  younghee: { name: '영희', kind: 'lent', group: 'lent', hidden: true, dueDate: '2026-07-05' },
  mom:    { name: '엄마', kind: 'borrowed', group: 'liability', hidden: false, dueDate: '2026-12-31' },
};
const LIABILITY_KINDS = new Set(['credit_card', 'loan', 'borrowed']);
for (const w of Object.values(wallets)) {
  // CHECK: 부채 kind는 liability, lent kind는 lent만, 다른 kind는 lent 불가
  if (LIABILITY_KINDS.has(w.kind)) assert.equal(w.group, 'liability');
  assert.equal(w.kind === 'lent', w.group === 'lent');
}

const M = 10_000; // 만 원
let seq = 0;
const records = [];
const rec = (r) => { const x = { id: ++seq, status: 'confirmed', legs: [], lines: [], ...r }; records.push(x); return x; };

// 기존 잔액
rec({ date: '2026-02-28', kind: 'balance_adjustment', legs: [['bank', 500 * M], ['loan', -5000 * M]], lines: [] });

// --- 3월
rec({ date: '2026-03-25', kind: 'general', title: '급여', legs: [['bank', 300 * M]], lines: [{ amt: 300 * M, cat: '급여' }] });
const dinner = rec({ date: '2026-03-07', kind: 'general', title: '저녁(더치페이)', legs: [['card', -4 * M]], lines: [{ amt: -4 * M, cat: '식비' }] });
const settleExp = rec({ date: '2026-03-07', kind: 'settlement', counterparty: '민지', legs: [], lines: [{ amt: 2 * M, cat: '식비', role: 'settlement', origin: dinner.id }] });
rec({ date: '2026-03-10', kind: 'general', title: '철수에게 빌려줌', legs: [['bank', -100 * M], ['chulsu', 100 * M]] });
rec({ date: '2026-03-12', kind: 'general', title: '영희 물건 대신 결제(Q6)', legs: [['card', -5 * M], ['younghee', 5 * M]] });
rec({ date: '2026-03-15', kind: 'general', title: '엄마에게 빌림', legs: [['mom', -300 * M], ['bank', 300 * M]] });
rec({ date: '2026-03-20', kind: 'general', title: '전세대출 상환', legs: [['bank', -51 * M], ['loan', 50 * M]], lines: [{ amt: -1 * M, cat: '이자' }] });

// --- 4월
rec({ date: '2026-04-05', kind: 'general', title: '철수가 갚음(이자 포함)', legs: [['bank', 51 * M], ['chulsu', -50 * M]], lines: [{ amt: 1 * M, cat: '이자' }] });
rec({ date: '2026-04-10', kind: 'general', title: '엄마에게 갚음', legs: [['bank', -100 * M], ['mom', 100 * M]] });
// 민지 정산 확정: 예상 → 확정(다리 생김). 원 기록(3월)의 식비를 줄인다
Object.assign(settleExp, { confirmDate: '2026-04-11', legs: [['bank', 2 * M]] });
rec({ date: '2026-04-12', kind: 'general', title: '영희가 갚음', legs: [['bank', 5 * M], ['younghee', -5 * M]] });

// --- 6월 (철수 기한 5/31 지남 → 6/1 확인할 것)
const TODO_CHECK_DATE = '2026-06-01';
rec({ date: '2026-06-10', kind: 'general', title: '철수 30만 안 받기로(탕감)', legs: [['chulsu', -30 * M]], lines: [{ amt: -30 * M, cat: '못 받은 돈' }] });
rec({ date: '2026-06-15', kind: 'general', title: '엄마: 50만 안 갚아도 돼(탕감받음)', legs: [['mom', 50 * M]], lines: [{ amt: 50 * M, cat: '갚지 않아도 된 돈' }] });

// --- 7월: 영희에게 또 빌려주고 더 많이 받음(Q11)
rec({ date: '2026-07-01', kind: 'general', title: '영희에게 또 빌려줌', legs: [['bank', -10 * M], ['younghee', 10 * M]] });
const overpay = { date: '2026-07-20', legs: [['bank', 12 * M], ['younghee', -12 * M]] };

// ---------- 계산
const month = (d) => d.slice(0, 7);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const legSum = (r) => sum(r.legs.map(([, a]) => a));
const lineSum = (r) => sum(r.lines.map((l) => l.amt));
for (const r of records) if (r.status === 'confirmed' && r.kind !== 'balance_adjustment') assert.equal(lineSum(r), legSum(r), `줄 합 = 다리 합: ${r.title ?? r.kind}`);

function balance(wid, until) {
  return sum(records.filter((r) => (r.confirmDate ?? r.date) <= until).flatMap((r) => r.legs).filter(([w]) => w === wid).map(([, a]) => a));
}
function flow(ym) {
  let income = 0, expense = 0;
  const byId = Object.fromEntries(records.map((r) => [r.id, r]));
  for (const r of records) {
    if (r.status !== 'confirmed' || r.kind === 'balance_adjustment') continue;
    for (const l of r.lines) {
      // 돌려받은 돈은 원 기록의 달 지출을 줄인다
      const m = l.role === 'settlement' ? month(byId[l.origin].date) : month(r.date);
      if (m !== ym) continue;
      if (l.role === 'settlement') expense += l.amt; // 지출(−)을 줄임
      else if (l.amt > 0) income += l.amt; else expense += l.amt;
    }
  }
  const repaid = sum(records.filter((r) => r.status === 'confirmed' && r.kind !== 'balance_adjustment' && month(r.date) === ym)
    .flatMap((r) => r.legs.map(([w, a]) => ({ w, a, r })))
    // 발견: 탕감받음도 빌린 돈 지갑에 + 다리를 만든다. 갚은 원금은 "다른 지갑에서 돈이 나간" 기록만 세야 한다
    // → 규칙: 다리가 그 지갑 하나뿐인 기록(탕감받음)은 뺀다
    .filter(({ w, a, r }) => (wallets[w].kind === 'loan' || wallets[w].kind === 'borrowed') && a > 0 && r.legs.length > 1)
    .map(({ a }) => a));
  return { income, expense: -expense || 0, left: income + expense, repaidPrincipal: repaid };
}
function groups(until) {
  const g = {};
  for (const [id, w] of Object.entries(wallets)) g[w.group] = (g[w.group] ?? 0) + balance(id, until);
  return g;
}
const netWorth = (until) => sum(Object.keys(wallets).map((id) => balance(id, until)));
function receivableCard(today) {
  // 예상 정산·혜택만(Q8 B)
  return records.filter((r) => r.kind === 'settlement' && r.date <= today && !(r.confirmDate <= today)).map((r) => ({ who: r.counterparty, amt: lineSum(r) }));
}
function todos(today) {
  // 갚기로 한 날이 지났고 잔액이 남은 빌려준 돈·빌린 돈(Q7). 키 = 지갑 + 날짜
  return Object.entries(wallets)
    .filter(([id, w]) => w.dueDate && w.dueDate < today && balance(id, today) !== 0)
    .map(([id, w]) => ({ key: `loan_due:${id}:${w.dueDate}`, text: `${w.name} · 갚기로 한 날이 지났어요`, lockscreen: w.hidden ? '할 일 1건' : `${w.name} · 갚기로 한 날이 지났어요` }));
}
function folded(today) {
  return Object.entries(wallets).filter(([id, w]) => (w.kind === 'lent' || w.kind === 'borrowed') && balance(id, today) === 0).map(([, w]) => w.name);
}

// ---------- 출력과 확인
const fmt = (n) => (n / M).toLocaleString('ko-KR') + '만';
const months = ['2026-03', '2026-04', '2026-06', '2026-07'];
const ends = { '2026-03': '2026-03-31', '2026-04': '2026-04-30', '2026-06': '2026-06-30', '2026-07': '2026-07-10' };
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
out.push(`다 받음/다 갚음 접힘(2026-04-30): ${JSON.stringify(folded('2026-04-30'))}`);
const yhBefore = balance('younghee', '2026-07-19');
out.push(`초과 상환: 영희 잔액 ${fmt(yhBefore)}에 ${fmt(overpay.legs[0][1])} 받음 → 확인 화면 "빌려준 돈보다 ${fmt(overpay.legs[0][1] - yhBefore)} 많아요. 차액을 이자로 적을까요?"`);
console.log(out.join('\n'));

// 1. 빌려주기·돌려받기 원금은 수입·지출에 없다 (3월 지출 = 식비 4만 − 정산 2만 + 대출 이자 1만)
assert.deepEqual(flow('2026-03'), { income: 300 * M, expense: 3 * M, left: 297 * M, repaidPrincipal: 50 * M });
// 2. 4월: 이자 수입 1만만 수입, 엄마에게 갚은 100만은 갚은 원금
assert.deepEqual(flow('2026-04'), { income: 1 * M, expense: 0, left: 1 * M, repaidPrincipal: 100 * M });
// 3. 탕감: 빌려준 쪽은 그날 지출, 빌린 쪽은 그날 수입, 갚은 원금에 안 들어감
assert.deepEqual(flow('2026-06'), { income: 50 * M, expense: 30 * M, left: 20 * M, repaidPrincipal: 0 });
// 4. 빌려준 돈 묶음 = 철수 + 영희, 빌린 돈은 갚아야 할 돈에
assert.equal(groups('2026-03-31').lent, 105 * M);
assert.equal(groups('2026-06-30').lent, 20 * M);
// 5. 순자산 변화 합 = 수입 − 지출 합 (정산 시점 차이는 기간 전체에서 맞음)
const nwDelta = netWorth('2026-07-10') - netWorth('2026-02-28');
const flowTotal = sum(months.map((m) => flow(m).left));
assert.equal(nwDelta, flowTotal, '순자산 변화 = 남은 돈 합');
// 6. 받을 돈 카드에 빌려준 돈이 없다
assert.ok(receivableCard('2026-03-31').every((x) => x.who === '민지'));
assert.equal(receivableCard('2026-04-30').length, 0);
// 7. 기한 지난 철수만 할 일, 숨긴 지갑 문구는 건수만
assert.deepEqual(todos(TODO_CHECK_DATE).map((t) => t.key), ['loan_due:chulsu:2026-05-31']);
// 8. 다 받은 영희는 접힘, 7월에 다시 빌려주면 펼쳐짐
assert.deepEqual(folded('2026-04-30'), ['영희']);
assert.deepEqual(folded('2026-07-10'), []);
// 9. 숨긴 지갑(개인 장부에서 만든 영희)의 할 일은 잠금화면에 건수만
assert.deepEqual(todos('2026-07-10').find((t) => t.key === 'loan_due:younghee:2026-07-05')?.lockscreen, '할 일 1건');
console.log('\n✅ 확인 9개 통과');
