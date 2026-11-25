// 숨긴 지갑과 공용 장부 기록: 가구원(배우자)에게 무엇이 새는지 계산 (DB 없음)
// 실행: node docs/research/2026-11-24-hidden-wallets-poc/scenario.mjs
//
// 민호에게 숨긴 지갑이 둘 있다(비상금 카드, 비상금 통장). 공용 장부 기록 몇 건과 개인 장부 기록 몇 건이 닿는다.
// 지수(배우자)가 받는 응답을 안마다 만들고, 지수가 알아낼 수 있는 것을 센다.
//   A 막기          : 숨긴 지갑은 공용 장부 기록에 못 씀(대여 지갑 규칙을 모든 숨긴 지갑으로)
//   B 사람별 한 이름 : 공용 기록의 숨긴 다리를 결제 칸 "민호"로, id·종류·결제수단·카드 칸 없이 (택함, ADR 0031)
//                    v2(Fable 리뷰): 결제수단도 가림, 잔액·종류를 드러내는 공용 기록은 저장 거절
//   C 지갑별 이름    : "민호의 숨긴 지갑 1·2"처럼 지갑마다 다른 가린 이름(또는 가린 id)
//   D 실제 이름      : 지갑 이름·종류를 그대로 보여줌(잔액만 안 보임)

import assert from 'node:assert/strict';

const M = 10_000;
const wallets = {
  living: { name: '생활비 통장', kind: 'bank', owner: '지수', hidden: false },
  famcard: { name: '가족카드', kind: 'credit_card', owner: '지수', hidden: false },
  ecard: { name: '비상금 카드', kind: 'credit_card', owner: '민호', hidden: true },
  ebank: { name: '비상금 통장', kind: 'bank', owner: '민호', hidden: true },
};

// 공용(shared) / 민호 개인(minho) 장부
const records = [
  { id: 1, ledger: 'shared', title: '저녁 외식', legs: [['ecard', -8 * M]], card: { installment: 3 }, pm: '비상금 체크카드' },
  { id: 2, ledger: 'shared', title: '생활비 보탬', legs: [['ebank', -30 * M], ['living', 30 * M]] },
  { id: 3, ledger: 'shared', title: '장보기', legs: [['famcard', -12 * M]] },
  { id: 4, ledger: 'shared', title: '저녁 외식 부분 취소', kind: 'refund', legs: [['ecard', 1 * M]] },
  { id: 5, ledger: 'minho', title: '선물(비밀)', legs: [['ecard', -25 * M]] },
  { id: 6, ledger: 'minho', title: '비상금 이자', legs: [['ebank', 0.3 * M]] },
  { id: 7, ledger: 'minho', title: '시작 잔액', kind: 'balance_adjustment', legs: [['ebank', 500 * M]] },
];

// v2: 공용 장부에서 막는 조합(4.1). 저장 시도 → 거절되어야 함
const BLOCKED_KINDS = new Set(['balance_adjustment', 'expiry', 'fx_exchange', 'trade', 'dividend']);
function validateShared(r) {
  if (r.ledger !== 'shared') return null;
  const hiddenLegs = r.legs.filter(([w]) => wallets[w].hidden);
  if (!hiddenLegs.length) return null;
  if (BLOCKED_KINDS.has(r.kind)) return 'hidden_wallet_not_allowed';
  if (r.kind === 'card_payment' && hiddenLegs.some(([w, a]) => a > 0 && wallets[w].kind === 'credit_card')) return 'hidden_wallet_not_allowed';
  const isTransfer = r.legs.reduce((t, [, a]) => t + a, 0) === 0;
  if (isTransfer && hiddenLegs.length === r.legs.length) return 'hidden_wallet_not_allowed';
  return null;
}
const attempts = [
  { id: 8, ledger: 'shared', title: '비상금 통장 → 비상금 카드 대금', kind: 'card_payment', legs: [['ebank', -5 * M], ['ecard', 5 * M]] },
  { id: 9, ledger: 'shared', title: '비상금 통장 잔액 맞춤', kind: 'balance_adjustment', legs: [['ebank', 3 * M]] },
  { id: 10, ledger: 'shared', title: '생활비 통장 → 비상금 카드 대금', kind: 'card_payment', legs: [['living', -5 * M], ['ecard', 5 * M]] },
];
for (const r of records) assert.equal(validateShared(r), null, `저장된 기록 ${r.id}는 허용 조합이어야 함`);
for (const a of attempts) assert.equal(validateShared(a), 'hidden_wallet_not_allowed', `${a.title}는 거절`);

const canSeeLedger = (viewer, ledger) => ledger === 'shared' || (ledger === 'minho' && viewer === '민호');
const canSeeWallet = (viewer, w) => !wallets[w].hidden || wallets[w].owner === viewer;

// 안 A는 쓰기에서 막는다: 공용 장부 기록이 숨긴 지갑에 닿으면 저장 거절
function validateA(r) {
  if (r.ledger === 'shared' && r.legs.some(([w]) => wallets[w].hidden)) return 'hidden_wallet_in_shared_ledger';
  return null;
}

function legView(option, viewer, w, amount, hiddenIndex) {
  if (canSeeWallet(viewer, w)) return { wallet_id: w, name: wallets[w].name, kind: wallets[w].kind, amount };
  const owner = wallets[w].owner;
  if (option === 'B') return { wallet_id: null, name: owner, kind: null, amount };
  if (option === 'C') return { wallet_id: `masked-${hiddenIndex[w]}`, name: `${owner}의 숨긴 지갑 ${hiddenIndex[w]}`, kind: null, amount };
  if (option === 'D') return { wallet_id: w, name: wallets[w].name, kind: wallets[w].kind, amount };
  throw new Error('unreachable');
}

function responseFor(option, viewer) {
  const hiddenIndex = {};
  let n = 0;
  for (const w of Object.keys(wallets)) if (wallets[w].hidden) hiddenIndex[w] = ++n;
  const out = [];
  for (const r of records) {
    if (option === 'A' && validateA(r)) continue; // 저장되지 않은 기록
    if (!canSeeLedger(viewer, r.ledger)) continue; // 개인 장부 기록 자체가 안 보임(숨긴 지갑에만 닿으면 ADR 0025 합계 줄도 없음)
    const legs = r.legs.map(([w, a]) => legView(option, viewer, w, a, hiddenIndex));
    const touchesHidden = r.legs.some(([w]) => !canSeeWallet(viewer, w));
    // 카드 칸(할부·매입일)은 숨긴 다리의 성질이라 B·C에서는 빼고, D에서는 보여준다
    const card = r.card && (!touchesHidden || option === 'D') ? r.card : undefined;
    const pm = r.pm && (!touchesHidden || option === 'D') ? r.pm : null; // 결제수단은 가리키는 지갑이 보일 때만
    out.push({ id: r.id, title: r.title, legs, payment_method: pm, ...(card ? { card } : {}) });
  }
  return out;
}

function whatJisuLearns(option) {
  const res = responseFor(option, '지수');
  const hiddenLegs = res.flatMap((r) => r.legs).filter((l) => l.wallet_id === null || String(l.wallet_id).startsWith('masked') || wallets[l.wallet_id]?.hidden);
  const ids = new Set(hiddenLegs.map((l) => l.wallet_id ?? 'owner'));
  const kinds = new Set(hiddenLegs.map((l) => l.kind).filter(Boolean));
  const names = new Set(hiddenLegs.filter((l) => l.wallet_id && wallets[l.wallet_id]).map((l) => l.name));
  const privateTitles = res.filter((r) => records.find((x) => x.id === r.id).ledger === 'minho').map((r) => r.title);
  const sharedSpending = res.filter((r) => records.find((x) => x.id === r.id).ledger === 'shared').map((r) => r.title);
  const hasCardFields = res.some((r) => r.card && r.legs.some((l) => hiddenLegs.includes(l)));
  const pmNames = res.map((r) => r.payment_method).filter(Boolean);
  return {
    option,
    publicRecordsKept: sharedSpending.length, // 공용 장부에 남은 기록 수(4건이 다 남아야 공용 통계가 맞음)
    hiddenExistenceVisible: hiddenLegs.length > 0, // 민호에게 숨긴 지갑이 있다는 사실
    distinguishableHiddenWallets: option === 'B' ? (hiddenLegs.length ? '1 이상(몇 개인지 모름)' : 0) : ids.size,
    kindsRevealed: [...kinds],
    namesRevealed: [...names],
    cardFieldsRevealed: hasCardFields,
    paymentMethodsRevealed: pmNames,
    privateRecordsLeaked: privateTitles, // 개인 장부 기록이 새면 안 됨
    hiddenFlowSum: hiddenLegs.reduce((s, l) => s + l.amount, 0), // 공용 기록에 드러난 숨긴 지갑 흐름 합
  };
}

const results = ['A', 'B', 'C', 'D'].map(whatJisuLearns);
for (const r of results) console.log(JSON.stringify(r));

// 확인
const [A, B, C, D] = results;
assert.equal(A.publicRecordsKept, 1, 'A: 숨긴 지갑에 닿은 공용 기록 3건은 공용 장부에 들어갈 수 없다');
for (const r of results) assert.deepEqual(r.privateRecordsLeaked, [], '어느 안이든 개인 장부 기록은 새지 않는다');
assert.equal(B.publicRecordsKept, 4);
assert.equal(B.distinguishableHiddenWallets, '1 이상(몇 개인지 모름)');
assert.deepEqual(B.kindsRevealed, []);
assert.equal(B.cardFieldsRevealed, false);
assert.equal(C.distinguishableHiddenWallets, 2, 'C: 가린 id로 지갑을 묶으면 숨긴 지갑 개수가 보인다');
assert.deepEqual(D.namesRevealed.sort(), ['비상금 카드', '비상금 통장']);
assert.equal(D.cardFieldsRevealed, true);
// 잔액은 어느 안에서도 계산되지 않는다: 공용 기록에 드러난 흐름 합은 실제 잔액과 다르다
const realBalance = (w) => records.flatMap((r) => r.legs).filter(([x]) => x === w).reduce((s, [, a]) => s + a, 0);
assert.notEqual(B.hiddenFlowSum, realBalance('ecard') + realBalance('ebank'));
// 남는 노출(B): 공용 기록에 드러난 숨긴 지갑 흐름 합(-37만)과 "숨긴 지갑이 있다"는 사실
assert.equal(B.hiddenFlowSum, -37 * M);
assert.ok(responseFor('B', '지수').flatMap((r) => r.legs).every((l) => !/숨긴|냄|받음/.test(l.name)), 'B: 다른 가구원 문구에 "숨긴"·"냄"·"받음"이 없다');
assert.deepEqual(B.paymentMethodsRevealed, [], 'B: 숨긴 지갑의 결제수단 이름이 새지 않는다');
assert.deepEqual(D.paymentMethodsRevealed, ['비상금 체크카드']);
console.log('\n확인 16개 통과');
console.log(`실제 숨긴 잔액 합 ${(realBalance('ecard') + realBalance('ebank')) / M}만 / 지수에게 드러난 흐름 합 ${B.hiddenFlowSum / M}만`);
