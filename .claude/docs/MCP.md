# MCP.md

> oat MCP 서버 설계 노트. AI 도구가 사용자의 oat 데이터를 안전하게 조회하고, 이후 생성/수정까지 확장하기 위한 기준 문서입니다.

## TL;DR

- **목표**: 최종적으로 public remote MCP를 제공해 서비스 사용자가 자신의 AI 도구로 oat 데이터를 다룰 수 있게 한다.
- **v0 범위**: private beta, read-only. 쓰기/삭제는 열지 않는다.
- **배포 위치**: 기존 Next.js 앱 안의 `app/api/mcp/route.ts`에서 시작한다.
- **전송 방식**: 원격 배포를 전제로 Streamable HTTP transport를 사용한다.
- **인증**: 앱에서 사용자별 MCP 토큰을 발급한다. 토큰은 특정 `household_id`에 고정된다.
- **권한 모델**: 토큰에서 `userId`, `householdId`, `scopes`를 확정하고, MCP tool 입력으로는 받지 않는다.
- **프라이버시**: 앱의 공용/개인 지출 모델을 그대로 따른다. 파트너 개인 지출 상세는 노출하지 않는다.
- **감사 로그**: 모든 MCP tool 호출을 기록한다.

---

## 1. 배경

oat는 가족의 현금 흐름과 자산 성장을 함께 추적하는 서비스입니다. MCP를 제공하면 Claude, Cursor, ChatGPT 같은 AI 도구가 사용자의 허가를 받은 범위 안에서 oat 데이터를 조회하고 분석할 수 있습니다.

최종 목표는 public MCP이지만, 금융/가계부 데이터의 민감도를 고려해 첫 버전은 read-only private beta로 시작합니다. 이 단계에서 검증할 것은 다음입니다.

- MCP endpoint 배포와 클라이언트 연결
- 사용자별 토큰 인증
- scope 기반 권한 검사
- 가계부 privacy 모델의 MCP 적용
- tool 응답 포맷과 데이터 제한
- audit log 수집

---

## 2. 단계별 전략

| 단계 | 범위 | 인증 | 제공 기능 |
|------|------|------|----------|
| v0 Private Beta | 나와 가족 중심 | 사용자별 MCP 토큰 | read-only tools |
| v1 Controlled Public | 제한된 사용자 공개 | 사용자별 토큰 + scope 관리 | read-only + 일부 write |
| v2 Public OAuth | 일반 사용자 공개 | OAuth 기반 MCP authorization | 사용자 동의, 토큰 회수, scope별 연결 |

v0의 MCP 토큰 방식은 public OAuth와 충돌하지 않습니다. 서버 내부에서는 모든 인증 방식을 다음 형태로 정규화합니다.

```ts
type McpAuthContext = {
  userId: string;
  householdId: string;
  scopes: string[];
  authMethod: "personal_token" | "oauth";
};
```

tool 구현은 `authMethod`에 직접 의존하지 않고 `McpAuthContext`만 사용합니다. 이후 OAuth가 도입되어도 tool 로직을 크게 바꾸지 않기 위함입니다.

---

## 3. 배포와 Transport

v0는 기존 Next.js 앱 안에 MCP endpoint를 둡니다.

```text
app/api/mcp/route.ts
```

원격 AI 도구 연결을 목표로 하므로 stdio가 아니라 Streamable HTTP transport를 기본으로 합니다.

구현 시 지켜야 할 MCP transport 기준:

- MCP 메시지는 JSON-RPC 2.0 기반입니다.
- Streamable HTTP 서버는 단일 MCP endpoint에서 POST/GET을 지원합니다.
- HTTP 요청에는 `Authorization: Bearer <token>`을 사용합니다.
- 모든 연결에서 `Origin` 검증을 수행합니다.
- client가 보낸 `MCP-Protocol-Version`을 검증합니다.
- v0에서는 streaming/SSE를 필수로 만들지 않고, 가능한 경우 JSON 응답 중심으로 단순화합니다.

참고:

- [MCP Transports, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [MCP Authorization, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)

---

## 4. 인증 모델

### 4.1 사용자별 MCP 토큰

앱 설정 화면에서 사용자가 MCP 토큰을 발급합니다.

```text
/settings/mcp
```

토큰 생성 UI:

- 토큰 이름: 예) Claude Desktop, Cursor, ChatGPT
- 권한: v0에서는 읽기 전용 전체 접근
- 만료일: 기본 90일
- 생성 직후 원문 토큰 1회 표시

토큰 목록 UI:

- 이름
- 권한
- 생성일
- 만료일
- 마지막 사용 시각
- 회수 버튼

### 4.2 토큰 저장 원칙

원문 토큰은 DB에 저장하지 않습니다.

```text
사용자에게 표시: oat_mcp_xxxxxxxxx
DB 저장: token_hash, prefix, last4
```

권장 테이블:

```sql
create table public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  token_prefix text not null,
  token_last4 text not null,
  scopes text[] not null,
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
```

### 4.3 Supabase Auth와의 관계

MCP 토큰은 Supabase Auth 로그인을 대체하지 않습니다. 웹 앱은 기존처럼 Supabase Auth를 사용하고, MCP endpoint는 자체 토큰을 검증한 뒤 내부 `McpAuthContext`를 만듭니다.

```text
AI 도구
  -> Authorization: Bearer oat_mcp_xxx
  -> oat MCP endpoint
  -> mcp_tokens.token_hash 검증
  -> McpAuthContext 생성
  -> 기존 lib/api 함수 또는 MCP 전용 read 함수 호출
  -> Supabase 접근
```

v0에서는 서버 내부에서 `service_role` 클라이언트를 사용할 수 있습니다. 단, `service_role`은 RLS를 우회하므로 MCP 함수는 반드시 `McpAuthContext.userId`와 `McpAuthContext.householdId`를 기준으로 명시적 권한 검사를 수행해야 합니다.

금지:

- AI tool 입력으로 `userId` 받기
- AI tool 입력으로 `householdId` 받기
- 사용자가 보낸 `household_id`를 그대로 쿼리에 사용하기
- Supabase service role key를 MCP 클라이언트에 노출하기

---

## 5. Scope

v0는 read-only입니다.

초기 scope:

```text
read:overview
read:ledger
read:assets
read:references
```

향후 쓰기 기능을 열 때는 다음처럼 분리합니다.

```text
ledger:write
transactions:write
delete:*        # v0/v1에서는 제공하지 않음
```

계좌/결제수단 잔액은 분석에 필요하므로 read-only 범위에 포함합니다. 다만 사용자가 동의하는 scope 설명에서는 단순 "목록 조회"가 아니라 "계좌, 결제수단, 잔액, 현금흐름 조회"라고 명확히 표현해야 합니다.

---

## 6. Privacy Model

MCP는 앱의 가계부 privacy 모델을 그대로 따라야 합니다.

| 데이터 | MCP 노출 |
|--------|----------|
| 공용 지출 상세 | 같은 가구원이면 노출 |
| 내 개인 지출 상세 | 노출 |
| 파트너 개인 지출 상세 | 노출하지 않음 |
| 파트너 개인 지출 합계 | 월 합계 등 집계만 노출 |
| 계좌/결제수단 | 같은 가구 컨텍스트에서 read scope가 있으면 노출 |
| 주식/자산 현황 | 같은 가구 컨텍스트에서 read scope가 있으면 노출 |

`search_ledger_entries`는 파트너 개인 지출 상세를 반환하면 안 됩니다.

`get_financial_overview`, `get_ledger_stats` 같은 집계 응답은 파트너 개인 지출을 합계로만 반영할 수 있습니다.

---

## 7. Audit Log

v0부터 모든 tool 호출을 기록합니다.

권장 테이블:

```sql
create table public.mcp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references public.mcp_tokens(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  tool_name text not null,
  input_summary jsonb,
  result_status text not null,
  error_code text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
```

주의:

- 민감한 원문 입력을 그대로 저장하지 않습니다.
- 검색어, 메모, 상점명 같은 내용은 필요 최소한으로 요약하거나 저장하지 않습니다.
- 날짜 범위, limit, scope, tool 이름처럼 운영과 디버깅에 필요한 정보 중심으로 남깁니다.

---

## 8. v0 Tools

v0는 resources 없이 tools만 제공합니다. capabilities와 privacy 설명은 `get_context` 응답에 포함합니다.

### 8.1 `get_context`

현재 MCP 연결의 기본 컨텍스트를 반환합니다.

반환:

- 사용자 프로필
- household 정보
- scopes
- 기본 기간
- MCP capabilities
- privacy model summary

### 8.2 `get_financial_overview`

현금흐름과 자산 상태를 한 번에 요약합니다.

기본 기간:

- 이번 달

반환:

- 월 수입/지출/순현금흐름
- 총자산 요약
- 주식 평가/수익률 요약
- 눈에 띄는 변화 또는 highlights
- privacy metadata

### 8.3 `list_references`

AI가 다른 tool을 호출할 때 필요한 참조 데이터를 반환합니다.

반환:

- 가구원 목록
- 카테고리 목록
- 계좌 목록
- 결제수단 목록

### 8.4 `search_ledger_entries`

기간, 금액, 카테고리, 키워드 등으로 가계부 상세 내역을 조회합니다.

제한:

- 기본 기간은 이번 달
- 한 번에 최대 100건
- cursor 또는 page 기반 pagination
- 파트너 개인 지출 상세 제외

### 8.5 `get_ledger_stats`

기간별 가계부 집계를 반환합니다.

지원 축:

- 월별 추이
- 카테고리별
- 가구원별
- 결제수단별

제한:

- 최대 12개월
- 파트너 개인 지출은 세부 항목 없이 합계만 반영

### 8.6 `get_asset_snapshot`

자산/주식 snapshot을 반환합니다.

입력 옵션:

```ts
{
  includeHoldings?: boolean;
  includeAllocation?: boolean;
}
```

반환:

- 총자산
- 자산군별 배분
- 소유자별 배분
- 주식 보유 현황
- 수익률 요약

---

## 9. 공통 응답 포맷

모든 tool 응답은 가능한 한 다음 메타데이터를 포함합니다.

```json
{
  "meta": {
    "period": {
      "from": "2026-05-01",
      "to": "2026-05-31"
    },
    "scope": ["read:overview", "read:ledger"],
    "privacy": {
      "included": ["shared ledger details", "own private ledger details"],
      "aggregatedOnly": ["partner private expenses"],
      "excluded": ["partner private expense details"]
    },
    "limits": {
      "maxLedgerEntries": 100,
      "maxStatsMonths": 12
    }
  },
  "summary": {},
  "data": {}
}
```

기간이 없는 tool은 `period: null`을 사용합니다.

---

## 10. 데이터 제한

| Tool | 기본 범위 | 최대 범위 |
|------|----------|----------|
| `get_financial_overview` | 이번 달 + 현재 자산 | 최근 12개월 요약 |
| `search_ledger_entries` | 이번 달 | 100건/page |
| `get_ledger_stats` | 이번 달 | 12개월 |
| `get_asset_snapshot` | 현재 snapshot | 12개월 요약 추이 |

전체 raw data를 한 번에 반환하지 않습니다. 필요 시 pagination과 집계 tool을 조합합니다.

---

## 11. Settings UI

설정 하위에 MCP 연결 화면을 둡니다.

```text
app/(main)/settings/mcp/page.tsx
```

화면 구성:

- MCP 연결 설명
- read-only 권한 안내
- 토큰 목록
- 새 토큰 생성 다이얼로그
- 생성된 토큰 1회 표시
- 토큰 회수

사용자에게 반드시 보여줄 문구:

- 이 토큰으로 AI 도구가 oat 데이터를 읽을 수 있습니다.
- 토큰은 생성 직후 한 번만 표시됩니다.
- 파트너 개인 지출 상세는 노출되지 않고, 합계만 분석에 포함됩니다.
- 토큰은 언제든 회수할 수 있습니다.

---

## 12. 구현 순서 제안

1. `mcp_tokens`, `mcp_audit_logs` 마이그레이션 추가
2. MCP 토큰 생성/회수 API 추가
3. `/settings/mcp` UI 추가
4. MCP auth helper 구현
5. MCP tool 공통 wrapper 구현
6. read-only tool 6개 구현
7. audit log 연결
8. MCP 클라이언트 연결 테스트
9. public OAuth 전환을 위한 gap 정리

배포 후 테스트와 MCP 클라이언트 연결 방법은 `.claude/docs/MCP_USAGE.md`를 참고합니다.

---

## 13. 보류한 결정

v0에서는 다루지 않습니다.

- MCP resources
- write tools
- delete tools
- OAuth authorization flow
- Dynamic Client Registration
- 장기 streaming/SSE 활용
- 여러 household를 하나의 토큰으로 선택하는 방식

---

## 14. 열린 질문

- Next.js Route Handler에서 사용할 MCP SDK/transport 구현체를 무엇으로 할 것인가?
- Vercel 환경에서 Streamable HTTP의 GET/SSE 요구사항을 얼마나 지원할 것인가?
- `service_role` 기반 MCP read 함수와 기존 RLS 기반 `lib/api` 함수를 어떻게 분리할 것인가?
- audit log를 사용자에게 보여주는 화면을 v0에 포함할 것인가?
- public OAuth 단계에서 기존 `mcp_tokens` 테이블을 OAuth access token 저장/검증 모델과 어떻게 통합할 것인가?
