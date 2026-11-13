# 인증 서비스 비교 (정식 출시·셀프호스팅 서버 기준)

- 조사일: 2026-11-11
- 대상 티켓: 인증 서비스 비교 (정식 출시·셀프호스팅 서버 기준), 상위 지도: oat 전면 개편 지도
- 방법: 공식 문서, 가격 페이지, 스펙, 공식 GitHub 저장소만 사용했어요. 모든 항목은 출처 URL을 달았고, 페이지에서 확인하지 못한 내용은 "미확인"으로 적었어요.

## 1. 결론 먼저

**추천: Better Auth (셀프호스팅 TypeScript 라이브러리, MIT) + 메일 발송 서비스(Resend 또는 Amazon SES).**
**차선: Clerk (매니지드).**

추천 이유는 다섯 가지예요.

1. 우리 서버가 곧 인증 서버가 돼요. 사용자·세션 데이터가 미니 PC의 Postgres에 같이 있어서, 가구 단위 권한 검사와 한 트랜잭션 안에서 처리할 수 있어요.
2. 카카오와 네이버를 별도 작업 없이 내장 provider로 지원하는 곳은 이번에 확인한 후보 중 Better Auth뿐이에요.
3. 원격 MCP용 OAuth 서버(RFC 9728 메타데이터, CIMD, PKCE, 리소스 지시자)를 같은 라이브러리의 `mcp()` 플러그인으로 낼 수 있어요.
4. Supabase Auth에서 옮기는 공식 마이그레이션 가이드가 있고, bcrypt 비밀번호 해시를 그대로 가져갈 수 있어요.
5. 가구 초대는 organization 플러그인의 이메일 초대와 역할 모델로 거의 그대로 표현돼요.

반면 불확실한 점이 두 가지 있어요. 둘 다 구현 전에 PoC로 확인해야 해요.

- 네이티브(Expo) 환경의 패스키는 공식 문서에 없어요.
- 1.8.0 베타 라인에서 변경이 잦아요. 안정 버전(1.7.x)에 고정하는 게 안전해요.

## 2. 필수 요건: 앱스토어 심사

### Apple App Review Guidelines 4.8 (Login Services)

가이드라인 페이지 기준 최종 개정일은 **2026-10-16**이에요.

> 사용자의 주 계정을 설정하거나 인증하는 데 서드파티·소셜 로그인 서비스(Facebook Login, Google Sign-In, Log in with X 등)를 쓰는 앱은, 다음 기능을 갖춘 **동등한 로그인 서비스 하나를 함께 제공**해야 한다. ① 수집 데이터가 이름과 이메일 주소로 한정됨 ② 사용자가 이메일 주소를 비공개로 설정할 수 있음 ③ 동의 없이 앱 사용 기록을 광고에 쓰지 않음.

위는 페이지 원문(영어)을 옮긴 거예요. 출처: https://developer.apple.com/app-store/review/guidelines/

시사점은 다음과 같아요.

- Google·카카오·네이버 로그인을 하나라도 넣으면 "Apple로 로그인"(또는 위 세 조건을 만족하는 동등 서비스)을 같이 제공해야 해요. 지금 사실상 이 조건을 만족하는 건 Apple 로그인뿐이라 Apple 로그인을 넣는 걸로 보는 게 안전해요.
- 반대로 이메일/비밀번호나 패스키 같은 **자체 계정만** 쓰면 4.8의 대상이 아니에요. 다만 조회한 페이지 발췌에는 4.8의 예외 조항 전문이 보이지 않았어요(미확인). 정식 심사 전에 라이브 페이지로 확인해야 해요.
- 초대제로 시작해도 앱이 스토어에 올라가는 이상 심사 기준은 같아요.
- 계정 삭제 요건은 이번 조회 범위에서 확인하지 못했어요(미확인). 정식 출시 준비 티켓에서 따로 다뤄야 해요.

Apple 로그인 구현 시 주의점은 Better Auth 문서에 정리돼 있어요. 출처: https://www.better-auth.com/docs/authentication/apple

- 클라이언트 시크릿이 JWT이고 최대 유효기간이 6개월(15,777,000초)이라 주기적 재발급이 필요해요.
- 네이티브 iOS는 audience가 Service ID가 아니라 번들 ID라서 `appBundleIdentifier` 설정이 필요해요.
- 이메일 claim은 최초 인증 때만 오기 때문에 첫 로그인에서 저장해야 해요.
- localhost나 HTTP 리턴 URL은 받지 않아요.

## 3. 후보별 비교

비교 기준은 티켓에 적힌 순서를 따랐어요. 가격은 각 공식 가격 페이지 기준(조회일 2026-11-11)이에요.

### 3.1 한눈에 보기

| 기준 | Better Auth (셀프호스팅) | Clerk | Supabase Auth | Firebase Auth | Auth0 | WorkOS AuthKit |
|---|---|---|---|---|---|---|
| 운영 형태 | 우리 서버·우리 DB | 매니지드 | 매니지드 또는 셀프호스팅(Supabase 스택) | 매니지드 (OIDC는 Identity Platform 업그레이드 필요) | 매니지드 | 매니지드 |
| Apple 로그인 | 지원 (네이티브 ID 토큰 포함) | 지원 (소셜 연결) | 지원 | 지원(미확인, 아래 참고) | 지원(미확인) | 미확인 |
| Google | 지원 | 지원 | 지원 | 지원 | 지원 | 미확인 |
| 카카오 | 내장 provider | 내장 목록 미확인, 커스텀 OAuth/OIDC로 연결 | 내장 provider | OIDC로 연결 가능(추론) | 커스텀 소셜 연결 | 미확인 |
| 네이버 | 내장 provider | 커스텀 연결에 프록시 필요(추론) | 문서에서 확인 못 함 | OIDC 아님, 별도 토큰 교환 필요(추론) | 커스텀 소셜 연결 | 미확인 |
| 패스키 | 플러그인 있음, 네이티브 미확인 | Pro 플랜에 포함 | 이번 조사에서 미확인 | 이번 조사에서 미확인 | 이번 조사에서 미확인 | 이번 조사에서 미확인 |
| 가구 초대 | organization 플러그인 | Organizations (무료 20명/조직, 100개 조직) | 직접 구현 | 직접 구현 | Organizations (Free 5개) | 이번 조사에서 미확인 |
| 원격 MCP OAuth | `mcp()` 플러그인: RFC 9728, CIMD, PKCE, DCR 선택 | CIMD, DCR 지원 | OAuth 2.1 서버(DCR 지원, CIMD는 문서에 없음) | 미확인 | 미확인 | CIMD, DCR 지원 (둘 다 대시보드에서 활성화) |
| 세션/토큰 | 쿠키 세션 + SecureStore, 선택적 JWT | Clerk 세션 | JWT | Firebase ID 토큰 | 토큰 | JWT 5분, 리프레시 토큰 |
| 비용 (우리 규모) | 0원 + 메일 비용 | 무료 구간 | 무료 구간 | 무료 구간 | 무료 구간 | 무료 구간 |
| 이전 비용 | 낮음 (우리 DB) | 중간 | 중간 | 중간 | 중간 | 중간 |

Apple·Google 행에서 Better Auth와 Supabase(카카오 페이지 기준 소셜 로그인 지원)를 뺀 나머지 후보는 이번에 해당 provider 페이지를 직접 읽지 않았어요. 일반적으로 지원되는 기능이지만 출처 확인은 못 했어요.

"미확인"은 이번 조회에서 해당 페이지를 읽지 못했다는 뜻이에요. 지원하지 않는다는 뜻이 아니에요. 최종 선택 후보에 대해서는 구현 전에 다시 확인해야 해요.

### 3.2 Better Auth (추천)

- 버전: 안정 v1.7.20 (2026-11-10), 베타 v1.8.0-beta.7. 라이선스 MIT, GitHub 별 약 3.07만 개. 출처: https://github.com/better-auth/better-auth/releases , https://github.com/better-auth/better-auth
- **Expo 앱**: `@better-auth/expo`가 있고 세션을 `expo-secure-store`에 저장해요. 딥링크 스킴을 `trustedOrigins`에 등록해야 해요. 문서 기준 요건은 Expo SDK 55(New Architecture 필수)예요. 네이티브 ID 토큰 로그인은 Google, Apple, Facebook만 지원해요. 출처: https://www.better-auth.com/docs/integrations/expo
- **카카오**: 내장 provider가 있어요. 기본 스코프는 `account_email`, `profile_image`, `profile_nickname`이고, 이메일을 받으려면 Biz 앱(사업자 정보 입력)이어야 해요. 출처: https://www.better-auth.com/docs/authentication/kakao
- **네이버**: 내장 provider가 있어요. 구현을 보면 OIDC가 아니라 OAuth 2.0 + 사용자 정보 API(`openapi.naver.com/v1/nid/me`) 방식이에요. 즉 네이버는 네이티브 ID 토큰 방식이 아니라 브라우저 리다이렉트 방식이에요. 출처: https://www.better-auth.com/docs/authentication/naver , https://raw.githubusercontent.com/better-auth/better-auth/main/packages/core/src/social-providers/naver.ts
- **패스키**: SimpleWebAuthn 기반 플러그인이에요. 웹 브라우저 기준 설명만 있고 네이티브(iOS/Android) 지원은 문서에 없어요. 앱 우선 서비스라서 이 부분이 가장 큰 불확실성이에요. 출처: https://www.better-auth.com/docs/plugins/passkey
- **가구 초대**: organization 플러그인에서 이메일 초대(`sendInvitationEmail`), 만료(기본 48시간), 한 사용자가 여러 조직에 소속, owner/admin/member 역할, 커스텀 역할을 지원해요. 소유권 이전과 공용/개인 지출 권한은 직접 만들어야 해요. 초대 보안을 위해 `requireEmailVerificationOnInvitation`을 켜는 걸 문서가 권해요. 출처: https://www.better-auth.com/docs/plugins/organization
- **원격 MCP OAuth**: `mcp()` 플러그인이 OAuth 2.1 Provider 위에서 인증 서버 겸 보호 리소스로 동작해요. PKCE(S256), RFC 9728 보호 리소스 메타데이터, RFC 8414 인증 서버 메타데이터, CIMD(`@better-auth/cimd` 별도 패키지), 리소스 지시자(RFC 8707)를 지원하고, DCR은 기본 꺼짐이에요. MCP 스펙 현행 버전(2026-07-28)을 목표로 한다고 문서에 적혀 있어요. 출처: https://www.better-auth.com/docs/plugins/mcp , https://www.better-auth.com/docs/plugins/oauth-provider
- **Supabase Auth 이관**: 공식 가이드가 있어요. `auth.users`를 `user` 테이블로, 이메일 identity를 `credential` 계정으로 옮기고 bcrypt를 `password.hash`/`password.verify`로 지정하면 기존 비밀번호가 유지돼요. 기존 세션은 무효화돼요. 출처: https://www.better-auth.com/docs/guides/supabase-migration-guide
- **비용**: 라이브러리는 무료예요. 메일 발송 서비스만 필요해요. Resend 무료는 월 3,000통·일 100통, Pro는 월 20달러에 5만 통이에요. Amazon SES는 천 통당 0.10달러예요. 출처: https://resend.com/pricing , https://aws.amazon.com/ses/pricing/
- **벤더 종속**: 데이터가 우리 Postgres에 있어 종속이 가장 낮아요. 대신 보안 패치와 버전 업그레이드를 직접 따라가야 하고, 장애 책임도 우리에게 있어요.
- **단점 정리**: 1.8 베타에서 세션·패스키·oauth-provider 관련 breaking 변경이 계속 들어오고 있어요(릴리스 노트 기준). 안정 1.7.x에 고정하고 업그레이드 전에 변경 내역을 읽어야 해요.

### 3.3 Clerk (차선)

- **가격**: Hobby 무료(MRU 5만, 대시보드 시트 3명), Pro는 월 25달러(연 결제 시 20달러)에 MRU 5만을 포함하고 MFA와 패스키가 들어 있어요. 초과분은 5만 1~10만 구간에서 MRU당 0.02달러예요. 출처: https://clerk.com/pricing
- **Organizations**: 앱당 월간 활성 조직 100개, 조직당 20명까지 포함이에요. 가구 하나가 조직 하나라면 100가구 이후에는 B2B 애드온(월 100달러, 연 결제 85달러)이 필요해요. 공개 출시 후 가구 수가 100을 넘으면 비용 구조가 바뀌어요.
- **카카오/네이버**: 내장 소셜 목록에서 확인하지 못했어요. 커스텀 OAuth provider(디스커버리 엔드포인트 또는 수동 설정)로 연결할 수 있고, 모바일에서는 PKCE를 켜라고 안내해요. 네이버는 OIDC가 아니라서 사용자 정보 호출에 프록시가 필요할 가능성이 높아요(추론). 문서에도 사용자 정보 호출에 추가 자격이 필요하면 프록시를 쓰라는 예시가 있어요. 출처: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/custom-provider
- **MCP**: CIMD와 DCR, 동의 화면을 지원하고, Next.js·Express용 MCP 서버 가이드가 있어요. 출처: https://clerk.com/docs/guides/development/mcp/overview , https://clerk.com/docs/guides/development/mcp/build-mcp-server
- **이관**: 오픈소스 마이그레이션 도구와 Backend API로 가져올 수 있어요. 대시보드 CSV 내보내기에는 해시된 비밀번호가 포함된다고 해요. 가져올 때는 `password_hasher`를 지정해야 하고, bcrypt 직접 가져오기는 문서에서 확인하지 못했어요. 출처: https://clerk.com/docs/guides/development/migrating/overview
- **종속**: 세션·토큰 구조와 `external_id` 매핑 설정이 Clerk 전용이에요. 내보내기 경로가 있어서 탈출은 가능해요.

### 3.4 Supabase Auth 단독

- **가격**: 무료 플랜 MAU 5만, Pro(월 25달러부터) 10만 포함 후 MAU당 0.00325달러예요. Auth는 별도 제품이 아니라 프로젝트의 일부예요. 출처: https://supabase.com/pricing
- **OAuth 2.1 서버**: DCR을 지원하고 MCP 인증 가이드가 있어요. CIMD는 문서에 나오지 않고, 베타/정식 여부는 페이지에 적혀 있지 않아요. 출처: https://supabase.com/docs/guides/auth/oauth-server
- **카카오**: 내장 provider가 있고 이메일은 Biz 앱에서만 받아요. 이메일 없이 허용하는 옵션이 있어요. 출처: https://supabase.com/docs/guides/auth/social-login/auth-kakao
- **셀프호스팅**: 공식 셀프호스팅은 Docker 스택 전체(Auth, PostgREST, Realtime, Storage, Studio 등) 기준이에요. `supabase/auth`(MIT)는 Postgres만 있으면 단독 실행되지만 서드파티 클라이언트용 OAuth 서버로는 README에 소개돼 있지 않아요. 출처: https://supabase.com/docs/guides/self-hosting/docker , https://github.com/supabase/auth
- **평가**: 이관 비용이 0에 가깝지만, 새 서버가 TypeScript로 직접 권한을 다루는 구조에서는 Auth만 따로 가져가는 이점이 줄어요. 매니지드로 쓰면 인증 서비스와 서버 DB가 분리돼서 가구 권한 검사에 JWT 클레임에 의존하게 돼요.

### 3.5 Firebase Auth

- 무료 5만 MAU, 그 이후는 Google Cloud Identity Platform 가격표를 따라요(세부 단가는 페이지가 열리지 않아 확인 못 함). 출처: https://firebase.google.com/pricing
- 커스텀 OIDC provider는 업그레이드된(Identity Platform) 프로젝트에서만 쓸 수 있어요. 출처: https://firebase.google.com/docs/auth/web/openid-connect
- 카카오는 OIDC를 지원하므로(출처: https://developers.kakao.com/docs/en/kakaologin/utilize) 연결 가능성이 있지만, 네이버는 OIDC가 아니라서 커스텀 토큰 발급이 필요해요(추론).
- 비밀번호 해시 가져오기에서 BCRYPT를 지원해요. 출처: https://firebase.google.com/docs/auth/admin/import-users
- 셀프호스팅 TypeScript 서버 중심 구조에서 Google 종속을 새로 추가할 이유가 약해서 후순위로 봤어요.

### 3.6 Auth0, WorkOS AuthKit

- **Auth0**: 무료 25,000 MAU, 커스텀 소셜 연결이 Free 플랜부터 포함이에요. Essentials는 500 MAU에 월 35달러부터라 성장 시 비용 증가가 가팔라요. Organizations는 Free 5개예요. 출처: https://auth0.com/pricing
- **WorkOS AuthKit**: 사용자 관리가 100만 MAU까지 무료예요. 커스텀 도메인은 월 99달러예요. MCP 인증은 CIMD(기본 꺼짐, 대시보드에서 켬)와 DCR을 지원하고 AuthKit이 인증 서버 역할을 해요. 토큰 유효기간은 기본 5분이에요. 카카오·네이버 연결 방법은 이번 조사에서 확인하지 못했어요. 출처: https://workos.com/pricing , https://workos.com/docs/authkit/mcp
- 두 서비스 모두 B2B(SSO) 중심 설계라서 가구 단위 소비자 앱에는 맞는 부분이 적어요. 이관 비용과 카카오·네이버 대응은 이번 조사에서 확인하지 못했어요.

## 4. 한국 환경 메모

- **카카오 로그인**: OIDC를 지원해요. 콘솔에서 OpenID Connect를 켜고 스코프에 `openid`를 넣어야 ID 토큰이 나와요. 이메일은 동의 항목이고, 동의 수준 설정은 비즈 앱이나 테스트 앱이 필요해요. 이메일이 없을 수 있어서 이메일 없는 계정을 허용하도록 설계해야 해요. iOS·Android·Flutter SDK가 있어요. 출처: https://developers.kakao.com/docs/en/kakaologin/utilize
- **네이버 로그인**: 공식 문서 페이지를 직접 열지 못했어요(developers.naver.com 접근 차단). 대신 Better Auth 소스의 엔드포인트 구성(OAuth 2.0 인가·토큰, 사용자 정보 API, `id_token` 미사용)을 근거로 "OIDC 아님"으로 판단했어요. 공개 서비스 전환 시 네이버 쪽 검수 요건은 확인하지 못했어요(미확인). 정식 출시 준비 티켓에서 확인이 필요해요.
- 카카오·네이버 모두 이메일을 못 받을 수 있으니 계정 식별은 provider 고유 ID 기준으로 하고, 이메일은 선택 필드로 두는 편이 안전해요.

## 5. 원격 MCP OAuth 요건 정리

MCP 스펙 현행 버전은 **2026-07-28**이에요(출처: https://modelcontextprotocol.io/specification/versioning ). 아래 인증 요건은 직전 개정인 2025-11-25 인증 문서에서 확인한 내용이에요(출처: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization ). 2026-07-28 인증 문서 본문은 이번에 직접 읽지 않았어요.

- 인증은 선택 사항이지만, HTTP 전송에서 쓰려면 스펙을 따르는 게 권장돼요.
- MCP 서버는 OAuth 2.0 보호 리소스 메타데이터(RFC 9728)를 반드시 제공해야 하고, `authorization_servers` 필드를 포함해야 해요. 401 응답의 `WWW-Authenticate` 헤더에 `resource_metadata`를 넣거나 well-known URI로 제공해요.
- 인증 서버는 OAuth 2.1을 구현해야 하고 RFC 8414 또는 OIDC 디스커버리 중 하나를 제공해야 해요.
- 클라이언트 등록은 Client ID Metadata Documents(권장), 사전 등록, DCR(하위 호환용 선택) 순이에요.
- 클라이언트는 PKCE(S256)와 리소스 지시자(RFC 8707 `resource`)를 반드시 써야 해요. 서버는 토큰의 audience를 검증해야 하고, 다른 용도로 발급된 토큰을 받거나 하위 API로 그대로 넘기면(토큰 패스스루) 안 돼요.
- 공개 클라이언트의 리프레시 토큰은 회전해야 해요.

후보별 대응은 이래요.

| 후보 | MCP 대응 |
|---|---|
| Better Auth | 우리 서버 안에서 인증 서버와 리소스 서버를 한 번에 구성. CIMD, PKCE, 리소스 지시자 지원. 별도 서비스 불필요 |
| Clerk | 인증 서버 역할을 Clerk이 하고 우리 서버는 토큰 검증만. CIMD·DCR 지원 |
| WorkOS | 같은 방식(AuthKit이 인증 서버). CIMD·DCR 지원 |
| Supabase | OAuth 2.1 서버와 DCR 지원. CIMD는 문서 미확인 |

우리 MCP는 "정확하고 안전한 CRUD만"이 목적이라서, 로그인 화면과 동의 화면을 우리가 통제할 수 있는 구성이 유리해요. 특히 MCP 클라이언트가 쓰는 동의 화면에서 가구와 장부 범위를 고르게 하려면 인증 서버가 도메인 모델을 알고 있는 편이 쉬워요(추론).

## 6. 이관: 기존 Supabase Auth 사용자 2명

- 사용자가 2명이라 이관 자체는 부담이 없어요. 비밀번호(bcrypt)는 Better Auth 가이드대로 해시 함수를 bcrypt로 지정하면 그대로 로그인돼요. 재설정을 유도하지 않아도 돼요.
- 기존 세션은 모두 무효화되니 전환 당일에 다시 로그인하게 안내해야 해요.
- 소셜 로그인 identity는 해당 provider를 새 설정에 미리 추가해둔 경우에만 옮겨져요. 누락하면 데이터가 유실될 수 있다고 가이드가 경고해요.
- Clerk, Firebase는 bcrypt 해시 가져오기가 문서에 있거나(Firebase) 불명확해요(Clerk). 2명이면 비밀번호 재설정으로 대체해도 현실적인 비용이에요.

## 7. 권고

**추천: Better Auth + Resend(또는 SES)**

- 근거는 1장과 같아요. 자체 DB에 인증 데이터를 두는 구조, 카카오·네이버 내장 provider, 같은 코드 안의 MCP 인증 서버, 공식 Supabase 이관 가이드, organization 기반 가구 초대예요.
- 구현 착수 전에 PoC로 확인할 항목 세 가지:
  1. Expo 앱에서 Apple 네이티브 ID 토큰 로그인이 서버 `appBundleIdentifier` 설정으로 동작하는지.
  2. 네이티브 패스키가 필요하다면 별도 구현이 필요한지(문서에 없음). 패스키를 출시 필수 요건에서 빼는 선택지도 있어요.
  3. `mcp()` 플러그인으로 Claude 등 실제 원격 MCP 클라이언트가 CIMD로 붙는지.
- 운영 원칙: 안정 1.7.x 고정, 업그레이드 전 릴리스 노트 확인, 인증 관련 DB 백업 포함.

**차선: Clerk**

- 인증 서버를 직접 운영하기 부담스럽거나 패스키(네이티브)가 출시 필수가 되면 전환할 후보예요. MCP(CIMD·DCR)와 패스키(Pro 플랜)가 매니지드로 제공돼요.
- 비용은 처음엔 무료지만 가구가 100을 넘으면 Organizations 애드온이 필요해요(Pro 월 20~25달러 + 애드온 월 85~100달러). 카카오·네이버는 커스텀 OAuth로 연결해야 하고 네이버는 프록시가 필요할 가능성이 높아요.

## 8. 조사 한계

- 네이버 개발자센터 페이지는 도구 접근 제한으로 열지 못했어요. 네이버 관련 서술은 Better Auth 소스에 근거한 추정이에요.
- Firebase/Identity Platform의 MAU 단가, 일부 후보의 패스키·초대 기능, Apple 4.8 예외 조항 전문은 확인하지 못했어요. 표에서 "미확인"으로 표시했어요.
- 조회한 일부 Supabase 문서 페이지에는 AI 에이전트에게 피드백을 제출하라는 취지의 문구가 들어 있었어요. 조사 요청과 무관한 내용이라 따르지 않았어요.
- MCP 스펙은 2026-07-28이 현행이지만, 인증 요건 확인은 2025-11-25 문서를 읽은 거예요.
