# Better Auth 모바일 세션 전송 방식: Expo 쿠키 헤더 vs bearer

- 조사일: 2026-11-17
- 대상 티켓: 서버 아키텍처 (wayfinder-522), 앞선 조사: `docs/research/2026-11-11-auth-services.md` (셀프호스팅 Better Auth 1.7.x 추천)
- 방법: Better Auth 공식 문서(better-auth.com, 각 페이지의 `.md` 원문), 공식 GitHub 저장소 소스(`main`, 2026-11-17 조회 시 `@better-auth/expo`·`@better-auth/mcp` 패키지 버전 1.7.25), GitHub 릴리스 노트, Expo 공식 문서만 썼어요. 확인하지 못한 내용은 "미확인", 소스를 읽고 내린 해석은 "추론"으로 표시했어요.
- 버전 기준: 안정 v1.7.25 (2026-11-14), 베타 v1.8.0-beta.10 (2026-11-15). 11-11 조사 때의 1.7.20에서 5개 패치가 더 나왔어요. 출처: https://github.com/better-auth/better-auth/releases
- 소스 경로 표기: `packages/...`는 https://github.com/better-auth/better-auth 저장소 기준이에요.

## 1. 결론 먼저

1. **이번 앱의 1차 선택은 (A) `@better-auth/expo` 쿠키 헤더 전송이에요.** 카카오·네이버·구글 웹 같은 리다이렉트 로그인을 앱 딥링크로 되돌리는 공식 경로가 Expo 플러그인에만 있어요. bearer 플러그인에는 그 경로가 없어요.
2. **bearer는 "세션 토큰 그 자체를 `Authorization` 헤더로 보내는 얇은 변환기"예요.** 서명된 세션 쿠키 값(`토큰.서명`)을 그대로 쓰고, 서버가 DB 세션을 조회해요. JWT가 아니고 상태 없는 토큰도 아니에요.
3. **두 플러그인은 서로의 문서에 언급이 없고, 함께 쓰는 방법도 문서에 없어요.** 서버 훅은 독립적이라 충돌할 이유는 소스상 보이지 않지만(추론), 병용은 실기기 PoC 전에는 가정으로만 둬야 해요.
4. **MCP 액세스 토큰과 세션은 섞이지 않아요.** bearer 훅은 JWT를 서명 검증에서 걸러내요. 위험은 JWT 플러그인이 만드는 "세션 JWT"가 같은 서명 키를 쓰는 점이고, 공식 문서가 `/token`과 `set-auth-jwt`를 끄라고 해요.
5. **세션 토큰은 갱신해도 값이 바뀌지 않아요.** 슬라이딩 갱신은 DB 만료 시각만 늘려요. 다만 Expo 클라이언트는 쿠키 만료를 로컬에서 따로 기록해서, 앱이 `Set-Cookie`를 못 받으면 서버에서는 살아 있는 세션을 클라이언트가 먼저 버릴 수 있어요(소스 기반 추론, 6장).
6. **네이티브 Swift/Kotlin 전환 대비로는 bearer가 더 깔끔해요.** 그래서 지금은 Expo 방식으로 가되, 서버 세션 미들웨어를 "쿠키 또는 Authorization 헤더 둘 다 받는 구조"로 열어 두고 `bearer()`는 네이티브 앱이 생길 때 추가하는 쪽을 권해요(9장).

## 2. Q1: `@better-auth/expo`는 세션을 어떻게 전송하나요

### 2.1 동작 방식 (소스 확인)

클라이언트 플러그인(`packages/expo/src/client.ts`)이 하는 일이에요.

- 서버가 보낸 `Set-Cookie`를 파싱해서 **`{ 쿠키이름: { value, expires } }` 형태의 JSON 맵**으로 `expo-secure-store`에 저장해요. 키는 `${storagePrefix}_cookie`(기본 접두사 `better-auth`)예요. Better Auth 쿠키(`session_token`, `session_data` 등)가 들어 있는 `Set-Cookie`만 처리해요.
- 모든 Better Auth 클라이언트 요청 직전(`init` 훅)에 `credentials: "omit"`로 바꾸고, 저장된 쿠키를 **`cookie` 헤더로 직접 붙여요**. 같은 훅에서 `expo-origin` 헤더(`Linking.createURL("", { scheme })` 값)와 `x-skip-oauth-proxy: true`도 붙여요.
- 만료된 항목은 보내지 않아요. `getCookie()`가 `expires`가 지난 쿠키를 건너뛰고 `이름=값; 이름=값` 문자열을 만들어요.
- `signIn.social`로 리다이렉트 URL이 돌아오면 `expo-web-browser`의 `openAuthSessionAsync`로 열어요. 그 흐름은 2.3에 따로 적었어요.
- 세션 데이터(`/get-session` 응답)도 SecureStore에 캐시해요(`disableCache`로 끌 수 있어요).

공식 문서도 같은 설명이에요: "플러그인이 쿠키를 안전하게 저장하고 인증 요청 헤더에 자동으로 추가"해요. 출처: https://better-auth.com/docs/integrations/expo.md , 소스 https://github.com/better-auth/better-auth/blob/main/packages/expo/src/client.ts

### 2.2 Better Auth 클라이언트가 아닌 fetch에 세션 붙이기

공식 문서의 안내는 이래요(원문 요지): 서버에 세션이 필요한 요청을 직접 보내려면 SecureStore의 쿠키를 꺼내 요청 헤더에 수동으로 넣어야 해요.

```ts
const cookies = await authClient.getCookie();
const headers = { Cookie: cookies };
const response = await fetch("http://localhost:8081/api/secure-endpoint", {
  headers,
  // 'include' can interfere with the cookies we just set manually in the headers
  credentials: "omit",
});
```

tRPC 예시도 같은 방식으로 `httpBatchLink`의 `headers()` 안에서 `await authClient.getCookie()`를 써요. 출처: https://better-auth.com/docs/integrations/expo.md ("Making Authenticated Requests to Your Server")

openapi-fetch에는 같은 패턴을 요청 미들웨어로 옮기면 돼요. 아래는 문서 패턴을 옮긴 예시이고 이번 조사에서 실행해 보지는 않았어요. openapi-fetch의 미들웨어 API는 이번 조사 범위 밖이라 **시그니처는 미확인**이에요.

```ts
// 예시(미검증): openapi-fetch 미들웨어에서 쿠키 헤더 붙이기
client.use({
  async onRequest({ request }) {
    const cookie = await authClient.getCookie(); // 1.7부터 Promise
    if (cookie) request.headers.set("cookie", cookie);
    return request;
  },
});
// fetch 옵션은 credentials: "omit" 유지
```

1.7부터 `getCookie()`는 비동기(Promise)로 바뀌었어요. 반드시 `await` 해야 해요. 출처: https://better-auth.com/docs/guides/1-7-upgrade-guide.md ("Expo and React Native")

### 2.3 리다이렉트 로그인(카카오·네이버·구글 웹)은 어떻게 앱으로 돌아오나요

소스(`packages/expo/src/index.ts`, `routes.ts`, `client.ts`) 기준 흐름이에요.

1. 앱이 `signIn.social({ provider, callbackURL })`을 호출해요. 서버는 `{ url, redirect: true }`를 돌려줘요.
2. 클라이언트가 곧바로 provider URL을 열지 않고 **`/expo-authorization-proxy`**를 `openAuthSessionAsync`로 열어요. 이 엔드포인트가 브라우저 쪽에 OAuth state 쿠키를 심고 provider로 리다이렉트해요. 앱의 HTTP 클라이언트가 받은 state 쿠키는 시스템 브라우저에 없기 때문에 필요한 우회예요.
3. provider가 서버의 `/callback/:id`로 돌려보내요. 서버가 세션을 만들고 앱 딥링크(`myapp://...`)로 302를 보내요.
4. **서버 Expo 플러그인의 after 훅**이, 리다이렉트 대상이 http(s)가 아닌 신뢰된 스킴이면 응답의 `Set-Cookie` 전체를 딥링크 쿼리 `?cookie=...`에 붙여요. 대상이 `trustedOrigins`에 없으면 붙이지 않아요.
5. 클라이언트가 딥링크 결과 URL에서 `cookie` 값을 읽어 SecureStore에 저장하고 세션 상태를 갱신해요.

공식 문서에 따르면 프록시는 구성된 소셜/제네릭 OAuth provider의 인가 엔드포인트로만 리다이렉트하고, SSO provider는 해당 origin을 `trustedOrigins`에 넣어야 해요. 출처: https://better-auth.com/docs/integrations/expo.md

### 2.4 필수 요건

- **scheme**: `app.json`의 `scheme`을 읽거나 `expoClient({ scheme })`로 지정해요. 둘 다 없으면 네이티브에서 클라이언트 생성이 예외로 끝나요(소스).
- **trustedOrigins**: 서버에 `["myapp://"]` 같은 앱 스킴이 필요해요. 개발 모드에서만 `exp://` 계열을 허용하고, 운영에서는 쓰지 말라고 문서가 경고해요. 서버 Expo 플러그인은 `NODE_ENV === "development"`일 때 `exp://`를 자동 추가해요(소스).
- **`expo-origin` 헤더**: 클라이언트가 자동으로 넣어요. 서버 플러그인의 `onRequest`가 요청에 `origin`이 없을 때 `expo-origin` 값을 `origin`으로 복사해서 Origin 검사를 통과시켜요. `disableOriginOverride`로 끌 수 있어요(소스, 문서).
- **Origin 검사 범위**: 소스(`packages/better-auth/src/api/middlewares/origin-check.ts`)를 보면 Origin 검증은 요청에 **`cookie` 헤더가 있을 때만** 강제돼요. 우리 앱 API(Hono의 자체 라우트)는 Better Auth 라우터를 거치지 않으므로 이 검사 대상이 아니에요(추론). Better Auth 라우트(`/api/auth/*`)로 쿠키와 함께 가는 POST에만 `expo-origin`이 필요해요.
- **SDK 요건**: Expo SDK 55(React Native 0.83, React 19.2)와 New Architecture가 문서상 요건이에요. 피어 의존성은 `expo-constants>=17`, `expo-linking>=7`, `expo-network>=8.0.7`, `expo-secure-store>=12.5`, `expo-web-browser>=14`예요. 출처: https://better-auth.com/docs/integrations/expo.md , `packages/expo/package.json`
- **SecureStore 한계**: Expo 문서는 값 크기 제한을 명시하지 않고 "일부 iOS 버전은 약 2048바이트를 넘는 값을 거부했다"고 적어요. Better Auth는 1800바이트 단위로 쪼개 저장해요(소스 `client-storage.ts`). iOS는 Keychain에 저장돼서 앱 삭제 후 재설치에도 값이 남을 수 있지만 "보장되지 않으니 의존하지 말라"고 해요. 출처: https://docs.expo.dev/versions/latest/sdk/securestore/

## 3. Q2: `bearer` 플러그인은 어떻게 동작하나요

### 3.1 토큰의 정체와 검증 (소스 `packages/better-auth/src/plugins/bearer/index.ts`)

- **토큰은 세션 토큰 그 자체예요. JWT가 아니에요.** 형태는 세션 쿠키 값과 같은 `세션토큰.HMAC서명`이에요. 서명은 `BETTER_AUTH_SECRET`으로 한 HMAC-SHA256(base64url)이에요.
- **발급**: 응답에 세션 `Set-Cookie`(값이 있고 `max-age`가 0이 아닌 것)가 실릴 때마다 after 훅이 그 쿠키 값을 **`set-auth-token` 응답 헤더**로 복사해요. 동시에 `Access-Control-Expose-Headers`에 `set-auth-token`을 추가해요. 로그인뿐 아니라 가입, 세션 갱신 응답, 소셜 콜백 응답에도 붙어요(소스상 조건이 "세션 쿠키가 설정되는 모든 응답"이에요).
- **검증**: `Authorization` 헤더가 있는 모든 Better Auth 요청(`auth.api.getSession({ headers })` 같은 서버 내부 호출도 포함)에서 before 훅이 돌아요.
  1. `Bearer ` 스킴이 아니면 무시해요(대소문자 구분 안 함).
  2. 토큰에 `.`이 있으면 서명된 값으로 보고(`%` 인코딩이면 디코드), 없으면 **`requireSignature`가 false(기본)일 때 서버가 직접 서명을 붙여** 서명된 값처럼 만들어요. `requireSignature: true`면 서명 없는 토큰은 무시해요.
  3. HMAC을 현재 secret으로 검증해요. 틀리면 아무것도 하지 않고 통과시켜요(세션이 없는 요청으로 처리돼요).
  4. 맞으면 요청 헤더에 세션 쿠키를 주입해요. 이후는 평소와 똑같이 쿠키 서명 검증과 **DB 세션 조회**가 일어나요.
- 따라서 세션 폐기는 DB 세션 삭제로 즉시 반영돼요(상태 있는 토큰). 토큰 자체에 만료는 없고 DB의 `expiresAt`이 유일한 만료예요.
- 공식 문서의 `requireSignature` 설명은 "서명된 토큰을 요구, 기본 false"가 전부예요. 문서는 토큰 형식, 만료, 폐기, CORS 노출 헤더를 다루지 않아요. 위 내용은 전부 소스에서 확인한 거예요. 출처: https://better-auth.com/docs/plugins/bearer.md

### 3.2 토큰을 얻는 방법 두 가지

1. **`set-auth-token` 응답 헤더**: 서명된 값이에요. 문서 예시는 `onSuccess: (ctx) => ctx.response.headers.get("set-auth-token")`이에요.
2. **응답 JSON의 `token` 필드**: `POST /sign-in/email`과 `POST /sign-in/social`의 ID 토큰 분기는 `{ redirect, token, url, user }`를 돌려주고, `token`은 **서명 없는 원본 세션 토큰**이에요(소스 `packages/better-auth/src/api/routes/sign-in.ts`). 기본 설정(`requireSignature: false`)에서는 이 값도 Bearer로 통해요. `requireSignature: true`로 올리면 헤더의 서명된 값만 써야 해요.

문서는 헤더 방식만 설명해요. JSON `token`을 Bearer로 쓰는 것은 소스에서 읽은 동작이라 공식 문서의 약속은 아니에요(추론).

### 3.3 Expo와 같이 쓰는 방법은 문서화돼 있나요

아니요. Expo 통합 문서에는 bearer 언급이 없고, bearer 문서는 `localStorage` 예시뿐이에요(브라우저 가정이고, 문서 자체가 "쿠키를 지원하지 않거나 Bearer 토큰이 필요한 API 전용이며 잘못 구현하면 보안 취약점이 생기기 쉽다"고 경고해요). 출처: https://better-auth.com/docs/plugins/bearer.md , https://better-auth.com/docs/integrations/expo.md

### 3.4 리다이렉트 소셜 로그인과의 호환

- 리다이렉트 흐름의 마지막 응답은 `/callback/:id`가 보내는 **302**예요. bearer after 훅은 이 302에도 `set-auth-token`을 붙여요(조건이 "세션 쿠키가 설정됨"이라서). 하지만 `openAuthSessionAsync`(ASWebAuthenticationSession, Android Custom Tabs)는 앱에 **최종 URL만** 돌려주고 응답 헤더는 보여주지 않아요(이 부분은 Expo 문서 `AuthSession`/`WebBrowser`를 직접 확인하지 못해 추론이에요). 즉 bearer만으로는 브라우저 안에서 일어난 로그인 결과를 앱이 받을 방법이 없어요.
- 문서에 "bearer + 리다이렉트 OAuth" 절차는 없어요(**미확인이 아니라 문서에 없음을 확인**: bearer 문서 전문과 Expo 문서 전문에 해당 절차가 없어요).
- 앱에 세션을 넘기는 공식 장치는 Expo 서버 플러그인의 `?cookie=` 딥링크뿐이에요(2.3).
- 대안 설계(우리가 직접 만드는 것, 추론): `one-time-token` 플러그인으로 콜백 직후 일회용 토큰을 딥링크에 실어 보내고, 앱이 `POST /one-time-token/verify`로 교환해요. verify는 내부에서 `setSessionCookie`를 호출하므로(소스) bearer가 있으면 응답에 `set-auth-token`이 실려요. 다만 `generate`는 세션 쿠키가 필요해서(문서) 브라우저 쪽에서 쿠키가 있는 상태로 서버 페이지를 한 번 거쳐야 해요. 문서화된 조합이 아니에요. 출처: https://better-auth.com/docs/plugins/one-time-token.md
- 딥링크에 세션 자격이 실리는 점은 두 방식(Expo의 `?cookie=`, OTT 설계) 모두 같아요. 커스텀 스킴은 다른 앱이 가로챌 수 있다는 점은 일반적인 위험이지만, Expo 문서(`AuthSession`)는 리다이렉트 URL 허용 목록만 언급하고 이 위험과 Universal Link 권장은 적지 않아요. 이 부분은 PoC에서 따로 판단해야 해요.

### 3.5 Apple/Google 네이티브 ID 토큰 로그인

- 요청: `POST /sign-in/social`에 `{ provider, idToken: { token, nonce? } }`를 보내요. 브라우저를 쓰지 않고, 응답은 `{ redirect: false, token, url: undefined, user }`와 세션 `Set-Cookie`예요(소스). bearer가 켜져 있으면 `set-auth-token`도 실려요.
- 지원 provider: 문서 기준 `google`, `apple`, `facebook`만 ID 토큰 로그인을 지원해요. 소스에서도 카카오·네이버 provider 정의에는 `idToken` 설정이 없어요. 카카오·네이버는 **리다이렉트 전용**이에요. 출처: https://better-auth.com/docs/integrations/expo.md , `packages/core/src/social-providers/{kakao,naver,apple,google}.ts`
- Expo 클라이언트는 본문에 `idToken`이 있으면 브라우저를 열지 않고, 쿠키는 `link-social`일 때만 붙여요(소스).
- Apple은 네이티브 audience가 번들 ID라서 서버에 `appBundleIdentifier`가 필요하고, 이메일은 최초 인증에서만 와요(11-11 조사 및 https://better-auth.com/docs/authentication/apple.md ).

## 4. Q3: 병용 가능 여부와 공식 권장

- **병용 가능성**: 서버 훅이 서로 독립이에요. Expo 플러그인은 `/callback*` 등에서 리다이렉트 URL을 가공하고 `onRequest`에서 `origin`을 덮어써요. bearer는 `Authorization` 헤더가 있을 때 쿠키를 주입하고 응답에 헤더를 추가해요. 같은 요청에 `Cookie`와 `Authorization`이 함께 오면 bearer가 쿠키 항목을 병합하는데, 중복 항목이 생기던 버그는 1.6.10에서 고쳐졌어요(2026-05-09). 이런 조합 자체를 다루는 문서와 테스트는 이번에 확인하지 못했어요(**미확인**).
- **문서가 권하는 모바일 방식**: "Mobile & Desktop" 항목에 Expo와 Lynx 통합이 있고, Expo 문서는 쿠키 전송만 설명해요(Lynx 문서는 이번에 읽지 않았어요, 미확인). bearer 문서는 모바일/네이티브를 언급하지 않아요. "네이티브 비브라우저 클라이언트는 bearer를 쓰라"는 문장은 두 문서 어디에도 없어요. 출처: https://better-auth.com/docs/llms.txt (문서 목록), 위 두 페이지.
- 따라서 "공식 권장"은 **Expo 앱에는 Expo 플러그인**이고, bearer는 쿠키를 못 쓰는 API용 보조 수단으로 서술돼 있다고 읽는 게 정확해요.

## 5. Q4: MCP/OAuth 액세스 토큰과 세션은 섞일 수 있나요

### 5.1 서로를 어떻게 구분하나요

| 구분 | 앱 세션 | MCP/OAuth 액세스 토큰 |
|---|---|---|
| 형태 | `세션토큰.HMAC서명` (JWT 아님) | JWT (`typ: at+jwt`, `azp`, `iss`, `aud`=리소스) |
| 서명 | `BETTER_AUTH_SECRET` HMAC | JWT 플러그인의 JWKS 키 |
| 검증 | `auth.api.getSession` + DB `session` 조회 | `requireMcpAuth`(서명·issuer·audience·만료·`azp`·스코프) |
| 대상 | 우리 앱 API | MCP 리소스(`resource`로 audience 고정) |

근거: `packages/mcp/src/require-mcp-auth.ts`(검증 시 `requiredClaims: ["azp"]`, audience 기본값은 서버 base URL), 문서 https://better-auth.com/docs/plugins/oauth-provider/resource-server.md (`typ: "at+jwt"`, `requiredClaims: ["azp"]`) , https://better-auth.com/docs/plugins/mcp.md

### 5.2 bearer / getSession이 MCP 토큰을 세션으로 받아들이나

소스 기준으로는 **받아들이지 않아요**(추론, 실행 확인 아님).

- MCP 액세스 토큰은 JWT라 `.`이 두 개 있어요. bearer 훅은 `토큰.split(".")[0]`을 메시지, `[1]`을 서명으로 놓고 HMAC을 검증하는데, JWT의 헤더/페이로드 조합은 이 검증을 통과할 수 없어서 무시돼요. 쿠키가 주입되지 않으니 `getSession`은 null이에요.
- 불투명(opaque) 액세스 토큰(JWT 플러그인을 끈 설정)은 `.`이 없어서, `requireSignature: false`면 bearer가 서명을 붙여 세션 토큰으로 조회해 봐요. 조회 대상은 `session` 테이블이고 OAuth 토큰은 별도 테이블이라 일치할 수 없어요. 우리는 `resources`를 쓰는 MCP를 JWT로 발급하므로 해당 없지만, `requireSignature: true`를 쓰면 이 경로 자체가 사라져요.
- 반대로 앱 세션 토큰을 `requireMcpAuth`에 보내면 JWT 형식이 아니라 서명 검증 전에 거절돼요(추론).
- `/oauth2/userinfo` 등 OAuth 엔드포인트도 `Authorization: Bearer`를 읽어요. bearer 훅은 이 요청에서도 돌지만 JWT는 위와 같이 통과시켜서 영향이 없어요(추론).

### 5.3 실제 위험: JWT 플러그인의 세션 JWT

- MCP 플러그인은 JWT 플러그인이 필수예요. 그런데 JWT 플러그인의 `/token` 엔드포인트와 `set-auth-jwt` 헤더가 만드는 **세션 JWT가 액세스 토큰과 같은 서명 키**를 써요. 리소스 서버가 issuer와 audience만 확인하면 세션 JWT가 통과할 수 있어요. 공식 문서는 `disabledPaths: ["/token"]`과 `jwt({ disableSettingJwtHeader: true })`를 권하고, 검증 쪽에서는 `typ: "at+jwt"`와 `requiredClaims: ["azp"]`를 요구해요. 출처: https://better-auth.com/docs/plugins/jwt.md ("OAuth Provider Mode"), https://better-auth.com/docs/plugins/mcp.md
- `requireMcpAuth`는 `azp`를 필수로 요구해서 세션 JWT를 막아요(소스). 자체 구현 검증 코드를 쓴다면 `typ`와 `azp`를 꼭 넣어야 해요.

### 5.4 세션과 OAuth 토큰의 수명 연결

1.7 업그레이드 가이드에 따르면 세션이 끝난 액세스 토큰의 introspection은 `{ active: false }`를 돌려주고 `/oauth2/userinfo`도 거절해요(OIDC back-channel logout). `requireMcpAuth`는 JWKS로 서명만 검증하므로 세션 종료가 즉시 반영되는지는 이번에 확인하지 못했어요(**미확인**). 또한 `offline_access` 갱신 시 이미 죽은 세션의 `sid`가 새 액세스 토큰에 실리는 이슈가 열려 있어요(https://github.com/better-auth/better-auth/issues/12222 , 상태 open). 출처: https://better-auth.com/docs/guides/1-7-upgrade-guide.md

### 5.5 우리 서버에서 지킬 규칙

- 앱 API 미들웨어는 `auth.api.getSession`만 써요. MCP 라우트는 `requireMcpAuth`만 써요. 한 라우트에서 둘을 섞지 않아요.
- MCP 라우트의 `resource`(audience)는 앱 API base URL과 다른 값으로 고정해요(문서: audience 기본값이 base URL이라, 같은 값이면 구분이 흐려질 수 있어요. 이 해석은 추론이에요).
- JWT 플러그인은 위 두 옵션을 끄고 써요.

## 6. Q5: Swift/Kotlin 같은 비 Better Auth 클라이언트에 필요한 HTTP 호출

기본 경로 `/api/auth`(`basePath` 기본값)를 가정했어요. 출처: `packages/better-auth/src/api/routes/*.ts`, https://better-auth.com/docs/authentication/email-password.md

| 목적 | 호출 | 비고 |
|---|---|---|
| 이메일 가입 | `POST /sign-up/email` (JSON `name, email, password`) | 세션이 만들어지면 `Set-Cookie`가 와요 |
| 이메일 로그인 | `POST /sign-in/email` (JSON `email, password, rememberMe?`) | 응답 `{ redirect, token, url, user }` + `Set-Cookie`(+ bearer 시 `set-auth-token`) |
| Apple/Google 네이티브 | `POST /sign-in/social` `{ provider, idToken: { token, nonce? } }` | 브라우저 없음. 응답은 위와 같은 모양 |
| 리다이렉트 소셜 | `POST /sign-in/social` `{ provider, callbackURL }` → `{ url, redirect: true }` | 이후는 아래 설명 |
| 세션 조회 | `GET /get-session` | 세션 없음이면 200에 JSON `null`이에요(소스 스키마가 `object | null`) |
| 세션 갱신 | `GET` 호출 시 서버가 자동 갱신. `POST /get-session`은 갱신만 트리거해요 | `deferSessionRefresh` 켠 경우의 용도 |
| 로그아웃 | `POST /sign-out` (본문 선택) | 응답 `{ success, url?, redirect? }`. 세션 쿠키(또는 Bearer)가 필요해요 |

**세션 사용**: 쿠키 방식이면 로그인 응답의 `Set-Cookie`(이름 `better-auth.session_token`, 운영(secure)에서는 `__Secure-` 접두사)를 저장해 `Cookie` 헤더로 보내요. 값은 URL 인코딩된 `토큰.서명`이에요. bearer를 켜면 같은 값을 `Authorization: Bearer`로 보내요. 쿠키 이름 규칙은 https://better-auth.com/docs/concepts/cookies.md 를 참고했어요.

**리다이렉트 소셜을 네이티브가 직접 구현하려면**: `POST /sign-in/social`로 받은 URL을 그대로 브라우저에서 열면 state 쿠키가 브라우저에 없어서 콜백이 실패해요. Expo 플러그인은 `/expo-authorization-proxy`(GET, 쿼리 `authorizationURL`)를 경유해서 이를 해결해요. 네이티브 클라이언트도 이 엔드포인트를 쓸 수 있어 보이지만(서버 플러그인이 `expo()`로 켜져 있으면), 이 엔드포인트는 `scope: "server"` 메타데이터로 표시된 내부 구현이고 문서에 계약으로 적혀 있지 않아요. 안정성을 기대하기 어려워요(`routes.ts`의 `FIXME(next)`도 "서버가 발급한 서명 토큰에 바인딩"을 예고해요). 최종 콜백이 딥링크에 `?cookie=<Set-Cookie 전체>`를 붙이는 동작도 Expo 플러그인 전용이에요.

### 6.1 OpenAPI 플러그인(`openAPI()`)

- 있어요. `better-auth/plugins`의 `openAPI()`를 켜면 `/api/auth/reference`(Scalar UI)가 열리고, 스키마는 `GET /api/auth/open-api/generate-schema` 또는 `await auth.api.generateOpenAPISchema()`(서버 내부 호출)로 JSON을 받아요. 코어와 플러그인 엔드포인트가 모두 들어가고 플러그인 이름별로 태그가 나뉘어요. OpenAPI 3.1.1이에요. 문서는 플러그인이 "초기 개발 단계"라고 적어요. 출처: https://better-auth.com/docs/plugins/open-api.md
- 소스(`plugins/open-api/generator.ts`)로 확인한 특이점이에요.
  - 경로가 `basePath` 없이 `/sign-in/email` 형태로 나오고 `servers[0].url`이 `ctx.baseURL`(basePath 포함)이에요. 우리 문서에 합치려면 경로에 `/api/auth`를 붙이거나 `servers`를 따로 두어야 해요.
  - `info.version`이 `"1.1.0"`으로 하드코딩돼 있어요. Better Auth 버전과 무관해요.
  - 전역 `security`가 `apiKeyCookie`와 `bearerAuth`를 함께 선언해요. `apiKeyCookie`는 이름이 임의 문자열(`apiKeyCookie`)인 가짜 쿠키 스킴이라, 실제 세션 쿠키 이름과 달라요.
  - `SERVER_ONLY` 엔드포인트는 제외돼요. `/expo-authorization-proxy` 같은 `scope: "server"` 엔드포인트가 포함되는지는 확인하지 못했어요(**미확인**).
  - 컴포넌트 이름(`User`, `Session` 등)이 우리 스키마와 충돌할 수 있어요(추론).
- 문서의 합치기 안내는 Scalar에서 "소스 두 개"로 나란히 보여주는 방식이지 한 문서로 병합하는 게 아니에요(Hono 예시). 출처: 같은 페이지.
- **권장(추론)**: 앱용 OpenAPI 문서에는 Better Auth 엔드포인트를 섞지 않아요(앱은 Better Auth 클라이언트로 인증 엔드포인트를 호출하므로 생성 클라이언트에 필요가 없어요). 대신 CI에서 `generateOpenAPISchema()`를 호출해 **별도 JSON 스냅샷**으로 저장하고 버전 업그레이드 때 diff를 보는 계약 테스트로 써요. 저장소 자체도 이 플러그인에 스냅샷 테스트를 두고 있어요(`plugins/open-api/__snapshots__`). 운영에서는 `disableDefaultReference: true`로 Scalar UI를 끄고, `/open-api/generate-schema`는 `disabledPaths`로 막는 편이 안전해요(추론).

## 7. Q6: 세션 수명과 갱신

- **기본값**: `expiresIn` 7일(604800초), `updateAge` 1일(86400초), `freshAge` 1일. 출처: https://better-auth.com/docs/reference/options.md , https://better-auth.com/docs/concepts/session-management.md
- **갱신 동작(소스 `api/routes/session.ts`)**: `/get-session`이 호출될 때 `expiresAt - expiresIn + updateAge <= 지금`이면 세션 행의 `expiresAt`을 `지금 + expiresIn`으로 늘리고 `updatedAt`을 갱신한 뒤 같은 토큰으로 `Set-Cookie`를 다시 내려요. **토큰 값은 바뀌지 않아요.** 문서도 토큰 회전을 서술하지 않아요.
- **헤더 기반 클라이언트에서는**: bearer를 쓰면 `set-auth-token`에 같은 값이 다시 실리지만 새 토큰이 아니라서 **다시 저장할 필요가 없어요**. 서버의 DB 만료만 연장돼요. 우리 Hono 미들웨어가 `auth.api.getSession`을 부르면 같은 갱신이 DB에서 일어나요(같은 엔드포인트 로직, 추론).
- **Expo 쿠키 방식의 함정(소스 기반 추론)**: 클라이언트는 `Set-Cookie`의 `max-age`로 `expires`를 계산해 저장하고 `getCookie()`는 만료된 항목을 빼요. 우리 앱 API 호출(openapi-fetch)만 일어나고 Better Auth 클라이언트 호출이 7일 동안 한 번도 없으면, 서버 세션은 미들웨어 갱신으로 살아 있어도 클라이언트의 저장 쿠키는 만료로 간주돼 헤더가 빠질 수 있어요. 대응은 `authClient.getSession()`/`useSession()`이 앱 포그라운드마다 돌게 하거나(Expo 플러그인은 focus manager를 설치해요. 정확한 재조회 조건은 미확인) 우리 API 응답에서 갱신 `Set-Cookie`를 전달하는 방법이 있어요. bearer로 원본 토큰을 직접 보관하면 클라이언트 측 만료 계산이 없어서 이 문제가 없어요.
- **옵션**: `disableSessionRefresh`로 갱신 끄기, `deferSessionRefresh`로 GET을 읽기 전용으로 만들고 `needsRefresh: true`를 받아 POST로 갱신(읽기 복제본 구성용). `freshAge`는 1.6.0에서 "갱신 시각이 아니라 생성 시각" 기준으로 바뀌었어요(릴리스 노트).
- **쿠키 캐시**: `session.cookieCache`를 켜면 별도 `session_data` 쿠키가 생기고, 문서는 "다른 기기에서 폐기된 세션이 `maxAge`까지 살아 있을 수 있다"고 경고해요. 우리는 매 요청 DB 조회가 가능하니 끄는 편을 권해요(판단). 1.7에서는 캐시된 세션이 `session_token` 쿠키에 묶이도록 바뀌었어요.

## 8. Q7: 안정성, 버전별 변경 이력

출처는 모두 https://github.com/better-auth/better-auth/releases 의 릴리스 노트예요. 앞의 두 영역(bearer, Expo)과 우리가 쓰는 MCP/세션 영역만 추렸어요.

| 버전 | 날짜 | 변경 |
|---|---|---|
| 1.0.16 | 2024-12-12 | bearer가 서명된 토큰을 요구하도록 바뀌고 `set-auth-token` 응답 헤더 도입 |
| 1.1.0 | 2024-12-20 | bearer가 서명 없는 토큰도 기본 허용으로 바뀌고 `requireSignature` 옵션 추가. Expo 플러그인이 기본 SecureStore를 쓰지 않고 `storage`를 명시해야 하도록 변경 |
| 1.1.15 | 2025-01-29 | Expo 클라이언트의 쿠키 캐시가 원래 토큰을 덮어쓰던 문제 수정. Expo origin 덮어쓰기를 선택 옵션으로 |
| 1.2.10 | 2025-06-20 | bearer가 `set-auth-token`을 줄 때 expose-headers를 덮어쓰던 문제 수정 |
| 1.3.8 (베타 계열) | 2025-08~09 | 일부 로그인 엔드포인트가 bearer 토큰을 주지 않던 문제 수정(이슈 #4123, #4330) |
| 1.3.31 / 1.4.0 | 2025-10-25 / 2025-11-22 | Expo에서 null origin으로 Origin 검사가 실패하던 문제 수정 |
| 1.4.13 | 2026-01-15 | Expo authorization proxy와 쿠키 기반 OAuth state 수정 |
| 1.4.21 | 2026-03-01 | Expo SDK 55 버전 체계 지원 |
| 1.5.4 | 2026-03-06 | Expo origin 덮어쓰기를 가변/불변 요청 모두에서 처리 |
| 1.6.0 | 2026-04-06 | 호환성 깨짐: `freshAge`가 세션 생성 시각 기준으로 변경 |
| 1.6.10 | 2026-05-09 | bearer가 요청 헤더에 세션 쿠키를 병합할 때 중복 항목을 쓰던 문제 수정 |
| 1.6.13 | 2026-05-31 | 큰 provider 토큰 때문에 Expo에서 로그인이 풀리던 문제를 쿠키 분할 저장으로 수정 |
| 1.6.17 | 2026-06-12 | Expo authorization proxy 신뢰 검증 강화(`trustedOrigins` 밖 대상 거절), 서버 전용 엔드포인트가 HTTP로 노출되지 않게 수정 |
| **1.7.0** | 2026-08-18 | 호환성 깨짐 다수: MCP를 별도 `@better-auth/mcp` 패키지로 이동하고 `jwt()` 필수화, `withMcpAuth`가 `requireMcpAuth`로 이름 변경, `oidcProvider` 제거, `validAudiences`가 `resources`로 대체, 계정 식별이 `(issuer, accountId)` 기준으로 변경, Expo secure storage가 비동기(`getCookie()`가 Promise), 제네릭 OAuth 콜백 경로 변경, 동적 `baseURL`이 `Host`에서 origin을 구함. 출처: https://better-auth.com/docs/guides/1-7-upgrade-guide.md |
| 1.7.3 / 1.7.4 | 2026-09-06 / 09-10 | Expo 쿠키 저장 중 인증 없는 요청이 나가던 문제, 동시 갱신 중 오래된 세션 데이터/쿠키 손상, 멀티바이트 저장 문제 수정 |
| 1.7.11 | 2026-10-19 | Expo에서 세션이 있을 때 ID 토큰으로 소셜 연동하는 흐름 수정 |
| 1.7.17 | 2026-11-04 | 쿠키 state 사용 시 `state` 없는 인가 URL을 Expo 소셜 로그인이 거절 |
| 1.7.19 | 2026-11-10 | ID 토큰 전용 provider(Apple 등)에서 프록시가 매번 설정 오류를 로그하던 문제 수정 |
| 1.7.24 | 2026-11-14 | `@better-auth/expo`가 `better-auth`가 설치한 `better-call`을 쓰도록 수정 |
| 1.7.25 | 2026-11-14 | 엔드포인트 오류가 `Access-Control-Expose-Headers`를 떨구던 문제 수정 |
| 1.8.0-beta.0 ~ beta.10 | 2026-10-15 ~ 11-15 | 매 베타마다 "Breaking Changes" 절이 있어요. 예: beta.5의 세션 요구 강화(passkey 등록, 소셜 연동 등), beta.10의 UserInfo가 `403 insufficient_scope`로 바뀌고 스킴 없는 `Authorization`을 거절 |

**고정이 막아 주는 것**: (1) `Set-Cookie` 형식과 Expo 클라이언트의 저장 포맷(1.6.13, 1.7.0, 1.7.4에서 저장 방식이 바뀌었어요), (2) bearer의 서명/무서명 수용 규칙(1.0.16, 1.1.0에서 뒤집혔어요), (3) MCP 패키지 경계와 함수 이름(1.7.0), (4) 기본값(`freshAge` 1.6.0). 패치 릴리스(1.7.x)에서도 Expo 동작 수정이 자주 들어와서(위 표에서 1.7.3, 1.7.4, 1.7.11, 1.7.17, 1.7.19, 1.7.24) 마이너 고정만으로는 부족하고 **정확한 버전 고정과 패치 단위 업그레이드 검증**이 필요해요. 업그레이드 가이드도 `better-auth`와 모든 `@better-auth/*`를 같은 버전으로 올리라고 해요.

## 9. oat에 대한 결론

### 9.1 권고

**(A) `@better-auth/expo` 쿠키 헤더 전송을 1차로 채택하고, (B) bearer는 네이티브 앱이 생길 때 추가해요.**

근거예요.

1. 로그인 수단 다섯 가지(이메일, Apple 네이티브, Google, 카카오, 네이버) 중 **카카오와 네이버는 ID 토큰 로그인이 없어 리다이렉트 전용**이에요. 이 흐름을 앱 딥링크로 마무리하는 공식 장치가 Expo 플러그인(`/expo-authorization-proxy` + `?cookie=`)뿐이에요. bearer 단독은 이 구간의 공식 해법이 없어요.
2. 이 방식은 문서에 전체 절차(스킴, `trustedOrigins`, `getCookie()`, `credentials: "omit"`)가 있어요. bearer는 Expo와의 조합이 문서에 없어서 우리가 설계해야 하는 부분이 커요.
3. openapi-fetch에는 미들웨어 한 곳에서 `Cookie` 헤더를 붙이면 돼요. 앱 API는 Better Auth 라우터가 아니라 우리 Hono 라우트라서 Origin 검사도 걸리지 않아요(2.4, 추론).

단점과 대응이에요.

- **비 JS 클라이언트 관점**: 쿠키 이름(`__Secure-better-auth.session_token`)과 `토큰.서명` 값을 알아야 해서 계약이 덜 깔끔해요. 대응으로 서버 세션 미들웨어에서 `Authorization: Bearer`도 받게 열어 두고(`bearer()`를 켜기만 하면 `auth.api.getSession`이 둘 다 처리해요), OpenAPI 보안 스킴을 `http bearer`로 문서화하는 시점을 네이티브 앱 착수 때로 미뤄요. 이 전환은 추가 기능이라 기존 앱을 깨지 않아요(추론).
- **클라이언트 쪽 만료 기록**: 6장의 함정이 있어요. 앱 포그라운드마다 `getSession`이 돌게 하고, 실기기에서 7일 이상 방치 후 복귀 시나리오를 확인해야 해요.
- **MCP 분리**: `jwt()`의 `/token`과 `set-auth-jwt`를 끄고, `requireMcpAuth`의 `resource`를 앱 API와 다른 값으로 두고, 앱 API는 `getSession`만 써요(5.5).
- **bearer를 켤 때**: `requireSignature: true`를 기본으로 두는 걸 권해요(원본 토큰의 JSON 본문 수용 경로를 닫음). 단, 이 경우 클라이언트는 `set-auth-token`의 서명된 값만 써야 해요. secret 로테이션(문서의 versioned secrets) 때 서명된 bearer 토큰이 어떻게 되는지는 확인하지 못했어요(**미확인**).
- **버전 고정**: `better-auth`, `@better-auth/expo`, `@better-auth/mcp`, `@better-auth/cimd`를 1.7.25처럼 같은 정확한 버전으로 고정하고, 1.8 베타는 쓰지 않아요.

### 9.2 실기기 PoC가 필요한 항목

1. **iOS 실기기에서 Cookie 헤더 수동 첨부가 실제로 서버에 도달하는지**: React Native 네트워크 계층이 `credentials: "omit"`일 때 수동 `Cookie` 헤더를 유지하는지, 시스템 쿠키 저장소가 `Set-Cookie`를 따로 저장해 중복 전송하지 않는지(미확인).
2. **카카오·네이버·구글 웹 리다이렉트**: `openAuthSessionAsync`가 딥링크(`myapp://...?cookie=...`)로 정상 복귀하는지, Android Custom Tabs와 iOS ASWebAuthenticationSession 양쪽에서. 카카오의 이메일 미제공, 네이버 심사 요건도 같이 확인해요.
3. **Apple/Google 네이티브 ID 토큰 로그인**: `appBundleIdentifier` 설정, nonce 처리, 첫 로그인 이메일 저장.
4. **세션 만료 시나리오**: 로그인 후 7일 이상 방치했다가 복귀했을 때 헤더가 붙는지, 우리 미들웨어 갱신과 클라이언트 `expires` 기록이 어긋나는지(6장).
5. **앱 삭제 후 재설치**: iOS Keychain에 쿠키가 남아 서버에서 폐기된 세션이나 살아 있는 세션이 되살아나는지(Expo 문서: 보장되지 않음).
6. **MCP 교차 사용**: 실제 MCP 클라이언트가 받은 JWT를 앱 API의 `getSession`에 보내면 거절되는지, 반대로 앱 세션 토큰을 MCP 라우트에 보내면 거절되는지. `bearer()`를 켠 상태와 끈 상태 모두에서.
7. **세션 종료와 MCP 토큰**: 앱 로그아웃 후 MCP 액세스 토큰이 `requireMcpAuth`에서 계속 통과하는지(5.4).
8. **bearer 병용 여부**: 쿠키 헤더와 `Authorization`이 함께 갈 때의 동작, `requireSignature: true`에서 로그인 응답 JSON `token`이 거절되는지.
9. **OpenAPI 스냅샷**: `generateOpenAPISchema()` 출력이 빌드 환경에서 결정적(deterministic)인지, 숨김 엔드포인트가 포함되는지.

## 10. 조사 한계

- 소스는 `main` 브랜치를 읽었어요. 패키지 버전이 1.7.25로 안정 릴리스와 같았지만 태그 `v1.7.25` 시점의 파일과 한 줄도 다르지 않다는 보장은 하지 못했어요.
- bearer 소스 분석(3.1, 5.2)은 코드를 읽고 내린 해석이고 실행으로 확인하지 않았어요.
- Expo의 `openAuthSessionAsync`와 `WebBrowser` 문서는 직접 읽지 않았고, "최종 URL만 앱에 전달된다"는 서술은 일반적 이해에 기반한 추론이에요. `AuthSession` 문서에서는 리다이렉트 URL 허용 목록 언급만 확인했어요.
- openapi-fetch/openapi-typescript 문서, Lynx 통합 문서, 네이버 개발자센터 문서는 이번에 읽지 않았어요.
- GitHub 이슈 검색은 몇 가지 키워드만 썼고 "bearer + 리다이렉트 + 모바일"에 해당하는 이슈나 토론은 찾지 못했어요. 없다는 증거는 아니에요.
