// 인증 PoC 앱: 실행하면 #1(수동 Cookie 헤더) 시나리오를 자동으로 돌리고 결과를 서버 /poc-log로 보내요.
// 소셜 로그인(#2)은 버튼으로 직접 눌러요.
import { useEffect, useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { File, Paths } from "expo-file-system";
import { authClient, BASE } from "./lib-auth";

type Line = { name: string; ok: boolean; detail: string };

async function report(kind: string, payload: unknown) {
	await fetch(`${BASE}/poc-log`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		credentials: "omit",
		body: JSON.stringify({ kind, payload }),
	}).catch(() => {});
}

async function echo(init: RequestInit) {
	const r = await fetch(`${BASE}/v1/echo-headers`, init);
	return (await r.json()) as Record<string, string>;
}
const countSession = (c?: string) => (c ?? "").split(";").filter((p) => p.trim().includes("session_token=")).length;

async function runCookieTests(): Promise<Line[]> {
	const out: Line[] = [];
	const push = (name: string, ok: boolean, detail: string) => out.push({ name, ok, detail });
	await authClient.signOut().catch(() => {});
	const email = `sim${Date.now()}@poc.test`;
	const su = await authClient.signUp.email({ email, password: "password-1234", name: "sim" });
	push("가입(로그인)", !su.error, su.error?.message ?? email);

	const cookie = await authClient.getCookie();
	push("getCookie()에 세션이 있음", countSession(cookie) === 1, cookie.slice(0, 60));

	// 1) 문서 방식: 수동 Cookie + credentials omit
	const e1 = await echo({ headers: { cookie }, credentials: "omit" });
	push("수동 Cookie + omit → 서버가 받은 session_token 개수", countSession(e1.cookie) === 1, `${countSession(e1.cookie)}개: ${(e1.cookie ?? "(없음)").slice(0, 60)}`);

	// 2) 수동 헤더 없이 omit → 아무것도 안 가야 함
	const e2 = await echo({ credentials: "omit" });
	push("헤더 없이 omit → 쿠키 안 감", !e2.cookie, e2.cookie ?? "(없음)");

	// 3) 수동 헤더 없이 include → iOS 시스템 쿠키 저장소가 몰래 저장해 뒀는지
	const e3 = await echo({ credentials: "include" });
	push("헤더 없이 include → 시스템 저장소가 저장했나(없어야 좋음)", !e3.cookie, e3.cookie ? `저장돼 있음: ${e3.cookie.slice(0, 60)}` : "(없음)");

	// 4) 수동 헤더 + include → 중복 전송되는지
	const e4 = await echo({ headers: { cookie }, credentials: "include" });
	push("수동 Cookie + include → 중복 여부", countSession(e4.cookie) === 1, `${countSession(e4.cookie)}개`);

	// 5) 세션 확인과 우리 API
	const me = await fetch(`${BASE}/v1/me`, { headers: { cookie }, credentials: "omit" });
	push("수동 Cookie → /v1/me", me.status === 200, String(me.status));

	// 6) SecureStore에 저장된 모양
	const raw = await SecureStore.getItemAsync("oat_cookie");
	push("SecureStore oat_cookie 저장", !!raw, (raw ?? "").slice(0, 80));
	return out;
}

// #5 대응 규칙: 앱 삭제 때 같이 지워지는 곳(문서 폴더)에 설치 표시를 두고,
// 표시가 없으면 새 설치로 보고 Keychain에 남은 세션을 지워요
async function freshInstallGuard() {
	const marker = new File(Paths.document, "installed");
	if (marker.exists) return false;
	await SecureStore.deleteItemAsync("oat_cookie");
	await SecureStore.deleteItemAsync("oat_session_data");
	marker.create();
	return true;
}

// #5: 켜자마자(다른 동작 전에) 기기에 남은 세션이 있는지, 서버에서 살아 있는지 보고해요
async function bootReport() {
	const cleared = process.env.EXPO_PUBLIC_GUARD === "0" ? null : await freshInstallGuard();
	const raw = await SecureStore.getItemAsync("oat_cookie");
	const cookie = await authClient.getCookie();
	const me = cookie ? (await fetch(`${BASE}/v1/me`, { headers: { cookie }, credentials: "omit" })).status : null;
	await report("boot", { guardCleared: cleared, secureStoreHasCookie: !!raw && raw !== "{}", meStatus: me });
}

export default function App() {
	const [lines, setLines] = useState<Line[]>([]);
	const [status, setStatus] = useState("실행 중…");
	const session = authClient.useSession();

	useEffect(() => {
		bootReport().then(() => runCookieTests())
			.then(async (r) => {
				setLines(r);
				setStatus("끝");
				await report("cookie-tests", r);
			})
			.catch(async (e) => {
				setStatus(`오류: ${e}`);
				await report("cookie-tests-error", String(e?.stack ?? e));
			});
	}, []);

	const social = async (provider: "kakao" | "naver" | "google") => {
		const r = await authClient.signIn.social({ provider, callbackURL: "/" });
		const cookie = await authClient.getCookie();
		const me = await fetch(`${BASE}/v1/me`, { headers: { cookie }, credentials: "omit" });
		const body = { provider, error: r.error ?? null, cookieHasSession: countSession(cookie) === 1, me: me.status };
		setStatus(JSON.stringify(body));
		await report("social", body);
	};

	return (
		<ScrollView contentContainerStyle={{ padding: 20, paddingTop: 70 }}>
			<Text style={{ fontSize: 20, fontWeight: "700" }}>oat 인증 PoC</Text>
			<Text>{status}</Text>
			<Text>세션 사용자: {session.data?.user.email ?? "없음"}</Text>
			{lines.map((l) => (
				<View key={l.name} style={{ marginTop: 8 }}>
					<Text style={{ color: l.ok ? "#14573F" : "#F04452", fontWeight: "600" }}>{l.ok ? "✓" : "✗"} {l.name}</Text>
					<Text style={{ fontSize: 11, color: "#666" }}>{l.detail}</Text>
				</View>
			))}
			<View style={{ marginTop: 24, gap: 8 }}>
				<Button title="카카오 로그인" onPress={() => social("kakao")} />
				<Button title="네이버 로그인" onPress={() => social("naver")} />
				<Button title="구글 로그인(웹)" onPress={() => social("google")} />
				<Button title="로그아웃" onPress={() => authClient.signOut()} />
			</View>
		</ScrollView>
	);
}
