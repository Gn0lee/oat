// 도메인 테이블을 아주 줄인 모양이에요. 다리·줄은 생략하고 기록 한 줄 = 지출 한 건으로 둬요.
// 확인하려는 것은 연결 확인 쿼리, 권한, 중복 확인, 감사 기록이라 모델은 단순하게 둬요.
import { pool } from "./auth.js";

export async function migrateDomain() {
	await pool.query(`
create table if not exists households (id uuid primary key default gen_random_uuid(), name text not null);
create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id),
  user_id text references "user"(id) on delete set null,
  display_name text not null,
  status text not null default 'active' check (status in ('active','left'))
);
create table if not exists ledgers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id),
  kind text not null check (kind in ('shared','personal')),
  owner_member_id uuid references household_members(id),
  name text not null
);
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id),
  name text not null, kind text not null, owner_member_id uuid references household_members(id)
);
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id),
  name text not null
);
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id),
  ledger_id uuid not null references ledgers(id),
  date text not null,
  title text not null,
  amount bigint not null,
  currency text not null default 'KRW',
  wallet_id uuid not null references wallets(id),
  category_id uuid references categories(id),
  memo text,
  version int not null default 1,
  created_at timestamptz not null default now()
);
-- 질문 8: AI 연결은 가구 멤버 행에 묶어요. 권한의 정본이에요.
create table if not exists ai_connections (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references household_members(id),
  oauth_client_id text not null,
  client_name text not null,
  access text not null check (access in ('read','read_write')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (member_id, oauth_client_id)
);
create table if not exists audit_log (
  id bigserial primary key,
  household_id uuid not null,
  ledger_id uuid,
  actor_member_id uuid,
  entry_point text not null,
  ai_connection_id uuid, -- 질문 4: 어느 AI 연결이 했는지(FK 없음)
  entity_type text not null, entity_id uuid not null, action text not null,
  before jsonb, after jsonb,
  created_at timestamptz not null default now()
);
`);
}

// 가짜 데이터: 가구 하나에 두 사람. 배우자 개인 장부가 AI에게 보이지 않는지 보려고 둘을 둬요.
export async function seed(userIdA: string, userIdB: string) {
	const { rows } = await pool.query("select count(*)::int as n from households");
	if (rows[0].n > 0) return;
	const h = (await pool.query("insert into households(name) values ('PoC 가구') returning id")).rows[0].id;
	const a = (await pool.query("insert into household_members(household_id,user_id,display_name) values ($1,$2,'나') returning id", [h, userIdA])).rows[0].id;
	const b = (await pool.query("insert into household_members(household_id,user_id,display_name) values ($1,$2,'배우자') returning id", [h, userIdB])).rows[0].id;
	const shared = (await pool.query("insert into ledgers(household_id,kind,name) values ($1,'shared','공용') returning id", [h])).rows[0].id;
	const mine = (await pool.query("insert into ledgers(household_id,kind,owner_member_id,name) values ($1,'personal',$2,'내 개인') returning id", [h, a])).rows[0].id;
	const theirs = (await pool.query("insert into ledgers(household_id,kind,owner_member_id,name) values ($1,'personal',$2,'배우자 개인') returning id", [h, b])).rows[0].id;
	const card = (await pool.query("insert into wallets(household_id,name,kind,owner_member_id) values ($1,'신한카드(25일)','credit_card',$2) returning id", [h, a])).rows[0].id;
	const bank = (await pool.query("insert into wallets(household_id,name,kind,owner_member_id) values ($1,'생활비 통장','bank',null) returning id", [h])).rows[0].id;
	const cat: Record<string, string> = {};
	for (const name of ["식비", "카페", "교통", "생활용품", "미분류"]) {
		cat[name] = (await pool.query("insert into categories(household_id,name) values ($1,$2) returning id", [h, name])).rows[0].id;
	}
	const ins = (ledger: string, date: string, title: string, amount: number, wallet: string, c: string) =>
		pool.query(
			"insert into records(household_id,ledger_id,date,title,amount,wallet_id,category_id) values ($1,$2,$3,$4,$5,$6,$7)",
			[h, ledger, date, title, amount, wallet, cat[c]],
		);
	await ins(shared, "2026-11-18", "이마트 성수점", 84200, card, "식비");
	await ins(shared, "2026-11-19", "쿠팡", 23900, card, "생활용품");
	await ins(mine, "2026-11-19", "스타벅스", 6100, card, "카페");
	await ins(theirs, "2026-11-19", "배우자 비밀 선물", 120000, bank, "생활용품");
}
