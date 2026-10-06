# 최근 사용 장부 순서와 허브 4개 제한 (#460)

**최근 사용 장부**는 활성 장부를 줄 세우는 기준이다. 장부마다 내가 볼 수 있는 거래 중 가장 최근에 *입력된*(`created_at`) 거래를 보고, 그 시각이 늦은 장부가 앞에 온다. 거래일(`transacted_at`)은 보지 않는다. 가구원이 공용 장부에 입력한 거래도 반영되고, 다른 가구원의 개인 장부는 보이지 않으므로 순서에도 영향을 주지 않는다.

## 순서와 선별

`lib/ledger-books/recent-books.ts`가 정렬과 선별을 모두 맡는다. 허브, 장부 관리 목록, 장부 칩, 기록 입력 피커는 이 모듈만 쓴다.

- `orderRecentBooks`: 기본 장부 → 최근 입력 시각 내림차순 → 기록 없는 장부는 생성순 → 보관 장부. 입력 시각이 같으면 먼저 만든 장부가 앞에 온다. 장부 관리 목록과 피커가 이 순서를 쓴다.
- `selectHubBooks`: 기본 장부 + 최근 사용 3개로 최대 4개. 활성 장부가 5개 이상이면 `hasMore`가 켜지고, 허브는 "장부 전체 n개"(n = 활성 장부 수) 행으로 `/ledger/books`에 연결한다.
- `selectChipBooks`: 보관 포함 6개 이하이면 전부, 넘으면 기본 장부 + 최근 사용 활성 장부 5개와 "장부 선택"(`hasPicker`). 칩 밖 장부가 선택되면(바텀시트 선택, `?book=` 직접 링크) 맨 앞에 임시로 넣는다. 화면 적용은 #461에서 한다.

지금 장부 칩은 `orderRecentBooks` 순서로 모든 장부를 보여준다. 6개 제한과 "장부 선택"은 #461에서 붙는다.

## API

`GET /api/ledger-books` → `{ data: LedgerBookListItem[] }`

- 각 장부에 `lastEntryAt`(nullable)이 붙는다. 거래가 없으면 `null`이다.
- 응답 순서는 지금처럼 생성순이다. 정렬은 클라이언트의 위 모듈이 한다.
- 장부 상세와 변경 응답(`LedgerBook`)에는 `lastEntryAt`이 없다. 분석의 장부 조회(`getLedgerBooks`)도 집계를 부르지 않는다.

## DB

- 인덱스 `ledger_entries_book_id_created_at_idx (book_id, created_at desc)`. 거래의 `book_id` 조회와 장부별 최댓값 집계를 함께 받는다.
- 함수 `public.ledger_book_last_entries(hh_id uuid) returns table (book_id, last_entry_at)`. SECURITY INVOKER라서 `ledger_entries` RLS 안에서만 집계한다. 보안 경계는 기존 장부·기록 조회와 같다. `authenticated`만 실행할 수 있다.

## 운영 적용

#446 제거 마이그레이션(`20261006000100_drop_mcp_tables.sql`)까지 적용되어 있어야 한다. 이 마이그레이션은 인덱스와 읽기 전용 함수만 추가하고 데이터를 바꾸지 않는다. #457 묶음으로 한 번에 배포한다.

1. 사전 점검: 함수가 아직 없어야 한다.

   ```sql
   select to_regprocedure('public.ledger_book_last_entries(uuid)') is null as absent;
   ```

2. `supabase/migrations/20261006120000_ledger_book_last_entries.sql`을 적용한다. `create index`는 `ledger_entries`에 쓰기 잠금을 잡지만 가계부 규모에서는 순간적이다.
3. 적용 후 점검: 순서대로 `false`(SECURITY INVOKER), `true`(authenticated 실행 가능), `false`(anon 실행 불가), `true`(인덱스 있음)여야 한다.

   ```sql
   select p.prosecdef,
          has_function_privilege('authenticated', p.oid, 'execute'),
          has_function_privilege('anon', p.oid, 'execute'),
          to_regclass('public.ledger_entries_book_id_created_at_idx') is not null
   from pg_proc p
   where p.oid = 'public.ledger_book_last_entries(uuid)'::regprocedure;
   ```

4. 앱을 배포한다. 함수가 없으면 장부 목록 API가 `500 BOOK_QUERY_FAILED`로 실패하므로 마이그레이션을 먼저 적용한다.

되돌리기: 앱만 이전 버전으로 되돌린다. 이전 앱은 함수를 부르지 않는다. 지워야 한다면 `drop function public.ledger_book_last_entries(uuid); drop index public.ledger_entries_book_id_created_at_idx;`를 실행하며 기록 데이터에는 영향이 없다.

## 재현 가능한 검증

운영 DB와 공유 `postgres` DB에는 fixture를 넣지 않는다. `oat_ledger_books_445_test`를 템플릿으로 `oat_ledger_books_460_test`를 만들고 #446 제거 마이그레이션 두 개와 이번 마이그레이션을 적용한 뒤 실행한다.

```sh
docker exec supabase_db_oat psql -X -U supabase_admin -d postgres -c "create database oat_ledger_books_460_test template oat_ledger_books_445_test"
for f in 20261006000000_remove_ledger_legacy_visibility 20261006000100_drop_mcp_tables 20261006120000_ledger_book_last_entries; do
  docker exec -i supabase_db_oat psql -X -U supabase_admin -d oat_ledger_books_460_test -v ON_ERROR_STOP=1 -1 < supabase/migrations/$f.sql
done
docker exec -i supabase_db_oat psql -X -U supabase_admin -d oat_ledger_books_460_test -v ON_ERROR_STOP=1 < supabase/tests/ledger-book-last-entries.sql
```

`ledger-book-last-entries.sql`은 두 가구, 세 사용자로 다음을 확인한 뒤 롤백한다.

- 장부별 값은 거래일이 아니라 가장 최근 입력 시각이다.
- 가구원이 공용 장부에 입력한 거래가 반영된다.
- 다른 가구원의 개인 장부, 거래 없는 장부, 다른 가구의 장부는 결과에 없다.
- 함수는 SECURITY INVOKER이고 anon은 실행할 수 없으며, `book_id`로 시작하는 인덱스가 있다.

같은 DB에서 기존 회귀(atomic, management, entry-writes, reclassify, scoped-search, legacy-removal)도 통과했다.

실제 iPhone 설치형 PWA 확인(허브 진입, "장부 전체 n개" 이동, 뒤로 가기)은 배포 후에 진행한다.
