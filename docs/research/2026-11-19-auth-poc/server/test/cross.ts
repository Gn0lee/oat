// #6 교차 거부, #7 로그아웃 후 MCP 토큰, #8 bearer 병용을 확인해요.
// 실행: 서버를 띄운 뒤 `npx tsx test/cross.ts` (BEARER=1 서버에서도 한 번 더)
import { createHash, randomBytes } from "node:crypto";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const A = `${B}/api/auth`;
const RES = `${B}/mcp`;
const results: { name: string; expect: string; got: string; pass: boolean }[] = [];
const check = (name: string, expect: number | number[], got: number, note = "") => {
	const ok = Array.isArray(expect) ? expect.includes(got) : expect === got;
	results.push({ name, expect: String(expect), got: `${got}${note ? ` ${note}` : ""}`, pass: ok });
};
const cookieOf = (r: Response) =>
	r.headers.getSetCookie().map((c) => c.split(";")[0]).filter((c) => !c.endsWith("=")).join("; ");

async function signUp(email: string) {
	const r = await fetch(`${A}/sign-up/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: B },
		body: JSON.stringify({ email, password: "password-1234", name: email }),
	});
	const j = await r.json();
	return { cookie: cookieOf(r), rawToken: j.token as string, signedToken: r.headers.get("set-auth-token") };
}
const me = (h: Record<string, string>) => fetch(`${B}/v1/me`, { headers: h });
const mcpCall = (h: Record<string, string>) =>
	fetch(RES, { method: "POST", headers: { "content-type": "application/json", ...h }, body: "{}" });

async function getMcpToken(cookie: string) {
	const redirect = "http://localhost:9999/cb";
	const reg = await fetch(`${A}/oauth2/register`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			client_name: "poc-mcp-client",
			application_type: "native",
			redirect_uris: [redirect],
			token_endpoint_auth_method: "none",
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
		}),
	});
	const client = await reg.json();
	if (!client.client_id) throw new Error(`register failed ${reg.status} ${JSON.stringify(client)}`);
	const verifier = randomBytes(32).toString("base64url");
	const challenge = createHash("sha256").update(verifier).digest("base64url");
	const q = new URLSearchParams({
		response_type: "code",
		client_id: client.client_id,
		redirect_uri: redirect,
		scope: "openid offline_access",
		state: "s1",
		code_challenge: challenge,
		code_challenge_method: "S256",
		resource: RES,
	});
	let r = await fetch(`${A}/oauth2/authorize?${q}`, { headers: { cookie }, redirect: "manual" });
	if (process.env.DEBUG) console.log("authorize", r.status, r.headers.get("location"), await r.clone().text());
	let loc = r.headers.get("location") ?? ((await r.clone().json().catch(() => ({}))).url ?? "");
	if (loc.includes("/consent")) {
		const consentQuery = new URL(loc, B).search.slice(1);
		r = await fetch(`${A}/oauth2/consent`, {
			method: "POST",
			headers: { "content-type": "application/json", cookie, origin: B },
			body: JSON.stringify({ accept: true, oauth_query: consentQuery }),
		});
		const j = await r.json().catch(() => ({}));
		loc = j.url ?? j.redirect_uri ?? r.headers.get("location") ?? JSON.stringify(j);
	}
	const code = new URL(loc, B).searchParams.get("code");
	if (!code) throw new Error(`no code: ${r.status} ${loc}`);
	const tok = await fetch(`${A}/oauth2/token`, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirect,
			client_id: client.client_id,
			code_verifier: verifier,
			resource: RES,
		}),
	});
	const t = await tok.json();
	if (!t.access_token) throw new Error(`token failed ${tok.status} ${JSON.stringify(t)}`);
	return { ...t, client_id: client.client_id };
}

const bearerOn = process.argv.includes("--bearer");
const u1 = await signUp(`a${Date.now()}@poc.test`);
const u2 = await signUp(`b${Date.now()}@poc.test`);
check("앱 세션 Cookie → /v1/me", 200, (await me({ cookie: u1.cookie })).status);

const t = await getMcpToken(u1.cookie);
const header = JSON.parse(Buffer.from(t.access_token.split(".")[0], "base64url").toString());
const payload = JSON.parse(Buffer.from(t.access_token.split(".")[1], "base64url").toString());
console.log("MCP access token header", header, "aud", payload.aud, "azp", payload.azp, "sid", payload.sid);

check("MCP 토큰 → /mcp", 200, (await mcpCall({ authorization: `Bearer ${t.access_token}` })).status);
// #6 교차
check("MCP 토큰(Bearer) → /v1/me", 401, (await me({ authorization: `Bearer ${t.access_token}` })).status);
check("앱 세션 Cookie → /mcp", 401, (await mcpCall({ cookie: u1.cookie })).status);
check("앱 세션 원본 토큰(Bearer) → /mcp", 401, (await mcpCall({ authorization: `Bearer ${u1.rawToken}` })).status);
const sessionCookieValue = decodeURIComponent(u1.cookie.split("=")[1]);
check("앱 세션 서명 토큰(Bearer) → /mcp", 401, (await mcpCall({ authorization: `Bearer ${sessionCookieValue}` })).status);
check("세션 JWT 발급 /token 막힘", 404, (await fetch(`${A}/token`, { headers: { cookie: u1.cookie } })).status);
check("ID 토큰(OIDC id_token) → /mcp", 401, (await mcpCall({ authorization: `Bearer ${t.id_token}` })).status);

// #8 bearer 병용
if (bearerOn) {
	check("[bearer] 서명 토큰(set-auth-token) → /v1/me", 200, (await me({ authorization: `Bearer ${u1.signedToken}` })).status);
	check("[bearer] 서명 없는 JSON token → /v1/me (requireSignature)", 401, (await me({ authorization: `Bearer ${u1.rawToken}` })).status);
	const both = await me({ cookie: u1.cookie, authorization: `Bearer ${u1.signedToken}` });
	check("[bearer] 같은 사용자 Cookie+Bearer → /v1/me", 200, both.status);
	const mixed = await me({ cookie: u1.cookie, authorization: `Bearer ${u2.signedToken}` });
	const mj = await mixed.json();
	const u2me = await (await me({ cookie: u2.cookie })).json();
	check("[bearer] Cookie(A)+Bearer(B) → 누가 이기나", [200, 401], mixed.status, mj.userId === u2me.userId ? "(B=Bearer 승)" : "(A=Cookie 승)");
} else {
	check("[bearer 꺼짐] 서명 토큰(Bearer) → /v1/me", 401, (await me({ authorization: `Bearer ${sessionCookieValue}` })).status);
}

// #7 로그아웃 후 MCP 토큰
const out = await fetch(`${A}/sign-out`, { method: "POST", headers: { cookie: u1.cookie, origin: B, "content-type": "application/json" }, body: "{}" });
check("로그아웃", 200, out.status);
check("로그아웃 후 앱 세션 → /v1/me", 401, (await me({ cookie: u1.cookie })).status);
check("로그아웃 후 MCP 토큰 → /mcp", [200, 401], (await mcpCall({ authorization: `Bearer ${t.access_token}` })).status, "(200이면 만료까지 살아 있음)");
const intro = await fetch(`${A}/oauth2/introspect`, {
	method: "POST",
	headers: { "content-type": "application/x-www-form-urlencoded" },
	body: new URLSearchParams({ token: t.access_token, client_id: t.client_id }),
});
console.log("introspect after sign-out", intro.status, await intro.text());
if (t.refresh_token) {
	const rr = await fetch(`${A}/oauth2/token`, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: t.client_id, resource: RES }),
	});
	const rj = await rr.json();
	check("로그아웃 후 refresh_token 갱신", [200, 400, 401], rr.status, rr.ok ? `(새 토큰 발급, sid=${JSON.parse(Buffer.from(rj.access_token.split(".")[1], "base64url").toString()).sid})` : `(${rj.error})`);
}
console.log("access token expires_in", t.expires_in, "scope", t.scope);
console.table(results);
