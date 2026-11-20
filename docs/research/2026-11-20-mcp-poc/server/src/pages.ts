// 질문 5: 서버가 직접 내는 HTML 두 장(로그인·동의). JS 없이 폼만 써요.
import type { Hono } from "hono";
import { auth, BASE_URL, pool } from "./auth.js";
import { log } from "./log.js";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const page = (title: string, body: string) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
:root{--bg:#F4EEE2;--fg:#1f1f1f;--muted:#5b5b5b;--pine:#14573F;--on-pine:#F4EEE2;--card:#fffaf0;--line:#ddd3c2}
@media (prefers-color-scheme:dark){:root{--bg:#141714;--fg:#ece8df;--muted:#a9a59c;--pine:#3f9a75;--on-pine:#0e120f;--card:#1c201c;--line:#30352f}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 -apple-system,system-ui,sans-serif}
main{max-width:420px;margin:0 auto;padding:40px 20px}
.logo{font-weight:800;font-size:28px;color:var(--pine)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;margin-top:20px}
label{display:block;margin:12px 0 4px;font-size:14px;color:var(--muted)}
input[type=email],input[type=password]{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--line);border-radius:10px;font-size:16px;background:transparent;color:var(--fg)}
button{width:100%;padding:14px;border:0;border-radius:12px;font-size:16px;font-weight:700;margin-top:16px}
.primary{background:var(--pine);color:var(--on-pine)}.ghost{background:transparent;color:var(--muted)}
.muted{color:var(--muted);font-size:14px}.err{color:#c0392b;font-size:14px}
.check{display:flex;gap:10px;align-items:flex-start;margin-top:16px}.check input{margin-top:4px}
</style></head><body><main><div class="logo">oat.</div>${body}</main></body></html>`;

const html = (s: string, status = 200, headers: Record<string, string> = {}) =>
	new Response(s, { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } });

function forwardCookies(from: Response, to: Headers) {
	for (const c of from.headers.getSetCookie()) to.append("set-cookie", c);
}

async function callAuth(path: string, body: unknown, cookie?: string) {
	return auth.handler(
		new Request(`${BASE_URL}/api/auth${path}`, {
			method: "POST",
			headers: { "content-type": "application/json", origin: BASE_URL, ...(cookie ? { cookie } : {}) },
			body: JSON.stringify(body),
		}),
	);
}

export function mountPages(app: Hono) {
	app.get("/oauth/login", (c) => {
		const q = new URL(c.req.url).search.slice(1);
		log("page.login", { ua: c.req.header("user-agent"), clientId: new URLSearchParams(q).get("client_id") });
		return html(
			page(
				"oat 로그인",
				`<div class="card"><b>AI 앱을 연결하려면 로그인하세요</b>
<form method="post" action="/oauth/login"><input type="hidden" name="oauth_query" value="${esc(q)}">
<label>이메일</label><input type="email" name="email" autocomplete="username" required>
<label>비밀번호</label><input type="password" name="password" autocomplete="current-password" required>
<button class="primary">로그인</button></form>
<p class="muted">비밀번호를 잊었다면 oat 앱에서 재설정해 주세요.</p></div>`,
			),
		);
	});

	app.post("/oauth/login", async (c) => {
		const f = await c.req.parseBody();
		const r = await callAuth("/sign-in/email", { email: f.email, password: f.password, oauth_query: f.oauth_query });
		const j = await r.clone().json().catch(() => ({}));
		log("page.login.result", { status: r.status, url: j.url, redirect: j.redirect, error: j.code ?? j.error });
		if (!r.ok || !j.url) {
			return html(page("oat 로그인", `<div class="card"><p class="err">로그인하지 못했어요. 이메일과 비밀번호를 확인하세요.</p><a href="/oauth/login?${esc(String(f.oauth_query))}">다시 시도</a></div>`), 401);
		}
		const h = new Headers({ location: j.url });
		forwardCookies(r, h);
		return new Response(null, { status: 302, headers: h });
	});

	app.get("/oauth/consent", async (c) => {
		const q = new URL(c.req.url).search.slice(1);
		const params = new URLSearchParams(q);
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!session) return c.redirect(`/oauth/login?${q}`);
		const clientId = params.get("client_id") ?? "";
		const client = (await pool.query(`select "name", "uri", "clientDiscoveryId" from "oauthClient" where "clientId" = $1`, [clientId])).rows[0];
		const host = (() => {
			try {
				return new URL(clientId).host;
			} catch {
				return "oat가 등록한 앱";
			}
		})();
		const m = (await pool.query("select h.name from household_members m join households h on h.id = m.household_id where m.user_id = $1 and m.status='active'", [session.user.id])).rows[0];
		log("page.consent", { clientId, name: client?.name, scope: params.get("scope"), ua: c.req.header("user-agent") });
		if (!m) return html(page("oat", `<div class="card"><p class="err">가구에 속해 있지 않아서 연결할 수 없어요.</p></div>`), 403);
		return html(
			page(
				"oat 연결 허락",
				`<div class="card"><div style="font-size:18px"><b>${esc(client?.name ?? clientId)}</b>가 oat에 연결하려고 해요</div>
<p class="muted">${esc(host)}</p>
<p>가구 <b>${esc(m.name)}</b>의 공용 장부와 내 개인 장부를 볼 수 있어요. 다른 가구원의 개인 장부는 보이지 않아요.</p>
<form method="post" action="/oauth/consent"><input type="hidden" name="oauth_query" value="${esc(q)}">
<label class="check"><input type="checkbox" name="read_only" value="1"><span>조회만 허락<br><span class="muted">기록을 만들거나 고치지 못해요</span></span></label>
<button class="primary" name="accept" value="1">허락하기</button>
<button class="ghost" name="accept" value="0">취소</button></form>
<p class="muted">앱의 설정 → AI 연결에서 언제든 권한을 바꾸거나 해지할 수 있어요.</p></div>`,
			),
		);
	});

	app.post("/oauth/consent", async (c) => {
		const f = await c.req.parseBody();
		const cookie = c.req.header("cookie") ?? "";
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!session) return c.text("세션이 없어요. 처음부터 다시 연결하세요.", 401);
		const accept = f.accept === "1";
		const q = String(f.oauth_query);
		const clientId = new URLSearchParams(q).get("client_id") ?? "";
		const r = await callAuth("/oauth2/consent", { accept, oauth_query: q }, cookie);
		const j = await r.clone().json().catch(() => ({}));
		log("page.consent.result", { status: r.status, accept, url: j.url, error: j.error });
		if (!j.url) return c.text(`동의 처리 실패: ${JSON.stringify(j)}`, 400);
		if (accept) {
			const member = (await pool.query("select id from household_members where user_id = $1 and status='active'", [session.user.id])).rows[0];
			const client = (await pool.query(`select "name" from "oauthClient" where "clientId" = $1`, [clientId])).rows[0];
			await pool.query(
				`insert into ai_connections(member_id, oauth_client_id, client_name, access) values ($1,$2,$3,$4)
				 on conflict (member_id, oauth_client_id) do update set access = excluded.access`,
				[member.id, clientId, client?.name ?? clientId, f.read_only === "1" ? "read" : "read_write"],
			);
		}
		// 동의의 정본은 ai_connections 하나예요. Better Auth의 동의 기록을 남기면 다음 연결 때
		// 우리 동의 화면을 건너뛰어서 연결 행과 어긋날 수 있어요(PoC에서 봄). 그래서 매번 지워요.
		await pool.query(`delete from "oauthConsent" where "clientId" = $1 and "userId" = $2`, [clientId, session.user.id]);
		// 브라우저 로그인은 여기서 지우면 코드→토큰 교환이 "session no longer exists"로 실패해요(PoC에서 봄).
		// 그래서 토큰 교환이 끝난 뒤 app.ts의 토큰 래퍼가 지워요. 쿠키만 먼저 지워 둬요.
		const h = new Headers({ location: j.url });
		for (const name of ["better-auth.session_token", "__Secure-better-auth.session_token"]) {
			h.append("set-cookie", `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${name.startsWith("__Secure") ? "; Secure" : ""}`);
		}
		return new Response(null, { status: 302, headers: h });
	});
}
