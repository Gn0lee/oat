// 실제 클라이언트를 붙이기 전 자체 확인: 공개된 Claude Code CIMD 문서를 client_id로 써서
// 로그인·동의 화면(HTML 폼) → 토큰 → /mcp 툴 → 권한 변경 → 해지까지 브라우저처럼 따라가요.
// 실행: 서버를 띄운 뒤 `npx tsx --env-file=.env test/flow.ts`
import { createHash, randomBytes } from "node:crypto";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const A = `${B}/api/auth`;
const RES = `${B}/mcp`;
const CLIENT = "https://claude.ai/oauth/claude-code-client-metadata";
const REDIRECT = "http://localhost:54321/callback";
const KEY = process.env.ADMIN_KEY!;
const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, note = "") => results.push([name, ok, note]);

let jar = "";
const keep = (r: Response) => {
	for (const c of r.headers.getSetCookie()) {
		const [kv] = c.split(";");
		const [k] = kv.split("=");
		jar = jar.split("; ").filter((x) => x && !x.startsWith(`${k}=`)).concat(kv.endsWith("=") ? [] : [kv]).join("; ");
	}
};
const form = (o: Record<string, string>) => new URLSearchParams(o);
const hidden = (html: string) => decodeHtml(/name="oauth_query" value="([^"]*)"/.exec(html)?.[1] ?? "");
const decodeHtml = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

async function connect(readOnly: boolean, client = CLIENT) {
	jar = "";
	const verifier = randomBytes(32).toString("base64url");
	const q = new URLSearchParams({
		response_type: "code", client_id: client, redirect_uri: REDIRECT, scope: "oat offline_access", state: "st",
		code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", resource: RES,
	});
	let r = await fetch(`${A}/oauth2/authorize?${q}`, { redirect: "manual", headers: { accept: "text/html", "sec-fetch-mode": "navigate" } });
	// Node fetch는 sec-fetch-mode: cors를 붙여서 302 대신 {redirect,url} JSON을 받아요(브라우저·curl은 302)
	const loc1 = r.headers.get("location") ?? (await r.clone().json().catch(() => ({}))).url ?? "";
	if (!loc1.includes("/oauth/login")) return { error: `authorize → ${r.status} ${loc1 || (await r.text()).slice(0, 200)}` };
	r = await fetch(new URL(loc1, B), { redirect: "manual" });
	const loginQuery = hidden(await r.text());
	r = await fetch(`${B}/oauth/login`, { method: "POST", redirect: "manual", body: form({ email: "me@oat-poc.test", password: process.env.POC_PASSWORD!, oauth_query: loginQuery }) });
	keep(r);
	const loc2 = r.headers.get("location") ?? "";
	if (!loc2.includes("/oauth/consent")) return { error: `login → ${r.status} ${loc2}` };
	r = await fetch(new URL(loc2, B), { headers: { cookie: jar } });
	const consentHtml = await r.text();
	const name = /<b>([^<]+)<\/b>가 oat에/.exec(consentHtml)?.[1];
	r = await fetch(`${B}/oauth/consent`, {
		method: "POST", redirect: "manual", headers: { cookie: jar },
		body: form({ oauth_query: hidden(consentHtml), accept: "1", ...(readOnly ? { read_only: "1" } : {}) }),
	});
	keep(r);
	const back = new URL(r.headers.get("location") ?? "");
	const code = back.searchParams.get("code");
	const browserSession = await (await fetch(`${A}/get-session`, { headers: { cookie: jar } })).json();
	r = await fetch(`${A}/oauth2/token`, {
		method: "POST",
		body: form({ grant_type: "authorization_code", code: code ?? "", redirect_uri: REDIRECT, client_id: client, code_verifier: verifier, resource: RES }),
	});
	const tok = await r.json();
	return { name, back: back.origin + back.pathname, iss: back.searchParams.get("iss"), browserSessionAfter: browserSession, tok };
}

let rpcId = 1;
async function rpc(token: string, method: string, params: unknown = {}) {
	const r = await fetch(RES, {
		method: "POST",
		headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-11-25" },
		body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
	});
	const text = await r.text();
	let body: any = null;
	try { body = JSON.parse(text); } catch { body = text; }
	return { status: r.status, body };
}
const call = async (t: string, name: string, args: unknown = {}) => {
	const r = await rpc(t, "tools/call", { name, arguments: args });
	const txt = r.body?.result?.content?.[0]?.text;
	let data: any = r.body; try { data = txt ? JSON.parse(txt) : r.body; } catch { data = { error: txt }; }
	return { status: r.status, isError: r.body?.result?.isError, data };
};
const admin = async (path: string, id: string) =>
	fetch(`${B}/poc/admin/${path}?key=${KEY}`, { method: "POST", redirect: "manual", body: form({ id }) });

// 1. 허용 목록 밖 CIMD는 거절
{
	const r = await connect(false, "https://vscode.dev/oauth/client-metadata.json");
	check("허용 목록 밖 클라이언트 거절", !!r.error, String(r.error).slice(0, 120));
}
// 2. 연결
const c1 = await connect(false); if (c1.error) console.log("c1", c1.error);
check("로그인 → 동의 → 코드 → 토큰", !!c1.tok?.access_token, `동의 화면 이름=${c1.name}, 복귀=${c1.back}, iss=${c1.iss}`);
check("동의 뒤 브라우저 로그인 정리", c1.browserSessionAfter === null, JSON.stringify(c1.browserSessionAfter)?.slice(0, 80));
const t = c1.tok.access_token as string;
if (process.env.DEBUG) console.log("tok", JSON.stringify(c1.tok).slice(0, 400));
check("access token 수명", true, `expires_in=${c1.tok.expires_in}, scope=${c1.tok.scope}, refresh=${!!c1.tok.refresh_token}`);

const init = await rpc(t, "initialize", { protocolVersion: "2026-07-28", capabilities: {}, clientInfo: { name: "flow", version: "0" } });
check("initialize + instructions", init.status === 200 && !!init.body?.result?.instructions, `proto=${init.body?.result?.protocolVersion}`);
const list = await rpc(t, "tools/list");
const names = list.body?.result?.tools?.map((x: any) => x.name) ?? [];
check("쓰기 연결의 툴 목록", names.includes("add_spending") && names.includes("delete_record"), names.join(","));

const ctx = (await call(t, "get_context")).data;
const recs = (await call(t, "search_records", {})).data;
check("배우자 개인 장부 안 보임", !JSON.stringify(recs).includes("배우자 비밀") && ctx.ledgers.length === 2, `장부 ${ctx.ledgers.map((l: any) => l.name)}, 기록 ${recs.count}건`);

const shared = ctx.ledgers.find((l: any) => l.kind === "shared").id;
const card = ctx.wallets.find((w: any) => w.kind === "credit_card").id;
const dup = (await call(t, "add_spending", { ledger_id: shared, date: "2026-11-18", title: "이마트", amount: 84200, wallet_id: card })).data;
check("같은 지갑·날짜·금액 → possible_duplicate", dup.status === "possible_duplicate" && dup.saved === false, dup.existing?.[0]?.title);
const forced = (await call(t, "add_spending", { ledger_id: shared, date: "2026-11-18", title: "이마트 2번째", amount: 84200, wallet_id: card, allow_duplicate: true })).data;
check("allow_duplicate면 저장", forced.status === "created", forced.record?.amount?.display);
const stale = await call(t, "delete_record", { record_id: forced.record.id, version: 99 });
check("version 다르면 삭제 거절", stale.isError === true, stale.data?.code);
const del = (await call(t, "delete_record", { record_id: forced.record.id, version: forced.record.version })).data;
check("삭제", del.status === "deleted");

// 3. 갱신 토큰: 브라우저 로그인을 정리한 뒤에도 갱신되는지
const ref = await (await fetch(`${A}/oauth2/token`, { method: "POST", body: form({ grant_type: "refresh_token", refresh_token: c1.tok.refresh_token, client_id: CLIENT, resource: RES }) })).json();
check("브라우저 로그아웃 뒤 갱신", !!ref.access_token, ref.error ?? "");
const t2 = ref.access_token ?? t;

// 4. 권한 바꾸기(쓰기 → 조회만)가 다음 요청부터 적용
const pg = (await import("../src/auth.js")).pool;
const connId = (await pg.query("select id from ai_connections where oauth_client_id = $1", [CLIENT])).rows[0].id;
await admin("toggle", connId);
const list2 = await rpc(t2, "tools/list");
const names2 = list2.body?.result?.tools?.map((x: any) => x.name) ?? [];
const w2 = await call(t2, "add_spending", { ledger_id: shared, date: "2026-11-20", title: "x", amount: 1, wallet_id: card });
check("조회만으로 바꾸면 바로 쓰기 거절(이유 포함)", w2.isError === true && w2.data?.code === "write_not_allowed", w2.data?.code);
await admin("toggle", connId);

// 5. 해지가 다음 요청부터 적용 (액세스 토큰 만료 전)
await admin("revoke", connId);
const after = await rpc(t2, "tools/list");
check("해지 직후 /mcp 401", after.status === 401, JSON.stringify(after.body).slice(0, 100));
const ref2 = await (await fetch(`${A}/oauth2/token`, { method: "POST", body: form({ grant_type: "refresh_token", refresh_token: ref.refresh_token, client_id: CLIENT, resource: RES }) })).json();
check("해지 뒤 갱신 거절", !ref2.access_token, ref2.error ?? "");

// 6. 읽기 전용으로 다시 연결
const c3 = await connect(true);
const names3 = (await rpc(c3.tok.access_token, "tools/list")).body?.result?.tools?.map((x: any) => x.name) ?? [];
const w3 = await call(c3.tok.access_token, "add_spending", { ledger_id: shared, date: "2026-11-20", title: "x", amount: 1, wallet_id: card });
check("동의 화면에서 조회만 선택", w3.data?.code === "write_not_allowed", names3.join(","));
const audit = (await pg.query("select count(*)::int n, count(ai_connection_id)::int with_conn from audit_log where entry_point='mcp'")).rows[0];
check("감사 기록에 AI 연결 ID", audit.n > 0 && audit.n === audit.with_conn, JSON.stringify(audit));
await pg.end();

for (const [n, ok, note] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${n}${note ? `  (${note})` : ""}`);
