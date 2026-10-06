# `is_shared`·구버전 호환 제거와 복원 (#446 PR C)

#435는 목적별 장부 이전 동안만 구버전 계약을 남기고, 배포의 마지막 단계에서 지우기로 정했다. 이 문서는 그 제거 절차와 되돌리는 방법이다. **MVP 배포 후 확인이 끝나기 전에는 이 PR을 병합하지 않고 마이그레이션도 적용하지 않는다.**

## 제거 대상

| 위치 | 제거 |
| --- | --- |
| DB | `ledger_entries.is_shared`와 동기화(가드 트리거), 장부 없는 생성(쓰기 RPC·가드·배치), `book_id is null` 읽기 분기(RLS·가시성 함수·쓰기 RPC), `개인 생활비` 이름 변경·삭제 보호, 레거시 검색 RPC `search_ledger_entries`, 끝난 백필 함수와 레거시 장부 해석 함수 |
| API | 검색 `scope+offset`, 목록·요약·통계·태그의 `scope`, 목록의 `tagId`, `bookId` 없는 생성(`isShared`) |
| 앱 | `is_shared` 컬럼 읽기. 기록의 공용/개인은 장부 공개 범위에서 가져온다. 구버전 요청 로그(`legacy-ledger-contract`), 쓰지 않는 컴포넌트 |
| MCP | 앱에서 지운 MCP의 남은 테이블 `mcp_tokens`·`mcp_audit_logs`(별도 마이그레이션, 되돌릴 수 없음) |

장부와 `book_id`, 거래, 태그, 잔액은 건드리지 않는다. 홈의 공용 카드는 장부 공개 범위로 계속 집계한다.

## 진행 조건

1. 목적별 장부 MVP가 운영에 배포돼 있다([런북](ledger-books-release-runbook.md)).
2. 런북의 배포 후 확인이 통과했다. 별도 관측 기간은 두지 않는다(2026-10-05 사용자 결정). 진행 직전에 Vercel 런타임 로그에서 MVP 배포 이후 `legacy-ledger-contract`가 **0건**인지 확인하고 검색 조건과 결과를 기록한다([관측](ledger-books-analysis.md#구버전-요청-관측)). 0건이 아니면 원인을 확인할 때까지 이 단계만 보류한다.
3. 운영 DB 점검에서 아래 결과가 `0|0`이다.

   ```sql
   select (select count(*) from public.ledger_entries where book_id is null),
          (select count(*) from public.ledger_entries e join public.ledger_books b on b.id = e.book_id
            where e.is_shared is distinct from (b.visibility = 'shared'));
   ```

## 순서

1. 이 PR을 병합하고 **앱을 먼저 배포한다.** 새 앱은 `is_shared`를 읽지도 쓰지도 않으므로 컬럼이 남아 있어도 동작한다.
2. 배포 후 두 계정으로 입력, 이동, 달력, 검색, 분석, 홈을 확인한다.
3. 제거 마이그레이션을 적용한다. 마이그레이션 안의 사전 점검이 실패하면 아무것도 바뀌지 않는다.

   ```sh
   PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s' psql -X -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/20261006000000_remove_ledger_legacy_visibility.sql
   supabase migration repair --linked --status applied 20261006000000
   ```

4. MCP 테이블을 지운다. 사용하지 않는 기능의 잔여물이고 되돌리지 않는다.

   ```sh
   PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s' psql -X -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/20261006000100_drop_mcp_tables.sql
   supabase migration repair --linked --status applied 20261006000100
   ```

5. 적용 후 점검: 아래 결과가 `0|0|0`이어야 한다. 이어서 두 계정으로 2번을 다시 확인한다.

   ```sql
   select (select count(*) from information_schema.columns where table_name = 'ledger_entries' and column_name = 'is_shared'),
          (select count(*) from pg_proc where proname in ('search_ledger_entries','backfill_ledger_books','resolve_legacy_book','resolve_historical_book')),
          (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public','ledger_books_private') and p.prosrc ilike '%is_shared%');
   ```

## 되돌리기

구버전 앱으로 돌아가야 할 때만 쓴다. 장부와 `book_id`는 그대로 두고 호환 계약만 되살린다. **옛 DB 스냅샷 복원이나 장부 삭제는 되돌리기 수단이 아니다.**

1. 복원 SQL을 사람이 직접 적용한다. 이 파일은 `supabase/rollback/`에 있어 자동 적용되지 않는다.

   ```sh
   PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s' psql -X -v ON_ERROR_STOP=1 --single-transaction -f supabase/rollback/20261006000000_restore_ledger_legacy_visibility.sql
   supabase migration repair --linked --status reverted 20261006000000
   ```

   - `is_shared`는 각 거래의 **현재** 장부 공개 범위로 다시 채운다. 그사이의 재분류도 반영된다.
   - 채우는 동안 가드 트리거와 재분류 요청 만료 트리거를 잠시 끈다. 끄지 않으면 보관 장부의 거래가 거부되고, 대기 요청이 잘못 만료된다.
   - 함수 본문은 `20261005120000` 시점의 배포 정의 그대로다.
2. 앱을 이전 버전으로 되돌린다.
3. 다시 지울 때는 제거 마이그레이션을 다시 적용하면 된다.

MCP 테이블 삭제는 되돌리지 않는다. 구버전 앱의 MCP 화면이 필요해지면 `20260508001000_create_mcp_tables.sql`로 빈 테이블만 다시 만들 수 있고, 기존 토큰은 재발급해야 한다.

## 검증 (격리 scratch DB, 2026-10-05)

`oat_ledger_books_445_test`를 `pg_dump`로 `oat_ledger_books_446c_test`에 복사해 검증했다. 운영 DB와 공유 `postgres` DB는 건드리지 않았다.

| 단계 | 결과 |
| --- | --- |
| 기준(제거 전) | 기존 SQL 회귀 5종 통과: atomic, management, entry-writes, reclassify, scoped-search |
| 제거 적용 | 컬럼·레거시 함수 0, 함수 본문의 `is_shared` 참조 0. 제거 후 기준으로 고친 회귀 5종과 새 `ledger-legacy-removal.sql` 통과 |
| 복원 적용 | `is_shared` NOT NULL default true, 장부 공개 범위와 불일치 0/42. 함수 정의 해시와 RLS 정책이 제거 전 DB와 같다. 레거시 검색 RPC에 Supabase 기본 권한으로 `postgres` 실행 권한이 하나 더 붙는다. **원래 버전** 회귀 5종 통과. 구버전식 직접 입력(공용·개인 장부 자동 배정)과 레거시 검색 정상 |
| 다시 제거 | 회귀 5종과 제거 계약 통과 |
| MCP 테이블 삭제 | 두 테이블 drop, 앱 타입 검사 통과 |

`ledger-legacy-removal.sql`이 확인하는 것:

- `bookId` 없는 생성과 `isShared` 입력은 `LEDGER_VALIDATION_ERROR`, 장부 없는 직접 INSERT는 `BOOK_UNAVAILABLE`로 거부된다.
- 가구 공용 금융수단은 공용 장부에서만 허용된다(예전 `is_shared` 기준을 장부 공개 범위로 옮김).
- 공용↔개인 이동이 동작한다.
- 다른 구성원은 RLS에서 개인 장부와 그 거래를 볼 수 없다.
- 예전 `개인 생활비`의 이름을 바꿀 수 있다.

`ledger-books.sql`(#440 전환 회귀)과 `ledger-books-staged.sql`(#440 이전 DB용)은 이전 단계의 기록이라 고치지 않았다. `ledger-books.sql`은 #442 이후로 이미 실패하고 있었다.

회귀 파일의 DB 이름 가드는 고정 이름 대신 `oat_ledger_books_*_test` 패턴을 받는다. 공유 `postgres` DB나 운영 DB에서는 계속 실행되지 않는다.
