# 인증

- 결정일: 2026-11-19
- 티켓: [인증 PoC: Expo 세션 전달·소셜 로그인·MCP 토큰 분리](https://github.com/Gn0lee/oat/issues/525)
- 관련 ADR: 0022(셀프호스팅 Better Auth 유지, AI 연결은 세션과 별개), 0011(얇은 클라이언트), 0012(권한)
- 후속 변경: [MCP](mcp.md)(2026-11-20)가 4절을 구체화했어요. `@better-auth/cimd`를 더하고 DCR은 켜지 않아요.
- 리서치: [인증 PoC](../research/2026-11-19-auth-poc.md), [앱 세션 전달 방식](../research/2026-11-17-better-auth-mobile-session-transport.md), [인증 서비스 비교](../research/2026-11-11-auth-services.md)
- [서버 아키텍처](server-architecture.md) 13~17번을 이 문서가 구체화해요.

## 1. 한 장 요약

| 항목 | 결정 |
|---|---|
| 인증 라이브러리 | **셀프호스팅 Better Auth 유지**(Supabase Auth 재검토 후). ADR 0022 |
| 앱 세션 전달 | `@better-auth/expo`가 SecureStore에 둔 세션을 `Cookie` 헤더로 붙여요. 생성 클라이언트 미들웨어도 `getCookie()` 값을 붙이고 `credentials: "omit"` |
| 세션 수명 | **60일 비활동 만료**(쓸 때마다 연장, `updateAge` 1일). 최대 수명은 두지 않아요 |
| 포그라운드 | 앱이 포그라운드로 올 때마다 `authClient.getSession()`을 불러요(필수) |
| 새 설치 | 처음 설치 표시가 없으면 Keychain 세션을 지워요 |
| 로그인 수단 | 초대제: **이메일만**. 정식 출시 전: **Apple + Google** 추가. 카카오·네이버는 요청을 보고 정해요 |
| 패스키 | 출시 후 검토 |
| AI 연결(MCP) | 앱 세션과 별개. 앱 로그아웃으로 끊기지 않고, 해지·가구 나가기·계정 삭제로 끊겨요. MCP 요청마다 DB에서 확인 |
| 버전 | `better-auth`와 모든 `@better-auth/*`(간접 의존인 `oauth-provider`·`core` 포함)를 같은 정확한 버전으로 고정하고 `overrides`로 묶어요 |
| 도메인·유료 Apple 계정 | 이 단계에는 필요 없어요. Apple 로그인, 패스키, 유니버설 링크, 첫 스토어 제출 전에 필요해요 |

## 2. 앱 세션

### 2.1 전달

- Better Auth 클라이언트 호출(로그인, 세션 확인, 로그아웃)은 Expo 플러그인이 알아서 `Cookie`를 붙여요.
- 우리 API(`/v1/*`)는 openapi-fetch 미들웨어에서 `await authClient.getCookie()`를 `cookie` 헤더로 붙이고 `credentials: "omit"`로 보내요. iOS 시뮬레이터에서 중복 없이 1개만 도착하는 것을 확인했어요.
- 서버 앱 API는 `auth.api.getSession({ headers })`만 써요.

### 2.2 수명과 갱신

- `session.expiresIn = 60일`, `updateAge = 1일`. 하루에 한 번 이상 쓰면 만료가 다시 60일 뒤로 밀려요. 60일 동안 한 번도 열지 않으면 다시 로그인해요.
- 쿠키 캐시(`session.cookieCache`)는 끄고, 요청마다 DB 세션을 봐요.
- **포그라운드마다 `getSession()`**: 우리 API만 부르면 서버 세션이 살아 있어도 기기 쪽 만료 기록이 지나서 쿠키가 빠져요(PoC에서 재현). 앱 시작과 포그라운드 복귀 때 한 번씩 부르면 기기 쪽 만료도 같이 늘어요.
- 우리 API가 401을 받으면 앱은 `getSession()`을 한 번 더 부르고, 그래도 없으면 로그인 화면으로 가요.

### 2.3 새 설치

- iOS Keychain은 앱을 지워도 값이 남을 수 있어요(PoC에서 재현).
- 앱 시작 때 문서 폴더의 설치 표시 파일을 확인하고, 없으면 새 설치로 봐요.
  1. Keychain에 남은 쿠키가 있으면 그 쿠키로 `/sign-out`을 한 번 보내요(실패해도 넘어가요).
  2. `oat_cookie`·`oat_session_data`를 지워요.
  3. 설치 표시 파일을 만들어요.
- 이 규칙은 Android에서도 해가 없어요(Android는 삭제 때 값이 지워져요).

### 2.4 나중에 bearer를 켤 때

- 네이티브 앱을 만들 때 `bearer({ requireSignature: true })`를 더해요. 서명 없는 응답 JSON `token`은 거부돼요(PoC 확인).
- 한 요청에 Cookie와 Bearer를 같이 보내지 않아요. 서로 다른 사용자의 값이 같이 오면 Bearer가 이겨요(PoC 확인).

## 3. 로그인 수단

| 단계 | 수단 | 메모 |
|---|---|---|
| 초대제 | 이메일 + 비밀번호, 메일 인증 | 소셜 로그인이 없으니 Apple 가이드라인 4.8 대상이 아니에요 |
| 정식 출시 전 | + Apple(네이티브 ID 토큰), Google(네이티브 ID 토큰) | Google을 넣으면 Apple도 필수예요. 서버 `appBundleIdentifier`, Apple 이메일은 첫 로그인 때만 와요 |
| 요청을 보고 | 카카오(네이티브 SDK ID 토큰, Better Auth 1.7.26+), 네이버(리다이렉트) | 카카오는 콘솔에서 OpenID Connect를 켜요. 이메일이 없으면 `mapProfileToUser`로 대체 이메일. 네이버 리다이렉트는 "세션 없이 복귀 = 실패"로 앱이 판단해요 |
| 출시 후 검토 | 패스키 | 공식 Expo 지원 없음. 도메인과 유료 Apple 계정 필요 |

## 4. AI 연결(원격 MCP)

- Better Auth `mcp()` 플러그인이 인가 서버를 겸해요. MCP 액세스 토큰은 `resource = <api>/mcp`로 audience가 묶인 JWT(`typ: at+jwt`, `azp` 포함)예요.
- JWT 플러그인의 세션 JWT(`/token`, `set-auth-jwt`)는 꺼요.
- 앱 API는 `getSession`만, `/mcp`는 `requireMcpAuth`만 써요. 교차 8가지가 모두 거부되는 것을 PoC에서 확인했어요. 이 테스트는 통합 테스트로 옮겨요.
- **AI 연결은 앱 세션과 따로 살아요.** 앱에서 로그아웃해도 AI 연결은 그대로예요.
- **끊기는 경우**: 사용자가 연결을 해지하거나, 가구에서 나가거나, 계정을 지울 때예요. 갱신 토큰을 회수하고 연결 행(`ai_connections`)을 지워요([MCP](mcp.md) 5.6).
- **MCP 요청마다 DB 확인**: 액세스 토큰은 서명만 검증해서 회수 뒤에도 만료(1시간)까지 통과해요. 그래서 `/mcp` 핸들러는 토큰 검증 다음에 (1) 그 클라이언트에 대한 연결 행이 있는지, (2) 사용자가 아직 그 가구의 가구원인지를 DB에서 봐요. 가구는 원래 요청마다 DB 멤버십에서 정하므로(서버 아키텍처 15번) 같은 조회에 붙여요.
- 로컬 CLI형 MCP 클라이언트는 `application_type: native`로 등록돼야 `http://localhost` 리다이렉트를 쓸 수 있어요.
- 실제 Claude 연결, 클라이언트 등록 방식(CIMD/DCR), 동의 화면, 연결 목록·해지 화면은 MCP 툴 설계에서 정해요. (정했어요: [MCP](mcp.md), ADR 0023. CIMD만 + 허용 목록, 서버 HTML 로그인·동의 화면, 권한·동의의 정본은 `ai_connections` 행, 동의에 쓴 브라우저 로그인은 토큰 교환 직후 삭제)

## 5. 버전과 업그레이드

- `better-auth`, `@better-auth/expo`, `@better-auth/mcp`, `@better-auth/oauth-provider`, `@better-auth/core`(+ CIMD를 쓰면 `@better-auth/cimd`)를 같은 정확한 버전으로 `dependencies`에 넣고, 같은 값을 `pnpm.overrides`에 넣어요. `@better-auth/mcp`가 `oauth-provider`를 `^`로 끌어와서 고정이 새는 것을 PoC에서 봤어요.
- 구현 착수 때 기준 버전을 다시 고르고(카카오 네이티브가 필요하면 1.7.26 이상), 패치마다 릴리스 노트의 Expo·MCP·세션 항목을 읽고 교차 테스트·Expo 클라이언트 테스트를 돌린 뒤 올려요.
- Better Auth `openAPI()` 스냅샷은 결정적이에요. CI에서는 `BASE_URL`을 고정해서 생성해요(`servers` URL이 따라 바뀌어요). `/expo-authorization-proxy` 같은 내부 엔드포인트도 들어 있어서 변경 감시에 쓸 수 있어요.

## 6. 다른 티켓에 넘기는 것

- **MCP 툴 설계**: 실제 Claude 연결 검증, CIMD/DCR, 로그인·동의 화면, AI 연결 목록·해지 화면, 4절의 요청마다 DB 확인을 어떤 쿼리로 할지. ([MCP](mcp.md)에서 정했어요)
- **가구원 나가기·계정 삭제**: 나갈 때 그 사람의 세션 전부와 AI 연결을 끊어요. ([가구원 나가기·계정 삭제](member-leave.md)에서 정했어요: 나가기 트랜잭션에서 직접 SQL로, 계정 삭제는 바로 처리하고 비밀번호 재확인)
- **정식 출시 준비**: 유료 Apple 개발자 계정, 도메인(oatday), Apple·Google 로그인 추가, 계정 삭제 요건.
- **전환 당일 절차**: 기존 Supabase 사용자의 이메일·bcrypt 해시를 Better Auth `account`로 옮기고, 기존 세션은 무효라 첫 로그인 안내가 필요해요(인증 서비스 비교 6절).
