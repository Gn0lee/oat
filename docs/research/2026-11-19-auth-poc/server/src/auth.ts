// 인증 PoC 서버 설정. 실제 서비스 설정이 아니라 확인 항목을 켜고 끄기 위한 것이에요.
import { betterAuth } from "better-auth";
import { bearer, jwt, openAPI } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { mcp } from "@better-auth/mcp";
import pg from "pg";

const env = process.env;
export const BASE_URL = env.BASE_URL ?? "http://localhost:3000";
export const MCP_RESOURCE = `${BASE_URL}/mcp`;
export const USE_BEARER = env.BEARER === "1";

export const pool = new pg.Pool({
	connectionString: env.DATABASE_URL ?? "postgres://postgres:poc@localhost:55432/auth",
});

export const auth = betterAuth({
	baseURL: BASE_URL,
	secret: env.BETTER_AUTH_SECRET ?? "poc-secret-poc-secret-poc-secret-0000",
	database: pool,
	emailAndPassword: { enabled: true },
	// #2: .env에 키가 있는 provider만 켜요. 콜백은 http://localhost:3000/api/auth/callback/<provider>
	socialProviders: {
		...(env.KAKAO_CLIENT_ID ? { kakao: { clientId: env.KAKAO_CLIENT_ID, clientSecret: env.KAKAO_CLIENT_SECRET ?? "" } } : {}),
		...(env.NAVER_CLIENT_ID ? { naver: { clientId: env.NAVER_CLIENT_ID, clientSecret: env.NAVER_CLIENT_SECRET ?? "" } } : {}),
		...(env.GOOGLE_CLIENT_ID ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET ?? "" } } : {}),
	},
	session: {
		// #4 축소 재현용: SESSION_EXPIRES=600 UPDATE_AGE=120 처럼 줄여서 돌려요
		expiresIn: Number(env.SESSION_EXPIRES ?? 60 * 60 * 24 * 7),
		updateAge: Number(env.UPDATE_AGE ?? 60 * 60 * 24),
	},
	trustedOrigins: ["oat://"],
	// 세션 JWT 발급 경로를 닫아요(리서치 5.3)
	disabledPaths: ["/token"],
	plugins: [
		expo(),
		jwt({ disableSettingJwtHeader: true }),
		mcp({
			resource: MCP_RESOURCE,
			loginPage: "/login",
			consentPage: "/consent",
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: true,
		}),
		openAPI(),
		...(USE_BEARER ? [bearer({ requireSignature: true })] : []),
	],
});
