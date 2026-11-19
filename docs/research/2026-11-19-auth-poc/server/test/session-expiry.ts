// #4 축소 재현: 세션 수명을 초 단위로 줄인 서버(SESSION_EXPIRES=40, UPDATE_AGE=10)에 대고
// 실제 @better-auth/expo 클라이언트 코드로 세 가지 사용 패턴을 비교해요.
import { createAuthClient } from "better-auth/client";
import { expoClient } from "@better-auth/expo/client";
import pg from "pg";

const B = process.env.BASE_URL ?? "http://localhost:3001";
const db = new pg.Pool({ connectionString: "postgres://postgres:poc@localhost:55432/auth" });
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

function makeClient() {
	const mem = new Map<string, string>(); // SecureStore 대신 메모리
	const storage = { getItemAsync: async (k: string) => mem.get(k) ?? null, setItemAsync: async (k: string, v: string) => void mem.set(k, v), deleteItemAsync: async (k: string) => void mem.delete(k) };
	const client = createAuthClient({ baseURL: B, plugins: [expoClient({ scheme: "oat", storage })] });
	return { client, mem };
}

async function run(label: string, pattern: "api-only" | "api+getSession" | "idle", total: number, step: number) {
	const { client, mem } = makeClient();
	const email = `${pattern}-${Date.now()}@poc.test`.toLowerCase();
	await client.signUp.email({ email, password: "password-1234", name: pattern });
	const log: string[] = [];
	for (let t = step; t <= total; t += step) {
		await sleep(step);
		if (pattern === "api+getSession") await client.getSession(); // 포그라운드 복귀마다 부르는 자리
		const cookie = await (client as any).getCookie();
		const stored = JSON.parse(mem.get("better-auth_cookie") ?? "{}");
		const localExp = Object.values(stored)[0] as any;
		const r = pattern === "idle" && t < total ? null : await fetch(`${B}/v1/me`, { headers: cookie ? { cookie } : {} });
		const row = (await db.query(`select s."expiresAt" from session s join "user" u on u.id = s."userId" where u.email = $1`, [email])).rows[0];
		const left = (d?: string | Date) => (d ? Math.round((new Date(d).getTime() - Date.now()) / 1000) + "s" : "-");
		log.push(`t=${t}s  /v1/me=${r ? r.status : "(호출 안 함)"}  쿠키헤더=${cookie ? "있음" : "없음"}  기기쪽 남은 수명=${left(localExp?.expires)}  서버 남은 수명=${left(row?.expiresAt)}`);
	}
	console.log(`\n[${label}]\n` + log.join("\n"));
}

const only = process.argv[2];
await Promise.all([
	!only || "api-only" === only ? run("A. 우리 API만 부름", "api-only", 60, 10) : null,
	!only || "api+getSession" === only ? run("B. 우리 API + 매번 getSession", "api+getSession", 60, 10) : null,
	!only || "idle" === only ? run("C. 아무것도 안 하고 방치", "idle", 50, 10) : null,
]);
await db.end();
