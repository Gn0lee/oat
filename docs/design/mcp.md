# MCP

- 결정일: 2026-11-20
- 티켓: [MCP 툴 설계: 툴 목록·권한 범위·쓰기 안전장치·AI 연결 관리](https://github.com/Gn0lee/oat/issues/534)
- 관련 ADR: 0023(MCP는 의도별 툴, CIMD만, 연결 행이 권한·동의의 정본), 0022(AI 연결은 세션과 별개), 0011(얇은 클라이언트), 0012(권한)
- 리서치: [MCP PoC](../research/2026-11-20-mcp-poc.md), [인증 PoC](../research/2026-11-19-auth-poc.md), [인증 서비스 비교](../research/2026-11-11-auth-services.md) 5절
- [서버 아키텍처](server-architecture.md) 11·14·21번과 [인증](auth.md) 4절을 이 문서가 구체화해요.

## 1. 한 장 요약

| 항목 | 결정 |
|---|---|
| 할 수 있는 일 | 조회 + **기록** 쓰기(생성·수정·삭제). 지갑·카테고리·장부·정기 규칙·결제수단은 조회만 |
| 툴 단위 | 앱 입력 화면과 같은 **의도별 툴**(지출 추가, 이체, 매매…). 다리를 직접 적는 범용 쓰기는 없어요 |
| 볼 수 있는 범위 | 앱의 그 사용자와 같아요(공용 장부 + 내 개인 장부). 다른 가구원의 개인 장부는 절대 안 보여요 |
| 권한 | **조회만 / 조회·쓰기** 두 가지. 동의 화면에서 고르고 앱에서 언제든 바꿔요. 정본은 우리 DB의 AI 연결 행 |
| 중복 | MCP 기록 생성 때 같은 지갑·날짜·금액이 있으면 저장하지 않고 `possible_duplicate`로 돌려줘요. 사용자 확인 뒤 `allow_duplicate: true` |
| 되돌리기 | 앱의 "AI가 바꾼 기록"에서 건별로. 클라이언트의 삭제 확인에는 기대지 않아요 |
| 클라이언트 등록 | **CIMD만**, DCR 끔. 초대제 동안 허용 목록(Claude·ChatGPT·Codex·Hermes) |
| 로그인·동의 화면 | API 서버가 내는 HTML 두 장(`/oauth/login`, `/oauth/consent`). 웹 앱이 아니에요 |
| 요청마다 확인 | `ai_connections` ⨝ `household_members` 한 줄. 가구를 정하는 조회에 붙여서 추가 왕복이 없어요 |
| 앱 화면 | 설정 → AI 연결: 목록, 권한 바꾸기, AI가 바꾼 기록과 되돌리기, 해지 |
| 재사용 | 툴은 같은 도메인 서비스 위의 얇은 입구예요. 나중에 앱 안 AI 채팅을 만들면 서버의 AI 루프가 같은 툴을 불러요 |

## 2. 툴

### 2.1 목록

모두 REST와 같은 도메인 서비스를 직접 불러요(서버 아키텍처 19번). 툴 설명은 AI 대화마다 읽히니 15개 안팎으로 유지해요.

**조회**

| 툴 | 하는 일 |
|---|---|
| `get_context` | 가구원, 볼 수 있는 장부, 지갑, 결제수단, 카테고리, 오늘 날짜, 이 연결의 **지금 시점** 권한. 다른 툴에 넘길 ID 사전 |
| `search_records` | 기간·장부·카테고리·지갑·검색어로 기록 찾기. 커서 페이지, 한 번에 최대 100건 |
| `get_record` | 기록 한 건(다리·줄·version 포함) |
| `get_month_summary` | [통계 질문 목록](stats-questions.md)의 월 숫자(앱의 화면용 조회 엔드포인트와 같은 계산) |
| `get_balances` | 묶음별 지갑 잔액 |
| `get_bill` | 청구서(예상·확정 청구액, 들어간 기록) |
| `list_upcoming` | 예정과 받을 돈 |
| `get_holdings` | 보유 종목, 평단, 평가액, 수익률 |

**쓰기** (조회만 연결에서도 목록에 있어요. 3.2)

| 툴 | 하는 일 |
|---|---|
| `add_spending` / `add_income` | 지출·수입. 줄 여러 개, 결제수단 또는 지갑, 결제 할인은 정가로 |
| `add_transfer` | 지갑 사이 이동. 카드대금도 여기로 |
| `add_trade` | 매수·매도 |
| `add_returned_money` | 환불·혜택·정산. 원 기록을 가리켜요 |
| `confirm_upcoming` | 예정 확정(금액 고침 가능) |
| `update_record` / `delete_record` | 수정·삭제. 읽은 `version` 필수(서버 아키텍처 12번) |

**내주지 않음**: 다리를 직접 적는 범용 쓰기, 잔액 맞춤(실제 잔액을 보고 사람이 앱에서), 청구서 확정(차액을 기록·잔액 맞춤으로 풀어야 해서), 지갑·카테고리·장부·정기 규칙·결제수단 쓰기. 맞는 카테고리가 없으면 AI는 미분류로 적고 사람이 앱에서 정리해요. 필요해지면 툴을 하나씩 더해요(추가만, 3.4).

### 2.2 응답 규칙

- 금액은 계약대로 최소 단위 정수 + `currency`이고, **표시 문자열을 같이** 줘요: `{ "amount": 84200, "currency": "KRW", "display": "84,200원" }`. AI가 USD 센트를 달러로 읽는 실수를 막아요.
- 오류는 툴 결과의 `isError` + 기계가 읽는 `code`와 사람에게 전할 `message`예요: `write_not_allowed`, `ledger_not_visible`, `version_conflict`, `not_found`, `validation_failed`.
- 중복 의심은 오류가 아니라 정상 결과 `{ status: "possible_duplicate", saved: false, existing: [...], next: "…" }`예요.
- 날짜는 앱과 같은 `YYYY-MM-DD`(해외 결제·체결은 현지 날짜, ADR 0014).

### 2.3 서버 안내문(`instructions`)

연결할 때 한 번 전달되고 Claude·ChatGPT·Hermes가 모두 읽어요. 도메인 규칙을 짧게 담아요.

- 기록 전에 `get_context`로 ID를 확인해요. 카테고리를 새로 만들 수 없고, 맞는 게 없으면 미분류예요.
- 돌려받은 돈은 수입이 아니라 `add_returned_money`예요.
- `possible_duplicate`를 받으면 저장되지 않은 거예요. 사용자에게 묻기 전에 `allow_duplicate`를 붙이지 않아요.
- 금액은 `display`를 그대로 보여줘요. 수정·삭제에는 `version`이 필요해요.

PoC에서 안내문 문구가 행동을 바로 바꿨어요("맞는 카테고리가 없으면 미분류"를 엄격하게 따라 편의점을 미분류로 골랐어요). 문구는 구현 때 실제 모델로 다듬어요. 여러 단계 작업 순서(카드 문자 처리 루틴 등)는 나중에 스킬로 배포하고, MCP만으로도 정확하게 동작하게 만들어요.

## 3. 권한 범위

### 3.1 AI는 사용자를 대신한다

- 볼 수 있는 장부와 고칠 수 있는 기록은 앱의 그 사용자와 같아요. 같은 권한 모듈(서버 아키텍처 31번)을 거쳐요. 배우자가 적은 공용 기록도 앱에서 고칠 수 있으면 AI도 고칠 수 있어요.
- 동의 때 장부를 하나씩 고르는 기능은 두지 않아요. 새 장부는 자동으로 들어가요. 개인 장부를 AI에게 숨기고 싶은 요구가 생기면 더해요.
- 감사 기록에는 입구 `mcp`와 **AI 연결 ID**가 남아요(4.3).

### 3.2 조회만 / 조회·쓰기

- 동의 화면의 "조회만 허락" 체크 하나로 정하고, 앱에서 언제든 바꿔요. 다음 요청부터 바로 적용돼요.
- 정본은 `ai_connections.access`예요. OAuth 스코프는 `oat` 하나(+ `offline_access`)만 써요. 스코프는 토큰에 새겨져서 바꾸려면 다시 연결해야 하고, 두 곳에 두면 어긋나기 때문이에요.
- 조회만 연결에서도 **쓰기 툴은 목록에 그대로** 두고, 부르면 `write_not_allowed`와 "oat 앱의 설정 → AI 연결에서 쓰기를 허락하면 바로 쓸 수 있어요"를 돌려줘요. 목록에서 숨기면 클라이언트가 예전 목록으로 불러 "툴 없음"을 받고 사용자에게 엉뚱한 이유를 대요(PoC).

## 4. 쓰기 안전장치

### 4.1 중복 확인

AI 클라이언트는 재시도할 때 같은 중복 방지 키를 다시 쓴다는 보장이 없고, 내용을 조금 바꿔 다시 부르기도 해요. 앱으로 이미 적은 결제를 AI가 카드 문자로 또 넣는 경우는 키로는 아예 막을 수 없어요. 그래서 MCP 기록 생성에는 **내용으로 확인**해요.

- 대상: `add_*`로 기록을 만들 때. 앱 입력은 지금처럼 키만 써요.
- 기준: 같은 가구, **볼 수 있는 장부** 안에서 같은 지갑·같은 날짜·같은 금액의 기록(입구 무관). 볼 수 없는 장부까지 찾으면 다른 가구원의 개인 기록이 있다는 사실이 새어 나가요.
- 있으면 저장하지 않고 `possible_duplicate`와 그 기록들을 돌려줘요. 진짜 따로인 결제(커피 두 잔)는 사용자 확인 뒤 `allow_duplicate: true`로 다시 불러요.
- 툴 입력에 선택 칸 `idempotency_key`를 둬요. 보내면 앱과 같은 방식(서버 아키텍처 11번)으로도 처리해요.
- PoC: Claude는 앞서 조회한 기록을 기억해 스스로 물었고, 조회 없이 바로 적은 Hermes는 서버 경고를 받고 물었어요.

### 4.2 되돌리기

- 앱 → 설정 → AI 연결 → 연결 상세의 **AI가 바꾼 기록**: 감사 기록에서 그 연결이 한 쓰기를 최신순으로 보여주고 건별 [되돌리기]를 둬요.
  - 만든 기록 → 지워요. 고친 기록 → 직전 모습으로. 지운 기록 → 같은 ID로 다시 만들어요.
  - 그 뒤 누가 또 고쳤으면(version이 다름) 되돌리지 않고 알려요.
  - 되돌리기도 감사 기록이 남는 일반 쓰기예요(입구 `app`).
- AI 대화 안에서 바로잡는 건 일반 수정·삭제 툴로 해요. `undo` 툴은 두지 않아요.
- 연결 단위 일괄 되돌리기는 필요해지면 더해요(감사 기록에 연결 ID가 있어서 쉬워요).
- 삭제 툴에 `destructiveHint: true`를 붙이지만 **기대지 않아요.** PoC에서 Claude는 묻지 않고 지웠어요. 툴 설명에 "앱에서 되돌릴 수 있어요"를 적으면 AI가 사용자에게 전해요.

### 4.3 감사 기록

[물리 DB 스키마](physical-db-schema.md) 5.4의 `audit_log`에 `ai_connection_id`(FK 없음)를 더해요. 입구가 `mcp`인 행은 반드시 값이 있어요. 연결을 해지해도 행은 남고, 화면은 연결 이름을 가려 "해지된 연결"로 보여줘요.

## 5. 연결과 인증

### 5.1 클라이언트 등록: CIMD만

- `@better-auth/cimd`를 `mcp()`와 함께 써요(`metadataProfile: "mcp-2026-07-28"`, Node `fetchClientMetadataResource`). 메타데이터에 `client_id_metadata_document_supported: true`와 `token_endpoint_auth_methods_supported`에 `none`·`private_key_jwt`가 나가요.
- **DCR은 켜지 않아요**(`registration_endpoint` 없음). 누구나 아무 이름으로 클라이언트를 만들 수 있는 입구이고, 현행 스펙(2026-07-28)에서도 하위 호환용이에요.
- **허용 목록**(초대제 동안, `isMetadataDocumentUrlAllowed`, 앞부분 일치, 설정값):
  - `https://claude.ai/oauth/` — Claude(`…/mcp-oauth-client-metadata`), Claude Code(`…/claude-code-client-metadata`)
  - `https://chatgpt.com/oauth/` — ChatGPT(`…/client.json`), Codex(`…/codex/…`, 서버별 주소가 있어 앞부분 일치)
  - `https://nousresearch.github.io/hermes-agent/` — Hermes(`…/docs/oauth/client-metadata.json`)
  - 목록 밖은 `invalid_client`예요. 새 앱은 CIMD 지원을 확인하고 한 줄 더해요.
- **도메인 검사**: `originBoundFields`를 `["post_logout_redirect_uris"]`로 둬요(기본값에서 `client_uri`를 뺌). `client_uri`는 표시용 링크라 동의 화면에 쓰지 않고, 기본값은 Hermes를 거절해요(PoC 재현). 리다이렉트는 따로 정확히 일치를 검사해요.
- 비상구: CIMD를 못 쓰는 앱(Cursor, Gemini CLI 등)을 꼭 받아야 하면 운영자가 사전 등록 클라이언트(공개 클라이언트 + PKCE, 루프백 리다이렉트, `native`)를 만들어요. 동의 화면에는 "oat가 등록한 앱"으로 보여요.

### 5.2 로그인·동의 화면

- API 서버가 HTML 두 장을 직접 내요. JS 없는 폼, 브랜드 색, 다크 모드만 맞춰요. 랜딩 사이트에는 로그인을 두지 않아요(서버 아키텍처 14번).
  - `/oauth/login`: 이메일·비밀번호. 받은 서명 쿼리를 `oauth_query`로 `/sign-in/email`에 함께 보내면 Better Auth가 인가를 이어가요. 비밀번호 재설정은 "앱에서 해 주세요"로 안내해요.
  - `/oauth/consent`: 앱 이름, client_id의 **도메인**(claude.ai), 가구 이름, 볼 수 있는 범위 문장, "조회만 허락" 체크, [허락하기]·[취소]. 가구에 속하지 않으면 연결할 수 없어요.
- 허락하면 서버가 `/oauth2/consent`를 부르고 `ai_connections` 행을 만들거나(이미 있으면 권한을 갱신) 한 뒤 클라이언트로 돌려보내요.
- **Better Auth 동의 기록은 남기지 않아요.** 허락 직후 그 사용자·클라이언트의 `oauthConsent`를 지워요. 남기면 다음 인가 때 우리 화면을 건너뛰어 연결 행 없이 토큰이 나갈 수 있어요(PoC). 그래서 연결할 때마다 우리 동의 화면이 떠요.
- **브라우저 로그인은 토큰 교환 직후 지워요.** 이 로그인은 앱 세션이 아니라 동의만을 위한 것이라서 남의 기기 브라우저에 남지 않게 해요. 동의 직후에 지우면 코드→토큰 교환이 `session no longer exists`로 실패해요(PoC). 그래서 동의 응답에서는 쿠키만 지우고, 서버가 `authorization_code` 교환에 성공하면 그 클라이언트의 갱신 토큰이 가리키는 세션을 지워요. 세션을 지워도 갱신 토큰은 계속 동작해요.

### 5.3 토큰

- 액세스 토큰: `resource = <api>/mcp`로 묶인 JWT, **1시간**(인증 PoC). 갱신 토큰은 회전하고, 재시도 겹침 30초는 `mcp()` 기본값을 따라요.
- 스코프: `oat`, `offline_access`. 보호 리소스 문서에는 `oat`만 나가요.
- 앱 API와 `/mcp`의 교차 거부는 인증 PoC대로예요.

### 5.4 요청마다 확인

```sql
SELECT c.id, c.access, m.id AS member_id, m.household_id
FROM ai_connections c
JOIN household_members m ON m.id = c.member_id
WHERE m.user_id = :sub          -- 토큰의 사용자
  AND c.oauth_client_id = :azp  -- 토큰의 클라이언트
  AND m.status = 'active';
```

- `requireMcpAuth`(서명·issuer·audience·만료) 다음에 이 조회를 해요. 0행이면 401 + `WWW-Authenticate`(resource_metadata)라서 클라이언트가 다시 인증을 시작해요.
- 가구를 정하는 조회(서버 아키텍처 15번)에 붙인 것이라 추가 왕복이 없어요. 결과로 접근 문맥을 만들어 도메인 서비스를 불러요.
- `last_used_at`은 1시간에 한 번만 갱신해요.

### 5.5 `ai_connections`

| 칸 | 설명 |
|---|---|
| `id` | UUIDv7 |
| `household_id` | 두 칸 FK용(물리 DB 스키마 2절 규칙) |
| `member_id` | → `household_members`. 사용자가 아니라 **멤버 행**에 묶어요 |
| `oauth_client_id` | CIMD 주소 또는 사전 등록 ID |
| `client_name` | 연결할 때의 이름(목록 표시용) |
| `access` | `read` \| `read_write` |
| `created_at`, `last_used_at` | |

- `UNIQUE (member_id, oauth_client_id)`. 같은 앱을 다시 연결하면 같은 행이에요.
- 계정·가구 경계 테이블처럼 접근 문맥 모듈만 읽고 써요. 가구를 정하기 전에 읽어야 해서 RLS를 걸지 않아요(물리 DB 스키마 2절의 `household_members`와 같은 이유).
- 멤버 행에 묶었기 때문에 가구를 나가면(`status = 'left'`) 정리 작업 전이라도 조회가 0행이 돼요. 다른 가구에 들어가도 옛 연결이 따라오지 않아요.

### 5.6 끊기

| 경우 | 하는 일 |
|---|---|
| 앱에서 해지 | 연결 행 삭제, 그 사용자·클라이언트의 갱신 토큰 회수. 다음 요청부터 401(만료 전 액세스 토큰 포함) |
| 가구 나가기 | 위 조회가 바로 0행. 같은 트랜잭션에서 연결 행 삭제, 갱신 토큰 `revoked`, 세션 전부 삭제([가구원 나가기·계정 삭제](member-leave.md) 6절) |
| 계정 삭제 | 같아요. 토큰 행은 user 삭제 FK로 함께 지워져요 |
| 앱 로그아웃 | 끊지 않아요(ADR 0022) |

PoC에서 해지 뒤 Claude는 401을 받고 재인증을 시작했고, 우리 동의 화면이 다시 떴어요.

## 6. 앱 화면: 설정 → AI 연결

```
AI 연결
┌──────────────────────────────┐
│ Claude              claude.ai │
│ 조회·쓰기 · 마지막 사용 2시간 전 │
├──────────────────────────────┤
│ Hermes Agent   nousresearch… │
│ 조회만 · 마지막 사용 어제        │
└──────────────────────────────┘
연결하는 법 →
```

- 목록: 앱 이름, client_id 도메인, 권한, 마지막 사용.
- 상세: 연결한 날, **권한 바꾸기**(조회만 ↔ 조회·쓰기, 바로 적용), **AI가 바꾼 기록**과 건별 되돌리기(4.2), **[연결 해지]**.
- "연결하는 법": MCP 주소 복사, Claude·ChatGPT·Hermes별 짧은 안내. 회사 기기·회사 계정은 조직 정책(조직 소유자 승인, 기록 보관)에 막히거나 회사가 대화를 볼 수 있다는 주의.

## 7. 구현 메모

- **MCP SDK는 2026-07-28을 지원하는 버전**(TS v2 `@modelcontextprotocol/server` 계열)으로 골라요. Claude는 `server/discover`를 먼저 보내요. v1(1.32.2)은 400을 주고 Claude가 `initialize`로 내려와서 동작은 했어요.
- 무상태 Streamable HTTP(요청마다 서버 인스턴스, JSON 응답)로 충분했어요. Claude는 대화마다 `initialize`·`tools/list`를 다시 불러요.
- `/.well-known/*`은 루트에서 `auth.handler`로 넘겨요. `Origin` 검증, `/mcp`·`/oauth/*` 레이트리밋(`CF-Connecting-IP`)을 둬요. 임시 공개 주소에도 스캐너가 바로 왔어요.
- `/oauth2/authorize`는 브라우저 탐색이면 302, `sec-fetch-mode: cors`면 JSON을 줘요. 통합 테스트에서 Node `fetch`는 JSON 쪽이에요.
- `get_context`의 권한은 "지금 시점"이라고 설명에 적어요. Claude가 대화 중 기억했어요.
- 확인할 것: ChatGPT의 `private_key_jwt`(jwks_uri) 연결, ChatGPT 앱 Codex 클라이언트가 401 뒤 인가로 넘어가는지, 폰 Claude 앱의 로그인·동의 화면.
- 통합 테스트로 옮길 것: [MCP PoC](../research/2026-11-20-mcp-poc.md)의 `test/flow.ts` 17개(허용 목록, 동의 화면, 브라우저 로그인 정리, 중복, version, 권한 변경, 해지, 감사 기록).

## 8. 다른 티켓에 넘기는 것

- **가구원 나가기·계정 삭제**: 나갈 때 그 사람의 `ai_connections` 행과 갱신 토큰을 지우고, 감사 기록 속 연결 이름을 어떻게 가릴지. ([가구원 나가기·계정 삭제](member-leave.md)에서 정했어요: 한 트랜잭션에서 행 삭제·토큰 `revoked`, 연결 이름은 "해지된 연결")
- **정식 출시 준비**: 허용 목록을 유지할지 넓힐지, ChatGPT 개인 계정 연결 확인, 개인정보처리방침에 "AI 연결로 외부 AI 서비스에 데이터가 전달됨" 문구.
- **나중에(지도 밖)**: 앱 안 AI 채팅(ChatGPT 플랜 연결·OpenRouter·API 키 후보, Claude 구독 연결은 약관상 불가), oat 스킬 배포.
