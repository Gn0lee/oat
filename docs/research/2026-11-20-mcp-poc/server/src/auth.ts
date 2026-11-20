// MCP 툴 설계 PoC의 인증 설정. 실제 서비스 설정이 아니라 확인 항목을 켜고 끄기 위한 것이에요.
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { mcp } from "@better-auth/mcp";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import pg from "pg";
import { log } from "./log.js";

const env = process.env;
export const BASE_URL = env.BASE_URL ?? "http://localhost:3000";
export const MCP_RESOURCE = `${BASE_URL}/mcp`;

export const pool = new pg.Pool({
	connectionString: env.DATABASE_URL ?? "postgres://postgres:poc@localhost:55433/mcp",
});

// 초대제 동안의 허용 목록(앞부분 일치). 조사한 client_id 문서 주소예요.
export const CIMD_ALLOWLIST = [
	"https://claude.ai/oauth/", // Claude 웹·데스크톱·폰, Claude Code
	"https://chatgpt.com/oauth/", // ChatGPT, Codex
	"https://nousresearch.github.io/hermes-agent/", // Hermes Agent(…/docs/oauth/client-metadata.json)
];
const ALLOW_ALL = env.CIMD_ALLOW_ALL === "1";
// Better Auth 기본값(["post_logout_redirect_uris","client_uri"])은 Hermes를 거절해요(PoC에서 재현:
// client_id는 nousresearch.github.io, client_uri는 hermes-agent.nousresearch.com). 결정은 client_uri를 빼는 것.
// 실행할 때 CIMD_ORIGIN_BOUND=relaxed로 켰어요. 기본값은 재현용으로 남겨 둬요.
const ORIGIN_BOUND = env.CIMD_ORIGIN_BOUND === "relaxed" ? ["post_logout_redirect_uris"] : undefined;

export const auth = betterAuth({
	baseURL: BASE_URL,
	secret: env.BETTER_AUTH_SECRET ?? "poc-secret-poc-secret-poc-secret-0000",
	database: pool,
	emailAndPassword: { enabled: true },
	session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 },
	trustedOrigins: [BASE_URL],
	disabledPaths: ["/token"],
	advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
	plugins: [
		jwt({ disableSettingJwtHeader: true }),
		mcp({
			resource: MCP_RESOURCE,
			loginPage: "/oauth/login",
			consentPage: "/oauth/consent",
			// 갱신 동작을 빨리 보려고 5분으로 줄여요(운영 기본은 1시간)
			accessTokenExpiresIn: Number(env.ACCESS_TOKEN_TTL ?? 300),
			scopes: ["openid", "profile", "email", "offline_access", "oat"],
		}),
		cimd({
			fetchClientMetadataResource,
			metadataProfile: "mcp-2026-07-28",
			...(ORIGIN_BOUND ? { originBoundFields: ORIGIN_BOUND } : {}),
			isMetadataDocumentUrlAllowed: (url) => {
				const allowed = ALLOW_ALL || CIMD_ALLOWLIST.some((p) => url.startsWith(p));
				log("cimd.gate", { url, allowed });
				return allowed;
			},
			onClientCreated: ({ client, clientMetadataDocument }) =>
				log("cimd.created", { clientId: client.clientId, doc: clientMetadataDocument }),
			onClientRefreshed: ({ client }) => log("cimd.refreshed", { clientId: client.clientId }),
		}),
	],
});
