// /mcp: 토큰 검증 → 요청마다 DB 한 번(연결·가구원·권한) → 툴. 요청마다 서버를 새로 만드는 무상태 모드예요.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { requireMcpAuth } from "@better-auth/mcp";
import { z } from "zod";
import { auth, MCP_RESOURCE, pool } from "./auth.js";
import { log } from "./log.js";

type Access = {
	connectionId: string;
	access: "read" | "read_write";
	memberId: string;
	householdId: string;
	ledgerIds: string[];
};

// 질문 8의 확인 쿼리. 0행이면 401.
export async function loadAccess(userId: string, clientId: string): Promise<Access | null> {
	const { rows } = await pool.query(
		`select c.id as connection_id, c.access, m.id as member_id, m.household_id,
		        (c.last_used_at is null or c.last_used_at < now() - interval '1 hour') as stale
		   from ai_connections c
		   join household_members m on m.id = c.member_id
		  where m.user_id = $1 and c.oauth_client_id = $2 and m.status = 'active'`,
		[userId, clientId],
	);
	if (!rows[0]) return null;
	const r = rows[0];
	if (r.stale) await pool.query("update ai_connections set last_used_at = now() where id = $1", [r.connection_id]);
	// 볼 수 있는 장부: 공용 + 내 개인 (권한 모듈 자리)
	const ledgers = await pool.query(
		"select id from ledgers where household_id = $1 and (kind = 'shared' or owner_member_id = $2)",
		[r.household_id, r.member_id],
	);
	return {
		connectionId: r.connection_id,
		access: r.access,
		memberId: r.member_id,
		householdId: r.household_id,
		ledgerIds: ledgers.rows.map((l) => l.id),
	};
}

const krw = (n: number | string) => `${Number(n).toLocaleString("ko-KR")}원`;
const money = (n: number | string) => ({ amount: Number(n), currency: "KRW", display: krw(n) });
const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }] });
const fail = (code: string, message: string) => ({
	isError: true,
	content: [{ type: "text" as const, text: JSON.stringify({ code, message }) }],
});

const INSTRUCTIONS = `oat는 가족 가계부예요. 규칙:
- 금액은 원 단위 정수예요. 응답의 display 문자열을 그대로 사용자에게 보여주세요.
- 기록을 만들기 전에 get_context로 지갑·장부·카테고리 ID를 확인하세요. 맞는 카테고리가 없으면 '미분류'를 쓰세요. 카테고리를 새로 만들 수는 없어요.
- add_spending이 possible_duplicate를 돌려주면 저장되지 않은 거예요. 사용자에게 같은 결제인지 물어보고, 다른 결제라고 하면 allow_duplicate: true로 다시 호출하세요. 묻지 않고 allow_duplicate를 붙이지 마세요.
- 수정·삭제에는 get_record/search_records에서 받은 version이 필요해요.`;

function buildServer(a: Access) {
	const server = new McpServer({ name: "oat-poc", version: "0.0.1" }, { instructions: INSTRUCTIONS });
	const inLedgers = "ledger_id = any($2::uuid[])";

	server.registerTool(
		"get_context",
		{
			title: "가계부 기본 정보",
			description: "가구원, 볼 수 있는 장부, 지갑, 카테고리와 이 연결의 권한을 돌려줘요. 다른 툴에 넘길 ID는 여기서 얻어요.",
			inputSchema: {},
			annotations: { readOnlyHint: true },
		},
		async () => {
			const [members, ledgers, wallets, cats] = await Promise.all([
				pool.query("select id, display_name, (id = $2) as is_me from household_members where household_id = $1 and status='active'", [a.householdId, a.memberId]),
				pool.query("select id, kind, name from ledgers where id = any($1::uuid[])", [a.ledgerIds]),
				pool.query("select id, name, kind from wallets where household_id = $1", [a.householdId]),
				pool.query("select id, name from categories where household_id = $1", [a.householdId]),
			]);
			return ok({
				today: "2026-11-20",
				access: a.access,
				members: members.rows,
				ledgers: ledgers.rows,
				wallets: wallets.rows,
				categories: cats.rows,
			});
		},
	);

	server.registerTool(
		"search_records",
		{
			title: "기록 찾기",
			description: "볼 수 있는 장부에서 기록을 찾아요. 기간(from/to, YYYY-MM-DD)과 검색어로 좁혀요. 최대 100건.",
			inputSchema: {
				from: z.string().optional(),
				to: z.string().optional(),
				query: z.string().optional(),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ from, to, query }) => {
			const { rows } = await pool.query(
				`select r.id, r.date, r.title, r.amount, r.version, l.name as ledger, w.name as wallet, c.name as category, r.memo
				   from records r join ledgers l on l.id = r.ledger_id join wallets w on w.id = r.wallet_id
				   left join categories c on c.id = r.category_id
				  where r.household_id = $1 and r.${inLedgers}
				    and ($3::text is null or r.date >= $3) and ($4::text is null or r.date <= $4)
				    and ($5::text is null or r.title ilike '%' || $5 || '%')
				  order by r.date desc, r.created_at desc limit 100`,
				[a.householdId, a.ledgerIds, from ?? null, to ?? null, query ?? null],
			);
			return ok({ count: rows.length, records: rows.map((r) => ({ ...r, amount: money(r.amount) })) });
		},
	);

	// 조회만 연결에서도 쓰기 툴을 목록에 둬요. 숨기면 Claude가 예전 목록으로 불렀다가 "툴 없음"을 받고
	// "일시적인 연결 문제"로 잘못 안내했어요(PoC에서 봄). 대신 이유와 해결 방법을 담아 거절해요.
	const readOnly = () =>
		a.access !== "read_write"
			? fail("write_not_allowed", "이 AI 연결은 조회만 허락됐어요. oat 앱의 설정 → AI 연결에서 쓰기를 허락하면 바로 쓸 수 있어요.")
			: null;

	server.registerTool(
		"add_spending",
		{
			title: "지출 추가",
			description:
				"지출 한 건을 기록해요. 같은 지갑·날짜·금액의 기록이 이미 있으면 저장하지 않고 possible_duplicate를 돌려줘요.",
			inputSchema: {
				ledger_id: z.string().uuid(),
				date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				title: z.string().min(1).describe("가맹점 또는 기록 이름"),
				amount: z.number().int().positive().describe("원 단위 정수"),
				wallet_id: z.string().uuid(),
				category_id: z.string().uuid().optional(),
				memo: z.string().optional(),
				allow_duplicate: z.boolean().optional().describe("사용자가 다른 결제라고 확인했을 때만 true"),
			},
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
		},
		async (input) => {
			const denied = readOnly();
			if (denied) return denied;
			if (!a.ledgerIds.includes(input.ledger_id)) return fail("ledger_not_visible", "이 장부에는 쓸 수 없어요.");
			// 질문 3: 내용으로 중복 확인. 볼 수 있는 장부 안에서만 찾아요(배우자 개인 기록을 드러내지 않게).
			if (!input.allow_duplicate) {
				const dup = await pool.query(
					`select r.id, r.date, r.title, r.amount, r.created_at from records r
					  where r.household_id = $1 and r.${inLedgers} and r.wallet_id = $3 and r.date = $4 and r.amount = $5`,
					[a.householdId, a.ledgerIds, input.wallet_id, input.date, input.amount],
				);
				if (dup.rows.length) {
					log("tool.duplicate_detected", { connectionId: a.connectionId, input });
					return ok({
						status: "possible_duplicate",
						saved: false,
						existing: dup.rows.map((r) => ({ ...r, amount: money(r.amount) })),
						next: "사용자에게 같은 결제인지 물어보세요. 다른 결제면 allow_duplicate: true로 다시 호출하세요.",
					});
				}
			}
			const client = await pool.connect();
			try {
				await client.query("begin");
				const r = (
					await client.query(
						`insert into records(household_id,ledger_id,date,title,amount,wallet_id,category_id,memo)
						 values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
						[a.householdId, input.ledger_id, input.date, input.title, input.amount, input.wallet_id, input.category_id ?? null, input.memo ?? null],
					)
				).rows[0];
				await audit(client, a, r.ledger_id, r.id, "create", null, r);
				await client.query("commit");
				return ok({ status: "created", record: { id: r.id, version: r.version, date: r.date, title: r.title, amount: money(r.amount) } });
			} catch (e) {
				await client.query("rollback");
				throw e;
			} finally {
				client.release();
			}
		},
	);

	server.registerTool(
		"delete_record",
		{
			title: "기록 삭제",
			description: "기록 한 건을 지워요. search_records에서 받은 version이 필요해요. 앱의 'AI가 바꾼 기록'에서 되돌릴 수 있어요.",
			inputSchema: { record_id: z.string().uuid(), version: z.number().int() },
			annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
		},
		async ({ record_id, version }) => {
			const denied = readOnly();
			if (denied) return denied;
			const client = await pool.connect();
			try {
				await client.query("begin");
				const cur = await client.query(
					`select * from records where id = $1 and household_id = $3 and ledger_id = any($2::uuid[]) for update`,
					[record_id, a.ledgerIds, a.householdId],
				);
				if (!cur.rows[0]) {
					await client.query("rollback");
					return fail("not_found", "기록을 찾을 수 없어요.");
				}
				if (cur.rows[0].version !== version) {
					await client.query("rollback");
					return fail("version_conflict", "그 사이 기록이 바뀌었어요. 다시 조회하세요.");
				}
				await client.query("delete from records where id = $1", [record_id]);
				await audit(client, a, cur.rows[0].ledger_id, record_id, "delete", cur.rows[0], null);
				await client.query("commit");
				return ok({ status: "deleted", record_id });
			} catch (e) {
				await client.query("rollback");
				throw e;
			} finally {
				client.release();
			}
		},
	);
	return server;
}

async function audit(
	client: { query: (q: string, p: unknown[]) => Promise<unknown> },
	a: Access,
	ledgerId: string,
	entityId: string,
	action: string,
	before: unknown,
	after: unknown,
) {
	await client.query(
		`insert into audit_log(household_id,ledger_id,actor_member_id,entry_point,ai_connection_id,entity_type,entity_id,action,before,after)
		 values ($1,$2,$3,'mcp',$4,'record',$5,$6,$7,$8)`,
		[a.householdId, ledgerId, a.memberId, a.connectionId, entityId, action, before, after],
	);
}

export const mcpHandler = requireMcpAuth(
	auth,
	async (req, claims) => {
		const userId = String(claims.sub);
		const clientId = String(claims.azp);
		const body = req.method === "POST" ? await req.clone().json().catch(() => null) : null;
		const msgs = Array.isArray(body) ? body : body ? [body] : [];
		log("mcp.request", {
			method: req.method,
			clientId,
			ua: req.headers.get("user-agent"),
			protocol: req.headers.get("mcp-protocol-version"),
			rpc: msgs.map((m) => ({ id: m.id, method: m.method, tool: m.params?.name, args: m.params?.arguments })),
		});
		const a = await loadAccess(userId, clientId);
		if (!a) {
			log("mcp.rejected", { userId, clientId, reason: "no active connection or not a member" });
			return new Response(JSON.stringify({ error: "invalid_token", error_description: "AI 연결이 해지됐거나 가구원이 아니에요." }), {
				status: 401,
				headers: {
					"content-type": "application/json",
					"www-authenticate": `Bearer error="invalid_token", resource_metadata="${new URL("/.well-known/oauth-protected-resource/mcp", MCP_RESOURCE)}"`,
				},
			});
		}
		const server = buildServer(a);
		const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
		await server.connect(transport);
		const res = await transport.handleRequest(req);
		const text = await res.clone().text();
		log("mcp.response", { status: res.status, body: text.slice(0, 1500) });
		return res;
	},
	{ resource: MCP_RESOURCE },
);
