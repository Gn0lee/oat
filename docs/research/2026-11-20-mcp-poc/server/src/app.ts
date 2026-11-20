import { Hono } from "hono";
import { auth, BASE_URL, pool } from "./auth.js";
import { log } from "./log.js";
import { mcpHandler } from "./mcp.js";
import { mountPages } from "./pages.js";

export const app = new Hono();
const ADMIN_KEY = process.env.ADMIN_KEY ?? "change-me";

// 모든 요청을 남겨요: 실제 클라이언트가 어떤 순서로 무엇을 찾는지 보려고요
app.use("*", async (c, next) => {
	const u = new URL(c.req.url);
	await next();
	if (!u.pathname.startsWith("/poc/admin")) {
		log("http", { method: c.req.method, path: u.pathname, status: c.res.status, ua: c.req.header("user-agent")?.slice(0, 120) });
	}
});

// 코드→토큰 교환이 끝나면 동의에 쓴 브라우저 로그인을 지워요(질문 5의 "동의 뒤 바로 로그아웃").
app.post("/api/auth/oauth2/token", async (c) => {
	const body = new URLSearchParams(await c.req.raw.clone().text());
	const res = await auth.handler(c.req.raw);
	if (res.ok && body.get("grant_type") === "authorization_code") {
		const r = await pool.query(
			`delete from "session" where id in (select "sessionId" from "oauthRefreshToken"
			  where "clientId" = $1 and "sessionId" is not null and "createdAt" > now() - interval '30 seconds')
			 returning id`,
			[body.get("client_id")],
		);
		log("token.browser_session_cleared", { clientId: body.get("client_id"), sessions: r.rowCount });
	} else {
		log("token", { grant: body.get("grant_type"), clientId: body.get("client_id"), status: res.status, error: res.ok ? undefined : (await res.clone().text()).slice(0, 200) });
	}
	return res;
});
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
// 디스커버리 문서(RFC 8414·9728)는 루트 well-known으로 와요. Better Auth 플러그인의 onRequest가 처리해요.
app.on(["GET", "HEAD"], "/.well-known/*", (c) => auth.handler(c.req.raw));
app.all("/mcp", (c) => mcpHandler(c.req.raw));
mountPages(app);

// 앱의 "설정 → AI 연결" 화면 자리(질문 7). 공개 터널이라 키로 막아요.
app.get("/poc/admin", async (c) => {
	if (c.req.query("key") !== ADMIN_KEY) return c.text("forbidden", 403);
	const conns = await pool.query("select c.*, m.display_name from ai_connections c join household_members m on m.id = c.member_id order by c.created_at");
	const audits = await pool.query("select a.created_at, a.action, a.ai_connection_id, coalesce(a.after,a.before)->>'title' as title, coalesce(a.after,a.before)->>'amount' as amount from audit_log a order by id desc limit 30");
	const rows = conns.rows
		.map(
			(r) => `<tr><td>${r.display_name}</td><td>${r.client_name}<br><small>${r.oauth_client_id}</small></td><td>${r.access}</td><td>${r.last_used_at?.toISOString?.() ?? "-"}</td>
<td><form method="post" action="/poc/admin/toggle?key=${ADMIN_KEY}"><input type="hidden" name="id" value="${r.id}"><button>권한 바꾸기</button></form>
<form method="post" action="/poc/admin/revoke?key=${ADMIN_KEY}"><input type="hidden" name="id" value="${r.id}"><button>해지</button></form></td></tr>`,
		)
		.join("");
	const a = audits.rows.map((r) => `<tr><td>${r.created_at.toISOString()}</td><td>${r.action}</td><td>${r.title}</td><td>${r.amount}</td><td><small>${r.ai_connection_id}</small></td></tr>`).join("");
	return c.html(`<meta name="viewport" content="width=device-width"><h3>AI 연결</h3><table border=1 cellpadding=4>${rows}</table><h3>AI가 바꾼 기록</h3><table border=1 cellpadding=4>${a}</table>`);
});

app.post("/poc/admin/toggle", async (c) => {
	if (c.req.query("key") !== ADMIN_KEY) return c.text("forbidden", 403);
	const { id } = await c.req.parseBody();
	await pool.query("update ai_connections set access = case access when 'read' then 'read_write' else 'read' end where id = $1", [id]);
	log("admin.toggle", { id });
	return c.redirect(`/poc/admin?key=${ADMIN_KEY}`);
});

// 해지: 우리 연결 행 + Better Auth 동의 + 갱신 토큰을 함께 정리해요
app.post("/poc/admin/revoke", async (c) => {
	if (c.req.query("key") !== ADMIN_KEY) return c.text("forbidden", 403);
	const { id } = await c.req.parseBody();
	const r = (await pool.query("delete from ai_connections c using household_members m where c.id = $1 and m.id = c.member_id returning c.oauth_client_id, m.user_id", [id])).rows[0];
	if (r) {
		await pool.query(`delete from "oauthConsent" where "clientId" = $1 and "userId" = $2`, [r.oauth_client_id, r.user_id]);
		await pool.query(`update "oauthRefreshToken" set "revoked" = now() where "clientId" = $1 and "userId" = $2 and "revoked" is null`, [r.oauth_client_id, r.user_id]);
	}
	log("admin.revoke", { id, ...r });
	return c.redirect(`/poc/admin?key=${ADMIN_KEY}`);
});

app.get("/", (c) => c.text(`oat MCP PoC. MCP 주소: ${BASE_URL}/mcp`));
