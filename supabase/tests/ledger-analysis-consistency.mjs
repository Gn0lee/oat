// #446: cross-checks the calendar, hub summary and all 7 stats routes on one
// visible transaction set per user and scope, plus the same 404 for hidden
// books. Runs against a local Next dev server wired to a scratch DB seeded with
// ledger-analysis-fixture.sql. Usage (see docs/ledger-books-analysis.md):
//   node supabase/tests/ledger-analysis-consistency.mjs <A 생활비 ID> <B 생활비 ID>
const BASE = process.env.APP_URL ?? "http://localhost:3446";
const AUTH = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54450"}/auth/v1`;
for (const url of [BASE, AUTH]) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error(`local scratch stack only: ${url}`);
  }
}
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const B = (n) => `00000000-0000-4000-8000-0000000000${n}`;
let failures = 0;
const check = (ok, msg) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
};

async function cookieFor(email) {
  const r = await fetch(`${AUTH}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "oat-test-446" }),
  });
  const session = await r.json();
  const value =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const chunks = value.match(/.{1,3180}/g);
  return chunks.length === 1
    ? `sb-localhost-auth-token=${value}`
    : chunks.map((c, i) => `sb-localhost-auth-token.${i}=${c}`).join("; ");
}
async function get(cookie, path) {
  const r = await fetch(`${BASE}${path}`, { headers: { cookie } });
  return { status: r.status, body: await r.json() };
}
const q = (book, extra = "") =>
  `year=2026&month=10${book ? `&book=${book}` : ""}${extra}`;
const sum = (rows, type) =>
  rows.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);

async function verify(email, scopes, hidden, hiddenEntryIds) {
  const cookie = await cookieFor(email);
  const books = (await get(cookie, "/api/ledger-books")).body.data;
  for (const book of scopes) {
    const label = `${email} ${book ? (books.find((b) => b.id === book)?.name ?? book) : "전체"}`;
    const cal = (await get(cookie, `/api/ledger-entries?${q(book)}`)).body.data;
    const ids = new Set(cal.map((e) => e.id));
    check(
      ids.size === cal.length,
      `${label}: 달력 거래 ID 중복 없음 (${cal.length})`,
    );
    check(
      hiddenEntryIds.every((id) => !ids.has(id)),
      `${label}: 타인 개인 거래 미노출`,
    );
    const expense = sum(cal, "expense"),
      income = sum(cal, "income");
    const expenseIds = cal
      .filter((e) => e.type === "expense")
      .map((e) => e.id)
      .sort();

    const hub = (await get(cookie, `/api/ledger-entries/summary?${q(book)}`))
      .body.data;
    const s = (await get(cookie, `/api/ledger/stats/summary?${q(book)}`)).body
      .data;
    check(
      hub.totalExpense === expense && hub.totalIncome === income,
      `${label}: 허브 요약 = 달력 (지출 ${expense}, 수입 ${income})`,
    );
    check(
      s.total.totalExpense === expense && s.total.totalIncome === income,
      `${label}: 분석 summary = 달력`,
    );
    if (!book)
      check(
        s.shared.totalExpense + s.personal.totalExpense === expense,
        `${label}: 공용+내 개인 하위 합계 = 전체`,
      );
    const cat = (await get(cookie, `/api/ledger/stats/by-category?${q(book)}`))
      .body.data;
    check(cat.total === expense, `${label}: 카테고리 합계 = 지출`);
    const catInc = (
      await get(
        cookie,
        `/api/ledger/stats/by-category?${q(book, "&type=income")}`,
      )
    ).body.data;
    check(catInc.total === income, `${label}: 카테고리(수입) 합계 = 수입`);
    const pm = (
      await get(cookie, `/api/ledger/stats/by-payment-method?${q(book)}`)
    ).body.data;
    check(pm.total === expense, `${label}: 결제수단 합계 = 지출`);
    const daily = (await get(cookie, `/api/ledger/stats/daily?${q(book)}`)).body
      .data;
    check(
      daily.items.reduce((t, d) => t + d.totalExpense, 0) === expense,
      `${label}: 일별 합계 = 지출`,
    );
    const trend = (
      await get(
        cookie,
        `/api/ledger/stats/trend?months=2${book ? `&book=${book}` : ""}`,
      )
    ).body.data;
    const oct = trend.items.find((m) => m.year === 2026 && m.month === 10);
    check(
      oct?.totalExpense === expense && oct?.totalIncome === income,
      `${label}: 추이 10월 = 달력`,
    );
    // Source rows: union of category and per-day details must equal the expense IDs.
    const catDetail = [];
    for (const item of cat.items) {
      const d = (
        await get(
          cookie,
          `/api/ledger/stats/details?${q(book, `&kind=category&type=expense&categoryId=${item.categoryId ?? "__none__"}&limit=100`)}`,
        )
      ).body.data;
      catDetail.push(...d.items.map((e) => e.id));
      check(
        !book || d.viewAllHref.includes(`book=${book}`),
        `${label}: 카테고리 전체보기 링크에 book 유지`,
      );
    }
    check(
      JSON.stringify(catDetail.sort()) === JSON.stringify(expenseIds),
      `${label}: 카테고리 원본 상세 ID = 달력 지출 ID`,
    );
    const dayDetail = [];
    for (const day of daily.items) {
      const d = (
        await get(
          cookie,
          `/api/ledger/stats/details?kind=daily&date=${day.date}&limit=100${book ? `&book=${book}` : ""}`,
        )
      ).body.data;
      dayDetail.push(...d.items.map((e) => e.id));
    }
    check(
      JSON.stringify(dayDetail.sort()) === JSON.stringify(expenseIds),
      `${label}: 일별 원본 상세 ID = 달력 지출 ID`,
    );
    const pmDetail = [];
    for (const item of pm.items) {
      const d = (
        await get(
          cookie,
          `/api/ledger/stats/details?${q(book, `&kind=payment-method&paymentMethodId=${item.paymentMethodId ?? "__none__"}&limit=100`)}`,
        )
      ).body.data;
      pmDetail.push(...d.items.map((e) => e.id));
      // The view-all link must open the same rows in the calendar.
      const link = new URL(d.viewAllHref, BASE).searchParams;
      const viaLink = (
        await get(
          cookie,
          `/api/ledger-entries?year=2026&month=10${link.get("book") ? `&book=${link.get("book")}` : ""}&type=${link.get("type")}&paymentMethodId=${link.get("paymentMethodId")}`,
        )
      ).body.data;
      check(
        JSON.stringify(viaLink.map((e) => e.id).sort()) ===
          JSON.stringify(d.items.map((e) => e.id).sort()),
        `${label}: 결제수단 전체보기 링크 조건 = 원본 상세`,
      );
    }
    check(
      JSON.stringify(pmDetail.sort()) === JSON.stringify(expenseIds),
      `${label}: 결제수단 원본 상세 ID = 달력 지출 ID`,
    );
    const member = (await get(cookie, `/api/ledger/stats/by-member?${q(book)}`))
      .body.data;
    const memberShared = member.members.reduce(
      (t, m) => t + m.sharedExpense,
      0,
    );
    const memberPersonal = member.members.reduce(
      (t, m) => t + (m.personalExpense ?? 0),
      0,
    );
    if (member.bookVisibility === "personal")
      check(
        member.members.length === 1 &&
          member.members[0].isCurrentUser &&
          memberPersonal === expense,
        `${label}: 개인 장부 구성원 한 행 = 지출`,
      );
    else if (member.bookVisibility === "shared")
      check(
        memberShared === expense &&
          member.members.every((m) => m.personalExpense === null),
        `${label}: 공용 장부 구성원 합계 = 지출, 개인 열 없음`,
      );
    else {
      check(
        memberShared + memberPersonal === expense,
        `${label}: 구성원 공용 + 내 개인 = 지출`,
      );
      check(
        member.members
          .filter((m) => !m.isCurrentUser)
          .every(
            (m) => m.personalExpense === null && !m.personalExpenseVisible,
          ),
        `${label}: 타인 개인 지출 비공개(null)`,
      );
    }
  }
  for (const book of hidden) {
    for (const path of [
      "/api/ledger-entries/summary?",
      "/api/ledger/stats/summary?",
      "/api/ledger/stats/by-member?",
      "/api/ledger/stats/by-category?",
      "/api/ledger/stats/by-payment-method?",
      "/api/ledger/stats/daily?",
      "/api/ledger/stats/trend?months=1&",
      "/api/ledger/stats/details?kind=daily&date=2026-10-04&",
    ]) {
      const r = await get(cookie, `${path}book=${book}`);
      check(
        r.status === 404 &&
          r.body.error?.code === "BOOK_UNAVAILABLE" &&
          !JSON.stringify(r.body).includes("개인"),
        `${email}: 숨은 장부 ${book.slice(-2)} → ${path.split("?")[0]} 404 BOOK_UNAVAILABLE`,
      );
    }
  }
}

const LIV_A = process.argv[2],
  LIV_B = process.argv[3];
await verify(
  "a1@oat.test",
  [undefined, LIV_A, B("a1"), B("a2"), B("a3")],
  [B("a4"), B("b3"), LIV_B, B("99")],
  [
    "00000000-0000-4000-8000-0000000e0005",
    "00000000-0000-4000-8000-0000000e0010",
    "00000000-0000-4000-8000-0000000e0011",
  ],
);
await verify(
  "a2@oat.test",
  [undefined, LIV_A, B("a1"), B("a4")],
  [B("a3"), B("b3"), LIV_B],
  [
    "00000000-0000-4000-8000-0000000e0004",
    "00000000-0000-4000-8000-0000000e0008",
    "00000000-0000-4000-8000-0000000e0010",
  ],
);
await verify(
  "b1@oat.test",
  [undefined, LIV_B],
  [B("b3"), LIV_A, B("a1")],
  [
    "00000000-0000-4000-8000-0000000e0011",
    "00000000-0000-4000-8000-0000000e0002",
  ],
);
await verify(
  "b2@oat.test",
  [undefined, LIV_B, B("b3")],
  [LIV_A, B("a3")],
  ["00000000-0000-4000-8000-0000000e0001"],
);
console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURES`}`);
process.exit(failures ? 1 : 0);
