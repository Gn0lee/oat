import { Hono } from "hono";
import { requireMcpAuth } from "@better-auth/mcp";
import { auth, MCP_RESOURCE } from "./auth.js";

export const app = new Hono();

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// 앱 API 자리: 세션 확인만 써요(리서치 5.5)
app.get("/v1/me", async (c) => {
	const s = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!s) return c.json({ error: "unauthorized" }, 401);
	return c.json({ userId: s.user.id, sessionExpiresAt: s.session.expiresAt });
});

// 앱 API가 받은 헤더를 그대로 보여줘요(#1 확인용)
app.get("/v1/echo-headers", (c) => {
	const h: Record<string, string> = {};
	c.req.raw.headers.forEach((v, k) => (h[k] = k === "cookie" ? v : v.slice(0, 120)));
	return c.json(h);
});

// MCP 자리: requireMcpAuth만 써요
const mcpHandler = requireMcpAuth(
	auth,
	async (_req, claims) => Response.json({ ok: true, sub: claims.sub, aud: claims.aud, azp: claims.azp }),
	{ resource: MCP_RESOURCE },
);
app.all("/mcp", (c) => mcpHandler(c.req.raw));

// 동의 화면 자리(자동 테스트는 이 페이지를 건너뛰고 /oauth2/consent를 직접 불러요)
app.get("/consent", (c) => c.text(`consent page: ${c.req.url}`));
app.get("/login", (c) => c.text("login page"));

// 앱이 보낸 테스트 결과를 받아 파일로 남겨요(시뮬레이터 화면을 직접 보지 않아도 되게)
import { appendFileSync } from "node:fs";
app.post("/poc-log", async (c) => {
	const body = await c.req.json();
	const line = JSON.stringify({ at: new Date().toISOString(), ...body });
	appendFileSync(new URL("../poc-log.jsonl", import.meta.url), line + "\n");
	console.log("[poc-log]", line);
	return c.json({ ok: true });
});
