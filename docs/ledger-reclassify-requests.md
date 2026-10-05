# 타인 공용 기록 장부 이동 요청 (#444)

다른 가구원이 작성한 활성 공용 기록을 다른 활성 공용 장부로 옮기고 싶으면 작성자에게 **장부 이동 요청**(`requestType: "reclassify"`)을 보낸다. 요청은 목적 장부 `{bookId}` 하나만 담고 금액·메모 등 수정 요청과 섞지 않는다. 작성자가 승인하면 같은 DB 트랜잭션에서 거래의 `book_id`만 바뀌고 거래 ID·작성자·가구·금액·금융 계좌/결제수단·잔액은 그대로다. 이체 기록도 장부만 옮길 수 있다. 본인 기록은 기존처럼 직접 이동한다(#442).

## 계약

| 경로 | 입력 | 결과 |
| --- | --- | --- |
| `POST /api/record-change-requests` | `{targetType:"ledger_entry", targetId, requestType:"reclassify", proposedChanges:{bookId}, expectedEntryUpdatedAt, message?}` | `201 {data: Request}`. 작성자에게 "장부 이동 요청이 도착했습니다" 알림 |
| `POST /api/record-change-requests/{id}/resolve` | `{decision:"approved"\|"rejected", responseMessage?}` | `{data: Request}`. 승인 시점에 전제가 바뀌었으면 요청을 `expired`로 확정하고 `409 REQUEST_EXPIRED` |
| `POST /api/record-change-requests/{id}/cancel` | 없음 | `{data: Request}`. 이미 처리된 요청이면 `409` |

- 상태는 `pending`에서 `approved`/`rejected`/`cancelled`/`expired` 중 하나로 한 번만 전이한다. 승인·거절은 작성자만, 취소는 요청자만 할 수 있다.
- 요청 snapshot(제목·금액·유형·분류·거래일·출발/도착 장부 ID와 이름·`expectedEntryUpdatedAt`)은 서버 RPC가 만든다. 클라이언트는 reclassify 요청을 테이블에 직접 INSERT할 수 없다.
- 오류 코드: `ENTRY_CHANGED`·`REQUEST_ALREADY_PENDING`·`REQUEST_NOT_PENDING`·`REQUEST_EXPIRED`·`BOOK_ARCHIVED`는 409, `REQUEST_TARGET_NOT_FOUND`·`REQUEST_NOT_FOUND`·`BOOK_UNAVAILABLE`은 404, `REQUEST_FORBIDDEN`은 403, `REQUEST_SELF_TARGET`·`RECLASSIFY_DESTINATION_INVALID`·`VALIDATION_ERROR`는 400이다. 개인 기록, 다른 가구 기록, 다른 사람의 개인 장부는 존재 여부를 드러내지 않는 404다.
- 대기 요청은 요청자 한 명·기록 하나당 유형과 관계없이 1개다. 수정 요청이 대기 중이면 장부 이동 요청은 `REQUEST_ALREADY_PENDING`이다.
- 기존 update/delete·주식 변경 요청의 API와 오류 코드는 유지한다. 취소만 경합 시 이미 끝난 요청을 덮어쓰지 않도록 대기 상태 조건부 UPDATE로 바꿨다.

## 만료와 경쟁

대기 중인 장부 이동 요청은 다음 경우 DB 트리거가 즉시 `expired`로 바꾼다. 만료 뒤에는 새 요청을 만들 수 있다.

- 대상 기록이 수정·재분류·삭제됨 (작성자 직접 수정, 다른 요청 승인 포함)
- 출발 또는 도착 장부가 보관·삭제됨
- 요청자 또는 작성자가 가구를 떠남

승인 RPC는 트리거와 별개로 가구→장부→요청→거래 순서로 잠근 뒤 현재 거래 버전, 출발 장부, 같은 가구, 두 장부의 활성 공용 상태, 요청자·작성자의 가구원 여부를 다시 확인한다. 하나라도 다르면 거래를 바꾸지 않고 요청을 `expired`로 커밋한다. 동시 승인은 두 번째가 `REQUEST_NOT_PENDING`(409)이다. 실패한 승인은 장부 소속이나 잔액을 일부만 바꾸지 않는다.

배경 만료(수정·보관 등)는 푸시/인앱 알림을 새로 보내지 않는다. 요청 상세에 "만료됨"과 이유가 보인다. 승인 시점 만료는 요청자에게 "장부 이동 요청이 만료되었습니다" 알림을 보낸다.

## 프라이버시

작성자가 기록을 개인 장부로 옮기면 대기 요청은 만료된다. #442의 RLS가 비작성자에게서 그 요청·알림·snapshot(제목·금액·장부 이름)을 숨긴다. 과거 알림 링크로 요청 상세나 처리 API에 들어와도 404다. 작성자는 자신의 요청 이력을 계속 본다.

## 요청 행 보호 (기존 유형 포함)

`record_change_requests_guard` 트리거는 인증 클라이언트의 직접 UPDATE에서 다음을 막는다.

- 요청 내용(가구·요청자·대상·유형·메시지·`proposed_changes`·snapshot·생성 시각) 변경: `REQUEST_IMMUTABLE`
- 이미 끝난 요청의 상태 변경: `REQUEST_NOT_PENDING`
- 권한 밖 상태 전이: `REQUEST_ACTION_FORBIDDEN`. 요청자는 취소만, 작성자는 update/delete 요청의 승인·거절만 직접 할 수 있다. reclassify의 승인·거절·만료는 RPC로만 가능하다.

현재 앱의 update/delete·주식 요청 흐름은 이 범위 안에서 동작한다. 보안 정의자 RPC와 만료 트리거는 이 검사를 거치지 않는다.

## 운영 적용 절차

운영 DB에는 아래 순서대로 사람이 직접 적용한다. 이 PR 작업 중에는 운영 DB에 접속하거나 적용하지 않았다.

### 0. 사전 점검

선행 마이그레이션이 운영에 적용돼 있어야 한다: #440 → #441 → #442(`20261004083722_ledger_entry_request_expiry.sql`, `20261004083724_ledger_book_entry_writes.sql`).

```sql
-- 모두 true여야 한다
select 'expired' = any(enum_range(null::public.record_change_request_status)::text[]) as has_expired,
       to_regprocedure('public.write_ledger_entry(text,uuid,jsonb,uuid)') is not null as has_writer,
       to_regprocedure('public.mutate_ledger_book(uuid,text,text)') is not null as has_book_mutation,
       to_regprocedure('ledger_books_private.can_view_ledger_entry(uuid,uuid)') is not null as has_visibility_helper,
       not exists (select 1 from pg_trigger where tgname = 'record_change_requests_guard') as guard_not_installed;
-- 기록: 적용 전 요청 상태 분포(적용 후 같아야 한다)
select request_type, status, count(*) from public.record_change_requests group by 1, 2 order by 1, 2;
```

### 1. enum 마이그레이션 (단독 커밋)

`supabase/migrations/20261005090000_record_change_request_reclassify_type.sql`

PostgreSQL은 같은 트랜잭션에서 새로 추가한 enum 값을 사용할 수 없다. 그래서 이 파일을 먼저 단독으로 커밋한다.

### 2. RPC·정책·트리거 마이그레이션

`supabase/migrations/20261005090100_ledger_reclassify_requests.sql`

- reclassify 형태 CHECK(`NOT VALID` 후 `VALIDATE`), INSERT 정책 교체, 요청 보호 트리거, 만료 트리거 3개, `create_ledger_reclassify_request`·`resolve_ledger_reclassify_request`를 설치한다.
- 기존 요청·기록·잔액 데이터는 바꾸지 않는다. `lock_timeout 5s`/`statement_timeout 30s`로 오래 기다리지 않고 실패한다. 실패하면 트랜잭션 전체가 롤백되므로 원인을 확인한 뒤 다시 실행한다.

### 3. 적용 후 점검

```sql
select to_regprocedure('public.create_ledger_reclassify_request(uuid,uuid,timestamptz,text)') is not null as has_create,
       to_regprocedure('public.resolve_ledger_reclassify_request(uuid,text,text)') is not null as has_resolve,
       has_function_privilege('authenticated', 'public.create_ledger_reclassify_request(uuid,uuid,timestamptz,text)', 'execute') as auth_create,
       not has_function_privilege('anon', 'public.resolve_ledger_reclassify_request(uuid,text,text)', 'execute') as anon_blocked,
       (select count(*) from pg_trigger where tgname in ('record_change_requests_guard',
         'ledger_entries_expire_reclassify_requests', 'ledger_books_expire_reclassify_requests',
         'household_members_expire_reclassify_requests')) = 4 as triggers,
       (select convalidated from pg_constraint where conname = 'record_change_requests_reclassify_shape_check') as shape_validated;
-- 0단계와 같은 분포여야 한다
select request_type, status, count(*) from public.record_change_requests group by 1, 2 order by 1, 2;
```

### 4. 앱/API 배포

마이그레이션 뒤 앱을 배포한다. 새 앱은 두 RPC를 요구한다. 마이그레이션 직후 구버전 앱이 잠시 남아 있어도 안전하다.

- 구버전에는 장부 이동 요청 UI가 없다. 직접 INSERT는 정책이 막는다.
- 기존 수정·삭제 요청의 생성·승인·거절·취소는 그대로 동작한다.

### 5. 배포 후 확인

두 실제 계정으로 다음을 확인한다. 실제 iPhone 설치형 PWA·Safari 검증은 #438 결정에 따라 배포 후 진행하며 배포 차단 조건이 아니다.

- 요청 생성·승인·거절·취소
- 수정·보관으로 인한 만료와 새 요청
- 공용→개인 이동 뒤 비작성자 가림
- 승인 전후 잔액 불변

## 되돌리기

- 미처리 요청과 거래를 보존한다. 승인된 이동을 snapshot으로 일괄 되돌리지 않는다. 잘못 옮겨진 기록은 작성자가 직접 다시 옮긴다.
- **앱 문제:** 이전 앱으로 되돌리거나 수정 배포한다. 이전 앱은 reclassify 요청을 승인·거절하지 못한다. 승인은 엄격한 update 스키마가 `{bookId}`를 거부하고, 거절은 요청 보호 트리거가 막아 500이 난다. 어느 쪽도 데이터는 바꾸지 않는다. 요청자는 계속 취소할 수 있다.
- **새 요청만 막아야 할 때:** `revoke execute on function public.create_ledger_reclassify_request(uuid,uuid,timestamptz,text) from authenticated;`. 대기 요청의 처리·취소·만료는 계속 동작한다. 다시 열 때 `grant`한다.
- enum 값 `reclassify`는 제거하지 않는다. 요청 보호 트리거를 내리면 요청 내용 변조 우회로가 다시 열리므로 권장하지 않는다.

## scratch 검증

운영·공유 DB가 아닌 격리 DB `oat_ledger_books_444_test`에서 검증했다. 이 DB는 #442 마이그레이션이 적용된 `oat_ledger_books_442_clean_test`를 템플릿으로 복제했고, enum → RPC 순서로 이번 마이그레이션을 적용했다.

```sh
docker exec -i supabase_db_oat psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d oat_ledger_books_444_test < supabase/tests/ledger-reclassify-requests.sql
python3 supabase/tests/ledger-reclassify-requests-concurrency.py
```

- **SQL 회귀:** 두 가구로 다음을 확인하고 fixture를 롤백한다.
  - 생성 거부: 본인 기록, 개인 기록, 개인·타 가구 목적지, 같은 장부, 보관 장부, 오래된 버전, 중복 대기
  - 직접 INSERT·UPDATE 우회 차단
  - 승인 시 장부만 이동·잔액 불변, 경쟁 요청 만료, 거절·취소
  - 기록 수정·삭제와 출발·도착 보관, 장부 삭제, 가구 이탈로 인한 만료
  - 트리거를 우회한 오래된 요청의 승인 시점 만료
  - 이체 장부만 이동
  - 공용→개인 이동 뒤 비작성자의 요청·알림 가림
  - 기존 delete 요청 처리
- **동시성:** 두 세션이 실제로 잠금을 기다리는지 확인한다.
  - 동시 승인
  - 승인 ↔ 요청자 취소 (양쪽 순서)
  - 도착 장부 보관 → 승인
  - 승인 ↔ 작성자 수정 (양쪽 순서)
- **기존 SQL 회귀:** #441·#442 SQL 회귀(`ledger-book-entry-writes.sql`·`ledger-books-management.sql`·`ledger-books-atomic.sql`)도 444 DB에서 DB 이름만 stdin으로 바꿔 통과했다. `ledger-books.sql`은 #442의 직접 UPDATE 권한 회수 때문에 444 변경 전 기준 복제본에서도 `permission denied for table ledger_entries`로 실패한다. 이번 변경의 회귀가 아니다.
