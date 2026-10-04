# 장부 이전 운영 절차 (#440)

계약: #435·#437·#438·#440. 이 문서는 실행 절차이며 **운영 사전 점검·대조와 실제 iPhone PWA 검증은 미수행 외부 필수 게이트**다. `is_shared`, 구버전 생성/검색 호환, 기존 태그와 인덱스는 이번 배포에서 유지한다.

## 실행 전 체크포인트

- expand 전에 `scripts/ledger-books/preflight.sql`로 실제 운영의 모든 가구(거래 없는 가구 포함)를 다시 조사한다. 과거 조사인 1가구·9건을 현재 수치로 쓰지 않는다. 작성자의 현재 가구 관계, 고아/다른 가구 금융 참조·카테고리·태그 연결과 미처리 변경 요청을 확인한다. 금융수단 공유 허용의 사후 변경만으로 과거 기록을 이상 행으로 판정하지 않는다. 이상 행은 ID와 원인을 제한된 저장소에 기록하고 **임의 보정 없이 중단**한다.
- 기준 자료는 하나의 읽기 전용 `REPEATABLE READ` 스냅샷에서 추출한다. 가구/구성원, 거래 전체 행(`id`, 가구·작성자, `type`, `amount`, `is_shared`, 모든 금융 참조, 제목·메모·카테고리, `transacted_at`·`created_at`·`updated_at`), 태그와 연결, 계좌/결제수단별 잔액·연결·시각, 변경 요청을 함께 보관한다. 프로젝트/DB·배포 버전·스냅샷 경계·추출 건수·파일 해시를 기록한다. 자료와 감사 로그는 암호화하고 운영 담당자에게만 읽기 권한을 주며, 개인 내용/키를 Git·일반 로그·공유 보고서에 넣지 않는다.
- 기준 추출 **전에** 모든 쓰기 경로(DB 직접 쓰기·구버전·홈·MCP 포함)를 포괄하는 **기존 검증된 감사 창 또는 WAL 기반 증빙**이 있어야 한다. 트랜잭션 ID, 커밋 여부/순서, 행 ID, INSERT/UPDATE/DELETE의 전후 값(삭제 전 값 포함), 태그·금융 잔액·가구 관계 변경이 필요하다. 단순 시각이나 임의 LSN을 찍는 것으로 대체하지 않는다. 수집 방식이 없거나 증거가 불완전하면 운영 담당자가 이를 확보·검증할 때까지 중단한다. 이 배포가 새 감사 수집기를 설치해 주지는 않는다.
- 두 스냅샷 사이에서 새로 가시화된 커밋만 계상한다. 시작 때 이미 가시적이었던 트랜잭션과 종료 때 아직 미커밋인 트랜잭션은 제외하고, 시작 때 진행 중이었다가 종료까지 커밋된 트랜잭션은 포함한다. 롤백은 제외하고 재전달은 트랜잭션/이벤트 식별자로 중복 제거한다. 운영 증빙 방식은 [PostgreSQL 스냅샷](https://www.postgresql.org/docs/17/transaction-iso.html)과 [논리 디코딩](https://www.postgresql.org/docs/17/logicaldecoding-explanation.html)을 따른다.

## 단계별 적용

마이그레이션을 모두 한 번에 자동 적용하지 않는다. 설치 CLI 2.108.0의 `migration up`에는 target-version 옵션이 없다. 운영 담당자는 PG 연결 환경변수를 보안 주입하고 연결 대상과 linked 프로젝트가 같은 운영 DB인지 확인한다. 저장소 루트에서 **선택한 파일만** 실행하고 성공 커밋 후에만 해당 버전을 이력 처리한다. 아래는 expand 예시이며 다른 단계는 표의 파일과 그 파일명 앞 버전으로 각각 실행한다. 연결정보를 명령 인수·출력·저장소에 남기지 않는다.

```sh
PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s' psql -X -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/20261002063236_expand_ledger_books.sql
supabase migration repair --linked --status applied 20261002063236
```

첫 명령이 실패하면 repair와 다음 단계를 실행하지 않는다. 커밋됐으나 repair 실패/응답 유실이면 실제 DB 객체와 이력을 확인해 **이력만** 맞춘다. 커밋된 CREATE SQL을 무작정 재실행하지 않는다.

| 단계 | 적용 대상 | 다음 단계 조건 |
| --- | --- | --- |
| 1. expand | `supabase/migrations/20261002063236_expand_ledger_books.sql` | nullable `book_id`, 신규 가구 기본 시드, 구버전 쓰기 호환과 NULL 행의 레거시 조회가 동작한다. 기존 거래 전체 backfill은 하지 않는다. 두 가구 생성 경로와 직접 가구 INSERT에서 같은 트랜잭션의 활성 공용 기본 `생활비` 하나를 확인한다. |
| 2. install-backfill | `supabase/migrations/20261002063302_install_ledger_books_backfill.sql` | `public.backfill_ledger_books(p_batch_size integer default 500) RETURNS integer` 설치만 완료한다. 클라이언트 `anon`/`authenticated`/`PUBLIC` 실행 권한이 없고 `service_role`만 실행할 수 있음을 확인한다. |
| 3. batch-backfill | 아래 호출을 독립 트랜잭션으로 반복 | 기존 공용 → 최초 시스템 시드 `생활비`, 개인 → 가구·작성자별 `개인 생활비`. 새 구버전 공용 생성은 현재 기본 장부를 사용한다. 거래 없는 기존 가구에도 기본 하나가 생긴다. 각 커밋을 기록하고 아래 대조 및 NULL 0 검증을 통과한다. |
| 4. validate | `supabase/migrations/20261002063304_validate_ledger_books.sql` | 실제 데이터 이상 재점검, 같은 가구 FK·개인 작성자·공개 범위·기본 하나·이름/보관 불변식 및 온라인 제약 검증이 성공한다. 불일치는 보정하지 않고 중단한다. |
| 5. enforce | `supabase/migrations/20261002063305_enforce_ledger_books_not_null.sql` | 검증된 제약과 독립 NULL 0 증빙을 확인한 후에만 `book_id NOT NULL`을 적용한다. 신규·구버전 생성/수정에서도 누락이 없다. |
| 6. API 배포 | `supabase/migrations/20261002111422_atomic_ledger_writes.sql` 적용 후 해당 API 버전 배포 | RPC와 스키마 계약을 먼저 확인한다. 거래·태그·잔액의 원자적 실패/재시도, 기존 입력·조회·검색·홈·MCP 호환을 검증하고 실제 기기 게이트를 완료한다. |

기준 추출은 expand 전에, 종료 추출은 backfill 뒤에 `scripts/ledger-books/checkpoint.sql`을 `psql -X -A -t -v ON_ERROR_STOP=1 -f`로 실행해 서로 다른 보안 파일에 출력한다. 거래 `book_id`를 제외한 원래 자료를 추출한다. 배치 완료 뒤 validate 전에 `scripts/ledger-books/reconcile.sql`을 `psql -X -v ON_ERROR_STOP=1 -f`로 실행한다. 읽기 전용 트랜잭션을 가진 스크립트에는 `--single-transaction`을 붙이지 않는다. reconcile 성공만으로 체크포인트/동시 쓰기 대조가 완료되는 것은 아니다.

expand 뒤 `scripts/ledger-books/index-online.sql`을 `psql -X -v ON_ERROR_STOP=1 -f`로 별도 실행한다. `CREATE INDEX CONCURRENTLY`는 트랜잭션 안에서 실행할 수 없으므로 `--single-transaction`을 붙이지 않는다. 재실행 시 인덱스의 `indisvalid`/`indisready`도 확인하며, 실패한 빌드의 무효 인덱스는 운영 담당자가 확인 후 `DROP INDEX CONCURRENTLY`로 제거하고 재시도한다.

그 밖의 DDL은 독립 트랜잭션으로 실행하고 유한한 잠금·문장 제한을 적용한다(검증 시간은 리허설 실측에 맞춰 조정). 제한을 넘으면 해당 트랜잭션을 롤백하고 차단 세션/긴 트랜잭션을 확인한다. 5/10/20초 간격으로 최대 3회 재시도한 뒤 중단한다.

배치는 승인된 `service_role` 또는 마이그레이션 소유자 운영 연결에서 실행한다. 아래 스크립트는 함수 호출 한 번을 자동 커밋하고 새 문장에서 거래 NULL/기본 없는 가구 두 수치를 조회한다. 한 호출의 커밋을 확인한 뒤 다음 호출을 시작한다. 전체 반복을 한 트랜잭션이나 `DO` 루프로 묶거나 이 스크립트에 `--single-transaction`을 붙이지 않는다.

```sh
PGOPTIONS='-c lock_timeout=5s -c statement_timeout=30s' psql -X -v ON_ERROR_STOP=1 -f scripts/ledger-books/backfill-batch.sql
```

반환 건수·시작/종료 시각·커밋 성공·오류를 기록한다. 타임아웃/교착은 롤백 후 위 재시도 한도를 적용하고, 필요하면 배치를 100건으로 줄인다. 이미 커밋된 행을 다시 덮어쓰지 않는 NULL 대상 처리이므로 응답 유실 후 재호출도 안전하다. 거래 ID를 복제하거나 잔액 효과를 다시 적용하지 않는다. 재호출 안전성은 운영 전 리허설에서 확인한다.

반환 0은 잠긴 후보를 `SKIP LOCKED`로 건너뛴 결과일 수 있어 완료 증거가 아니다([PostgreSQL 잠금 절](https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE)). 모든 배치 작업을 종료·커밋하고 차단 쓰기 트랜잭션 상태를 확인한 뒤, 전체 행을 볼 수 있는 운영 역할로 **새 트랜잭션에서** 다음 검사를 별도로 실행한다. 남은 행이 있으면 원인 확인 후 재개한다.

```sql
SELECT count(*) AS remaining
FROM public.ledger_entries
WHERE book_id IS NULL;

SELECT count(*) AS households_with_invalid_default
FROM public.households h
WHERE (SELECT count(*) FROM public.ledger_books b
       WHERE b.household_id = h.id AND b.is_default
         AND b.visibility = 'shared' AND b.archived_at IS NULL) <> 1;
```

**두 결과가 모두 0**이어야 한다. 거래 없는 가구의 시드도 여러 배치가 필요하고 함수 반환 0만으로 끝낼 수 없다. 결과를 기록하고 validate 직전과 enforce 직후에도 재확인한다. 신규 쓰기가 NULL을 만들지 못하는 DB 호환/제약이 활성 상태인지 함께 확인한다.

## 대조·출시·안전한 중지

- 종료 자료도 같은 방식의 일관된 스냅샷으로 추출한다. 시작 자료에 두 경계 사이의 **정상 커밋된 업무 변경만** 커밋 순서대로 적용해 기대 자료를 만든다. INSERT는 새 ID를 한 번 추가, UPDATE는 해당 ID의 전후 값과 태그·잔액 변경을 적용, DELETE는 증거 있는 ID와 연결만 제거한다. 생성 후 삭제, 한 ID의 여러 수정도 순서대로 계상한다. 금융 잔액의 다른 정상 변경도 빠뜨리지 않는다. 이전 이벤트와 업무 이벤트가 한 트랜잭션에 섞이면 필드별로 구분한다.
- 기대 자료와 실제 종료 자료의 거래 ID 집합·중복·전체 원래 필드·태그 연결·금융 endpoint·계좌/결제수단 잔액 및 시각을 대조한다. **이전 자체의 허용 변경은 `book_id`와 장부 시드뿐**이다. 정상 사용자 수정의 `updated_at`/금액/태그/잔액 변화와 증거 있는 삭제는 허용하지만, backfill로 원래 `type`·`amount`·`is_shared`·참조·태그·잔액·세 시각이 바뀌면 실패다. 건수·금액 합계만 같은 것은 통과가 아니다. 설명되지 않는 누락·복제·변경 0건을 증빙한다.
- 두 가구에 각각 사용자 A/B를 두고, 공용 및 각자 개인 거래의 이전 전 가시 ID 집합을 저장한다. 부분 backfill과 완료 뒤 각 계정의 실제 인증으로 API 및 RLS 직접 조회 집합을 대조한다(서비스 역할 결과로 대신하지 않는다). 정상 쓰기분을 반영한 집합이 같고 각 ID는 한 번만 나와야 한다. 상대 개인 장부 이름·거래·태그·검색 결과·요청/알림 스냅샷과 다른 가구 ID 주입의 존재 정보는 노출되지 않아야 한다. 실제 운영 사용자도 같은 방식으로 확인한다.
- 다른 가구 연결/개인 작성자 불일치, 기본 0개/2개, 기본·거래 있는 장부 삭제, 보관 중 거래/태그 변경을 거부하고, 입력·보관·기본 교체 경쟁이 직렬화되는지 운영 전 DB 리허설에서 확인한다. 새/구버전의 공용·개인 생성, 수정/삭제, 검색·홈·MCP를 두 계정 **실제 iPhone 설치형 PWA**에서 확인하고 Safari 직접 링크·새로고침·뒤로 가기를 확인한다. 기종·iOS·앱/API 버전·계정·통과/실패 증빙을 남긴다. VoiceOver는 #438에 따라 선택 검증이며 기본 접근성은 필수다. 자동 테스트를 실기기 통과로 기록하지 않는다.
- 이상 행/개인 정보 노출/대조 불일치/잠금 한도 초과면 배치와 다음 배포를 중지한다. 실패 중인 트랜잭션만 롤백하고 이미 커밋된 장부·거래·`book_id`·태그·동시 쓰기는 보존한다. 레거시 앱/검색·`is_shared` 호환을 유지하고 원인을 해결한 뒤 미완료 단계/NULL 배치부터 재개한다. API 장애는 호환 스키마를 보존한 채 앱/API를 되돌리거나 수정 배포한다. **전체 DB 스냅샷 복원·거래 삭제·공개 확대·장부 테이블 삭제를 자동 복구로 쓰지 않는다.**
- 운영 사전 점검/대조와 실기기 게이트가 미수행이거나 실패하면 #440 출시 완료로 표시하지 않는다. `is_shared` 및 임시 생성/검색 계약 제거는 #446에서 구버전 요청 0을 별도로 확인한 뒤 수행한다. 이후 구버전 앱 복귀가 필요하면 장부/`book_id`를 보존하고 공개 범위에서 `is_shared`와 호환 쓰기·조회 계약을 먼저 복구해야 한다.
