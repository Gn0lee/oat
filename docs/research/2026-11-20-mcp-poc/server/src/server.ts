import { serve } from "@hono/node-server";
import { getMigrations } from "better-auth/db/migration";
import { app } from "./app.js";
import { auth, pool } from "./auth.js";
import { migrateDomain, seed } from "./db.js";

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
await migrateDomain();

// PoC 계정 둘. 비밀번호는 환경변수로 받아요(공개 터널이라 기본값을 쓰지 않아요).
const pw = process.env.POC_PASSWORD;
if (!pw) throw new Error("POC_PASSWORD를 정해 주세요");
async function ensureUser(email: string, name: string) {
	const found = (await pool.query(`select id from "user" where email = $1`, [email])).rows[0];
	if (found) return found.id as string;
	const r = await auth.api.signUpEmail({ body: { email, password: pw!, name } });
	return r.user.id;
}
const a = await ensureUser("me@oat-poc.test", "나");
const b = await ensureUser("partner@oat-poc.test", "배우자");
await seed(a, b);

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) }, (i) => console.log(`listening ${i.port}`));
