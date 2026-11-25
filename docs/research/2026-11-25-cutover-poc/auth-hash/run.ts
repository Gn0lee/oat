// 전환 PoC B: Supabase bcrypt 해시를 Better Auth credential 계정으로 옮겨 같은 비밀번호로 로그인되는지 확인해요.
// 사용: docker run -d --name cut533-pg -e POSTGRES_PASSWORD=poc -e POSTGRES_DB=auth -p 55433:5432 postgres:17
//       npm install && npm test
import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres:poc@localhost:55433/auth" });
let lastResetToken = "";

// 해시 모양으로 고른다: Supabase(GoTrue)는 Go bcrypt라 "$2a$10$…", Better Auth 기본은 scrypt "salt:key"
const isBcrypt = (h: string) => /^\$2[aby]\$\d{2}\$/.test(h);

const auth = betterAuth({
	baseURL: "http://localhost:3000",
	secret: "poc-secret-poc-secret-poc-secret-0000",
	database: pool,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		password: {
			hash: hashPassword, // 새로 정하는 비밀번호는 기본(scrypt)
			verify: async ({ hash, password }) => (isBcrypt(hash) ? bcrypt.compare(password, hash) : verifyPassword({ hash, password })),
		},
		sendResetPassword: async ({ token }) => {
			lastResetToken = token;
		},
	},
});

const results: [string, boolean, string?][] = [];
const check = (name: string, ok: boolean, note?: string) => results.push([name, ok, note]);
const tryCall = async <T>(f: () => Promise<T>) => {
	try {
		return { ok: true as const, value: await f() };
	} catch (e: any) {
		return { ok: false as const, error: e?.body?.code ?? e?.message ?? String(e) };
	}
};

async function main() {
	const ctx = await auth.$context;
	await ctx.runMigrations();
	await pool.query(`truncate "user" cascade`);

	// 1) 기존 Supabase 행 흉내: auth.users.encrypted_password. pgcrypto bf(10)는 Go bcrypt와 같은 "$2a$10$" 꼴
	await pool.query("create extension if not exists pgcrypto");
	const users = [
		{ email: "a@example.test", pw: "기존비번-A1!", confirmed: true },
		{ email: "b@example.test", pw: "old-pass-B2", confirmed: false },
		{ email: "c@example.test", pw: "abc123", confirmed: true }, // Supabase 기본 최소 6자
	];
	for (const u of users) {
		const { rows } = await pool.query("select crypt($1, gen_salt('bf', 10)) as h", [u.pw]);
		const legacyHash: string = rows[0].h;
		check(`${u.email}: Supabase 꼴 해시($2a$10$)`, legacyHash.startsWith("$2a$10$"), legacyHash.slice(0, 7));
		// 2) 전환 스크립트가 할 일: user 행 + credential account 행(accountId = userId, password = 해시 그대로)
		const id = crypto.randomUUID();
		await pool.query(
			`insert into "user"(id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1,$2,$3,$4, now(), now())`,
			[id, u.email.split("@")[0], u.email, u.confirmed],
		);
		await pool.query(
			`insert into account(id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") values ($1,$2,'credential',$2,$3, now(), now())`,
			[crypto.randomUUID(), id, legacyHash],
		);
	}

	// 3) 같은 비밀번호로 첫 로그인
	const a = users[0];
	const signIn = await tryCall(() => auth.api.signInEmail({ body: { email: a.email, password: a.pw }, asResponse: true }));
	const okRes = signIn.ok && signIn.value.status === 200;
	check("인증된 사용자: 기존 비밀번호로 로그인", okRes);
	const cookie = signIn.ok ? (signIn.value.headers.get("set-cookie") ?? "").split(";")[0] : "";

	const wrong = await tryCall(() => auth.api.signInEmail({ body: { email: a.email, password: "틀린비번" } }));
	check("틀린 비밀번호 거절", !wrong.ok, wrong.ok ? "" : wrong.error);

	// 4) 이메일 미인증 사용자: requireEmailVerification이면 거절 → 전환 때 email_confirmed_at을 옮겨야 함
	const b = users[1];
	const unverified = await tryCall(() => auth.api.signInEmail({ body: { email: b.email, password: b.pw } }));
	check("미인증 사용자는 비밀번호가 맞아도 거절(인증 메일 필요)", !unverified.ok, unverified.ok ? "" : unverified.error);

	// 4-1) 6자 기존 비밀번호: Better Auth 최소 8자보다 짧아도 로그인은 되는지
	const short = await tryCall(() => auth.api.signInEmail({ body: { email: users[2].email, password: users[2].pw } }));
	check("6자 기존 비밀번호도 로그인(최소 길이는 새로 정할 때만)", short.ok, short.ok ? "" : short.error);

	// 5) 비밀번호 변경 → 새 해시는 scrypt
	const change = await tryCall(() =>
		auth.api.changePassword({ body: { currentPassword: a.pw, newPassword: "새비번-A2-long!" }, headers: new Headers({ cookie }) }),
	);
	const h1 = (await pool.query(`select password from account a join "user" u on u.id=a."userId" where u.email=$1`, [a.email])).rows[0].password;
	check("비밀번호 변경 성공, 저장 해시가 scrypt로 바뀜", change.ok && !isBcrypt(h1), change.ok ? h1.slice(0, 12) + "…" : change.error);
	const oldAfter = await tryCall(() => auth.api.signInEmail({ body: { email: a.email, password: a.pw } }));
	const newAfter = await tryCall(() => auth.api.signInEmail({ body: { email: a.email, password: "새비번-A2-long!" } }));
	check("변경 뒤 옛 비밀번호 거절, 새 비밀번호 로그인", !oldAfter.ok && newAfter.ok);

	// 6) 비밀번호 재설정(잊었을 때): bcrypt 해시인 계정도 재설정 메일 경로가 동작
	await pool.query(`update "user" set "emailVerified" = true where email=$1`, [b.email]);
	const req = await tryCall(() => auth.api.requestPasswordReset({ body: { email: b.email, redirectTo: "oat://reset" } }));
	const reset = await tryCall(() => auth.api.resetPassword({ body: { token: lastResetToken, newPassword: "reset-pass-B3" } }));
	const h2 = (await pool.query(`select password from account a join "user" u on u.id=a."userId" where u.email=$1`, [b.email])).rows[0].password;
	const bLogin = await tryCall(() => auth.api.signInEmail({ body: { email: b.email, password: "reset-pass-B3" } }));
	check("bcrypt 계정 재설정 메일 → 새 비밀번호(scrypt)로 로그인", req.ok && reset.ok && !isBcrypt(h2) && bLogin.ok, reset.ok ? "" : reset.error);

	// 7) 해시 비교 비용: bcrypt cost 10 한 번
	const t = performance.now();
	await bcrypt.compare("x", h1.startsWith("$2") ? h1 : (await pool.query("select crypt('y', gen_salt('bf',10)) h")).rows[0].h);
	check("bcrypt(10) 비교 시간", true, `${Math.round(performance.now() - t)}ms`);

	for (const [n, ok, note] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${n}${note ? `  (${note})` : ""}`);
	await pool.end();
	process.exit(results.every((r) => r[1]) ? 0 : 1);
}
main().catch((e) => {
	console.error(e);
	process.exit(1);
});
