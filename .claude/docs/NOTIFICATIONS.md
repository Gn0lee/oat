# NOTIFICATIONS.md

> 알림 기능 설계 노트 - Issue #341

## TL;DR

- 알림의 원장은 **User Notification**이다. 앱 안 알림함에 저장되고 읽음/미읽음, 이동 링크, 중복 방지, 수신자 범위를 가진다.
- 푸시와 이메일은 **Notification Channel**이다. 현재 마일스톤은 앱 내 알림과 Push를 구현하고, 이메일은 향후 채널로 열어둔다.
- 알림 수신 제어는 사용자별 **Notification Preference**로 관리한다. 가구 단위 전역 설정으로 두지 않는다.
- 알림은 가구 단위 row가 아니라 수신자별 **User Notification** row로 저장한다. 같은 사건이 여러 명에게 전달되면 수신자 수만큼 row를 만든다.
- 알림 이동은 raw URL이 아니라 **Notification Link Kind**와 params로 저장하고, 클라이언트가 앱 route로 해석한다.
- 알림함과 알림 설정은 화면을 분리한다. 알림 아이콘은 알림함으로 이동하고, `/settings/notifications`는 수신 제어 전용 화면이다.
- 개인 장부 내용은 알림에도 노출하지 않는다. 파트너에게 보낼 수 있는 알림은 공용 장부 또는 가구 전체에 이미 공개되는 데이터에 한정한다.
- 1차 구현은 알림 인프라와 **Collaboration Notification**을 우선한다. 수정/삭제 요청은 협업 알림의 대표 사례이며, 리마인더/분석 임계치 알림은 이번 마일스톤에서 제외한다.

---

## 1. 용어

| 용어 | 의미 |
|------|------|
| User Notification | 특정 사용자에게 저장되는 알림 메시지. 앱 안 알림함에서 조회하고 읽음 처리한다. |
| Notification Channel | User Notification을 앱 밖으로 전달하는 경로. Push, 이메일 등이 가능하다. |
| Notification Event | 알림을 만들 수 있는 도메인 사건. 예: 공용 지출 기록, 초대 수락. |
| Notification Type | 알림 설정과 표시 그룹에 사용하는 도메인+액션 단위 키. 예: `ledger_record_changed`, `stock_transaction_changed`. |
| Notification Link Kind | User Notification에 저장되는 제한된 이동 의도. 앱 route 문자열 대신 params와 함께 저장한다. |
| Notification Preference | 사용자가 알림 종류별로 앱 내/Push 수신 여부를 조정하는 설정. |
| Default Notification Preference | 사용자가 저장한 override가 없을 때 적용하는 제품 기본값. |
| Collaboration Notification | 가구 구성원이 공유 재무 데이터를 함께 관리하기 위해 받는 알림. |
| Record Change Request | 공용 기록의 비소유자가 소유자에게 수정 또는 삭제를 요청하는 협업 요청. |

---

## 2. 알림 후보 탐색 결과

이번 마일스톤은 리마인더/분석 임계치 알림을 제외하고, 가구 구성원 사이의 협업을 돕는 알림을 중심으로 설계한다.

### 2.1 협업 알림 범주

| 범주 | 목적 | 예시 | 액션 필요 |
|------|------|------|:---------:|
| 요청형 | 상대방의 결정이나 조치를 필요로 함 | 공용 기록 수정/삭제 요청, 초대 응답 | ✅ |
| 확인형 | 중요한 협업 상태 변화를 알려줌 | 초대 수락, 요청 승인/거절 결과 | 선택 |
| 공유 변경형 | 함께 보는 데이터가 바뀌었음을 알려줌 | 공용 계좌/결제수단 변경, 공용 장부 대량 등록 | 선택 |

단순 정보성 알림은 쉽게 노이즈가 되므로, 1차 구현은 요청형과 확인형을 우선한다. 공유 변경형 중 수정/삭제는 중요도가 높아 포함하고, 새 기록 추가는 사용자별 설정에서 기본 off 또는 조건부 알림으로 시작한다.

### 2.2 대표 협업 문제: 소유자 권한 기록

현재 공용 가계부 기록과 주식 거래 기록은 가구 구성원이 함께 조회할 수 있지만, 수정/삭제는 기록 소유자만 할 수 있다.

| 기록 | 조회 범위 | 수정/삭제 권한 | 협업 필요 |
|------|-----------|----------------|-----------|
| 공용 가계부 기록 | 가구 구성원 | owner only | 비소유자가 잘못된 금액/카테고리/삭제 필요를 요청 |
| 개인 가계부 기록 | 소유자 본인 | owner only | 대상 아님 |
| 주식 거래 기록 | 가구 구성원 | owner only | 비소유자가 잘못된 수량/단가/계좌/삭제 필요를 요청 |

비소유자는 직접 수정/삭제하지 않고 **Record Change Request**를 생성할 수 있다. 요청은 대상 기록 소유자에게 User Notification으로 전달된다.

### 2.3 가구/초대

| 후보 | 현재 근거 | 수신자 | 우선순위 | 비고 |
|------|-----------|--------|----------|------|
| 초대 수락 | `/api/invitations/accept` | 초대한 사람, 기존 가구 구성원 | 높음 | 가구 협업 시작점. 노이즈 낮음. |
| 초대 만료/취소 | invitations status, 삭제 API | 초대한 사람 | 낮음 | 만료 처리 배치가 먼저 필요할 수 있음. |
| 가구 이름 변경 | `/api/households/[id]` | 가구 구성원 | 낮음 | 영향은 작지만 audit 성격 있음. |

### 2.4 공용 장부

| 후보 | 현재 근거 | 수신자 | 우선순위 | 비고 |
|------|-----------|--------|----------|------|
| 공용 장부 수정 요청 | ledger entry owner-only update 정책 | 기록 소유자 | 높음 | 비소유자가 수정안을 보내고 소유자가 반영/거절한다. |
| 공용 장부 삭제 요청 | ledger entry owner-only delete 정책 | 기록 소유자 | 높음 | 비소유자가 삭제 사유를 보내고 소유자가 삭제/거절한다. |
| 공용 지출/수입/이체 생성 알림 | `/api/ledger-entries`, batch API | 작성자를 제외한 가구 구성원 | 중간 | 기본 off 또는 대량/큰 금액 조건부. batch는 1개 요약 알림. |
| 공용 장부 기록 수정/삭제 알림 | `/api/ledger-entries/[id]` | 작성자를 제외한 가구 구성원 | 높음 | 이미 공유된 기록의 변경/삭제는 협업 영향이 큼. |

### 2.5 계좌/결제수단/카테고리

| 후보 | 현재 근거 | 수신자 | 우선순위 | 비고 |
|------|-----------|--------|----------|------|
| 공용으로 보이는 계좌 생성/수정/삭제 | accounts API | 가구 구성원 | 중간 | 총자산과 주식 거래 계좌 맥락에 영향. |
| 결제수단 생성/수정/삭제 | payment_methods API | 가구 구성원 | 중간 | 지출 흐름 추적에 영향. 개인성 여부 정책 확인 필요. |
| 카테고리 생성/수정/삭제/정렬 | categories API | 가구 구성원 | 낮음 | 잦은 편집 가능성이 있어 알림 피로 우려. |
| 신용카드 결제일 리마인더 | `payment_methods.payment_day` | 소유자 | 중간 | 현재 컬럼 존재. 스케줄러와 Push 선호 설정 필요. |

### 2.6 자산/주식

| 후보 | 현재 근거 | 수신자 | 우선순위 | 비고 |
|------|-----------|--------|----------|------|
| 주식 거래 수정 요청 | transaction owner-only update 정책 | 거래 소유자 | 높음 | 비소유자가 수량/단가/날짜/계좌 수정안을 요청한다. |
| 주식 거래 삭제 요청 | transaction owner-only delete 정책 | 거래 소유자 | 높음 | 비소유자가 삭제 사유를 보내고 소유자가 삭제/거절한다. |
| 주식 거래 생성 알림 | transactions API, batch API | 작성자를 제외한 가구 구성원 | 중간 | 새 거래는 자산 현황에 영향. 기본 off 또는 조건부 가능. batch는 요약. |
| 주식 거래 수정/삭제 알림 | transactions API | 작성자를 제외한 가구 구성원 | 높음 | 보유 수량/수익률에 영향. |
| 종목 위험도 설정 변경 | stock-settings API | 가구 구성원 | 낮음 | 분석 설정 변경 알림. 자주 필요하진 않음. |
| 수익률/손실 임계치 | holdings, dashboard | 본인 또는 가구 구성원 | 낮음 | 사용자별 threshold 설정 없이는 구현하지 않는다. |
| 목표 비중 이탈/리밸런싱 | target_allocations, PRD | 본인 또는 가구 구성원 | 낮음 | 목표 비중 UI/정책 정리가 먼저 필요. |

### 2.7 보안/연동

| 후보 | 현재 근거 | 수신자 | 우선순위 | 비고 |
|------|-----------|--------|----------|------|
| MCP 토큰 생성/회수 | mcp-tokens API | 본인 | 중간 | 보안 이벤트. Push보다는 앱 내 알림 우선. |
| Push 구독/해제 | `PushNotificationManager`, `public/sw.js` | 본인 | 높음 | 설정 화면에서 테스트 알림까지 필요. |
| 시스템 동기화 실패 | GitHub Actions/KIS/환율 | 관리자 | 제외 | 사용자 협업 알림보다 운영 알림에 가깝다. |

### 제외: 리마인더/분석 임계치

이번 마일스톤에서는 최근 기록 공백, 신용카드 결제일, 월말 기록, 초과 지출, 저축률 하락, 주식 손익률, 목표 비중 이탈 알림을 다루지 않는다. 이들은 사용자별 기준값, 스케줄러, 빈도 제어, Push opt-in 정책이 필요하다.

---

## 3. 구현 이슈 후보

### Slice 1. User Notification 기반 구축 (#342)

- Type: AFK
- Blocked by: None
- 범위: `notifications`, `notification_preferences` 등 최소 스키마, API, 알림함 UI, 읽음 처리, 미읽음 배지, 사용자별 알림 종류 on/off.
- 완료 기준: 사용자가 알림 아이콘에서 알림함 페이지로 이동해 본인 알림 목록을 보고 읽음/전체 읽음 처리할 수 있으며, `/settings/notifications`에서는 알림 종류별 앱 내 수신 여부를 제어할 수 있다.

### 3.1 Notification Preference 원칙

사용자별 제어는 알림 종류와 채널을 분리한다.

| 축 | 예시 | 원칙 |
|----|------|------|
| notification type | `ledger_record_changed`, `stock_transaction_changed`, `invitation_accepted` | 도메인+액션 단위. UI에서는 사람이 읽는 그룹명으로 묶어 노출할 수 있다. |
| channel | `in_app`, `push`, 향후 `email` | 전달 경로. 현재 저장 구조는 타입별 row에 채널별 boolean 컬럼을 둔다. |
| enabled | true/false | 사용자별로 저장한다. |

`notification_preferences`는 notification type별 1 row를 저장한다.

```sql
notification_preferences (
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  in_app_enabled boolean not null,
  push_enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, type)
)
```

저장된 row가 없으면 Default Notification Preference를 적용한다. 알림 종류가 늘어날 때 기존 사용자 전체에 preference row를 backfill하지 않는다.

초기 기본값:

| 알림 종류 | In-app | Push | 비고 |
|----------|:------:|:----:|------|
| 가계부 수정/삭제 요청 | on | off | 상대방 조치가 필요한 요청형 |
| 주식 거래 수정/삭제 요청 | on | off | 상대방 조치가 필요한 요청형 |
| 가계부 요청 처리 결과 | on | off | 요청자 확인형 |
| 주식 거래 요청 처리 결과 | on | off | 요청자 확인형 |
| 가계부 기록 수정/삭제 | on | off | 함께 보던 데이터가 바뀌는 변경형 |
| 주식 거래 수정/삭제 | on | off | 함께 보던 데이터가 바뀌는 변경형 |
| 새 공용 가계부 기록 추가 | off | off | 노이즈 가능성이 높아 기본 off |
| 새 주식 거래 추가 | off | off | 노이즈 가능성이 높아 기본 off |
| 초대 수락 | on | off | 중요하지만 즉시성은 낮음 |

Preference가 꺼져 있더라도 시스템이 요청 상태 자체를 잃으면 안 된다. 예를 들어 수정 요청은 `record_change_requests`에 저장되고, preference는 User Notification 생성/채널 전달만 제어한다.

`in_app_enabled=false`이면 해당 User Notification row를 만들지 않는다. 나중에 사용자가 설정을 켜도 과거 알림이 알림함에 나타나지 않는다. `push_enabled=false`이면 Push 발송만 하지 않는다. Issue #342에서는 Push 토글을 저장하고 UI에 노출하지만 실제 Push 발송은 후속 이슈에서 구현한다.

이번 마일스톤에서 제외:

- 알림 빈도 설정
- 조용한 시간
- 이메일 채널 설정 UI
- 알림 digest 또는 요약 발송

### 3.2 User Notification 기반 구축 확정 설계 (#342)

#### 저장 모델

`notifications`는 가구 단위 알림이 아니라 수신자별 User Notification row를 저장한다. 같은 Notification Event가 여러 명에게 전달되어야 하면 수신자마다 row를 만든다.

핵심 컬럼:

```sql
notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  household_id uuid null references households(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text null,
  link_kind notification_link_kind null,
  link_params jsonb not null default '{}',
  source_type text null,
  source_id uuid null,
  dedupe_key text null,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  check (
    (source_type is null and source_id is null)
    or (source_type is not null and source_id is not null)
  )
)
```

RLS 기준은 `recipient_id = auth.uid()`이다. `household_id`는 필터링, 디버깅, 향후 다중 가구 지원을 위한 nullable context이며, 같은 가구 구성원이라는 이유로 다른 사람의 알림을 조회할 수 없어야 한다.

알림 생성은 클라이언트가 직접 insert하지 않는다. 서버 helper가 admin client로 생성하고, RLS는 본인 조회와 본인 읽음 처리의 최소 방어선으로 둔다.

#### Notification Type

`notifications.type`과 `notification_preferences.type`은 같은 `notification_type` enum을 공유한다.

초기 타입:

```ts
type NotificationType =
  | 'ledger_record_change_request'
  | 'stock_transaction_change_request'
  | 'ledger_request_result'
  | 'stock_transaction_request_result'
  | 'ledger_record_changed'
  | 'stock_transaction_changed'
  | 'ledger_record_created'
  | 'stock_transaction_created'
  | 'invitation_accepted';
```

설정 UI에서는 필요하면 "협업 요청", "요청 처리 결과", "공유 기록 변경", "새 공유 기록 추가" 같은 섹션으로 그룹핑한다. 타입 자체는 장부/주식 도메인을 숨기지 않는다.

#### Notification Link

알림 이동은 raw URL을 저장하지 않는다. `link_kind`와 `link_params`를 저장하고, 클라이언트의 공용 route builder가 앱 route로 해석한다.

초기 link kind:

```ts
type NotificationLinkKind =
  | 'ledger_record_date'
  | 'stock_record_date'
  | 'record_change_request_detail'
  | 'household_settings'
  | 'notification_settings';
```

예시:

| link_kind | link_params | route |
|-----------|-------------|-------|
| `ledger_record_date` | `{ "date": "2026-06-01" }` | `/ledger/records?date=2026-06-01` |
| `stock_record_date` | `{ "date": "2026-06-01" }` | `/assets/stock/records?date=2026-06-01` |
| `record_change_request_detail` | `{ "requestId": "..." }` | 후속 이슈의 요청 상세 화면 |
| `household_settings` | `{}` | `/settings/household` |
| `notification_settings` | `{}` | `/settings/notifications` |

`notification_link_kind`는 DB enum으로 제한한다. `link_params` 형태는 DB에서 강하게 검증하지 않고, 클라이언트와 서버가 공유하는 Zod schema와 TypeScript discriminated union으로 검증한다. 공유 schema 모듈은 브라우저에서도 import할 수 있도록 Supabase server client나 `next/server`를 의존하지 않는다.

#### Source and Dedupe

`source_type`과 `source_id`는 이 알림이 어떤 도메인 객체에서 왔는지 추적하는 메타데이터다. `source_type`은 text로 두고 앱 코드에서 Zod로 현재 허용 값을 제한한다. `notification_type`과 `link_kind`처럼 UI/설정/라우팅에 직접 영향을 주는 값만 DB enum으로 잠근다.

초기 source type 후보:

```ts
type NotificationSourceType =
  | 'ledger_entry'
  | 'stock_transaction'
  | 'record_change_request'
  | 'invitation';
```

`dedupe_key`는 같은 수신자에게 같은 사건의 알림이 중복 저장되는 것을 막는다.

```sql
create unique index notifications_recipient_dedupe_key_unique
on public.notifications (recipient_id, dedupe_key)
where dedupe_key is not null;
```

예시:

- `invitation_accepted:{invitationId}`
- `record_change_request_created:{requestId}`
- `stock_transaction_batch_created:{batchId}`

반복해서 발생할 수 있는 이벤트는 너무 넓은 key를 쓰지 않는다. 예를 들어 같은 장부 기록이 여러 번 수정될 수 있으면 이벤트 id나 수정 시각을 포함한다.

#### Read State and APIs

읽음 상태는 `read_at timestamptz null` 하나로 표현한다. `is_read` boolean은 두지 않는다.

필수 API:

```txt
GET /api/notifications?limit=20&cursor=...
GET /api/notifications/unread-count
PATCH /api/notifications/[id]/read
POST /api/notifications/read-all
GET /api/notification-preferences
PATCH /api/notification-preferences/[type]
```

알림 목록은 최신순 cursor pagination을 사용한다.

```sql
order by created_at desc, id desc
```

cursor는 `createdAt + id` 조합을 인코딩한다. 알림 삭제, 아카이브, 자동 만료, 보존 기간 정책은 Issue #342 범위에서 제외한다.

`GET /api/notification-preferences`는 Default Notification Preference와 저장된 override를 서버에서 merge한 완성 목록을 반환한다. `PATCH /api/notification-preferences/[type]`는 단건 타입의 `inAppEnabled`, `pushEnabled`를 저장한다. 설정 토글은 낙관적 업데이트를 적용하고 실패 시 rollback한다.

#### UI Behavior

알림함은 `/notifications`, 알림 설정은 `/settings/notifications`로 분리한다.

메인 UI에는 전역 bell 아이콘을 둔다.

- 모바일 top-level header 우측: bell + unread badge
- 데스크톱 header 우측: bell + unread badge
- sidebar와 bottom nav에는 추가하지 않는다.

미읽음 배지는 `GET /api/notifications/unread-count`를 사용한다. Issue #342에서는 Supabase Realtime 구독을 붙이지 않고, React Query 조회/무효화/focus refetch 수준으로 시작한다.

알림 클릭 시 해당 알림을 낙관적으로 읽음 처리하고 즉시 이동한다. 읽음 처리 실패가 navigation을 막지는 않는다. 알림함에는 단건 읽음과 전체 읽음 액션을 제공한다.

`/settings/notifications`의 Push 토글은 저장 가능하게 제공한다. 실제 Push 발송은 후속 이슈에서 구현하므로, UI에는 "Push 발송은 이후 지원" 수준의 짧은 보조 문구를 둔다.

### Slice 2. Collaboration Request 모델 구축 (#343)

- Type: AFK
- Blocked by: Slice 1
- 범위: 공유 기록 수정/삭제 요청을 저장하는 스키마, 상태 흐름, 대상 기록 참조 모델.
- 완료 기준: 공용 가계부 기록과 주식 거래 기록을 대상으로 pending/approved/rejected/cancelled 요청을 만들 수 있다.

### Slice 3. 공용 장부 협업 요청 (#344)

- Type: AFK
- Blocked by: Slice 1, Slice 2
- 범위: 비소유자가 공용 ledger entry에 수정안 또는 삭제 사유를 보내고, 소유자가 알림에서 확인한다. 개인 장부는 제외.
- 완료 기준: 요청 생성 시 기록 소유자에게 알림이 생성되고, 소유자는 요청 상세에서 승인/거절할 수 있다.

### Slice 4. 공용 장부 변경 알림 (#345)

- Type: AFK
- Blocked by: Slice 1
- 범위: 공용 ledger entry 생성/수정/삭제 시 작성자를 제외한 구성원에게 알림을 만든다. 생성 알림은 기본 off 또는 조건부로 둔다.
- 완료 기준: 공용 기록 수정/삭제는 기본 알림으로 전달되고, 새 기록 추가 알림은 사용자별 설정을 켰을 때만 전달된다.

### Slice 5. 주식 거래 협업 요청 (#346)

- Type: AFK
- Blocked by: Slice 1, Slice 2
- 범위: 비소유자가 transaction에 수정안 또는 삭제 사유를 보내고, 소유자가 알림에서 확인한다.
- 완료 기준: 요청 생성 시 거래 소유자에게 알림이 생성되고, 소유자는 요청 상세에서 승인/거절할 수 있다.

### Slice 6. 주식 거래 변경 알림 (#347)

- Type: AFK
- Blocked by: Slice 1
- 범위: transaction 생성/수정/삭제 시 작성자를 제외한 구성원에게 알림을 만든다. 생성 알림은 기본 off 또는 조건부로 둔다.
- 완료 기준: 거래 수정/삭제는 기본 알림으로 전달되고, 새 거래 추가 알림은 사용자별 설정을 켰을 때만 전달된다.

### Slice 7. 요청 처리 결과와 초대 수락 확인 알림 (#348)

- Type: AFK
- Blocked by: Slice 1, Slice 2
- 범위: 요청 승인/거절/취소 결과를 요청자에게 알림으로 전달하고, 초대 수락 시 기존 구성원에게 확인형 알림을 전달한다.
- 완료 기준: 요청자는 처리 결과 알림을 받고 원본 기록으로 이동할 수 있으며, 초대 수락 시 기존 구성원이 가구 화면으로 이동할 수 있다.

### Slice 8. Push 채널 구독과 테스트 알림 (#349)

- Type: AFK
- Blocked by: Slice 1, Slice 3, Slice 4, Slice 5, Slice 6, Slice 7
- 범위: Push subscription 저장소, `/settings/notifications`, 권한 요청, 구독/해제, 테스트 Push.
- 완료 기준: 앱 내 협업 알림이 동작한 뒤, 설정에서 Push를 켜고 테스트 알림과 주요 협업 알림 Push를 받을 수 있다.

---

## 4. 아직 확정해야 할 질문

1. 수정 요청이 구체적인 변경안을 포함해야 하는지, 아니면 사유/메시지만 보내고 소유자가 직접 수정해야 하는지.
2. 삭제 요청 승인 시 시스템이 즉시 삭제할지, 소유자가 원본 화면에서 다시 삭제해야 하는지.
3. 요청 상태를 pending/approved/rejected/cancelled로 충분히 볼지, expired도 둘지.
