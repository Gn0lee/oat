# 달력·검색의 전체·장부별 조회 (#445)

달력(`/ledger/records`)과 검색(`/ledger/search`)은 URL의 `?book=<장부 ID>`로 조회 범위를 정한다. `book`이 없으면 전체 장부 범위다. 여기에는 보이는 공용 장부와 본인 개인 장부가 들어가고 보관 장부도 포함된다. 조회 가능 범위의 경계는 `ledger_entries` RLS 몫이다. 특정 장부는 API가 `getLedgerBook`으로 먼저 확인하며 없는 장부, 다른 가구 장부, 다른 사람의 개인 장부는 모두 같은 `404 BOOK_UNAVAILABLE`로 응답하고 화면은 "장부를 볼 수 없음"과 "전체 장부로 이동"을 보여준다.

## 화면

- 달력은 주간 보기가 기본이다. 펼치면 `view=month`가 URL에 남는다. 날짜(`date`), 장부(`book`), 보기(`view`)는 새로고침, 뒤로 가기, 상세 복귀에서 복원된다.
- `date`가 없으면 현재 달에서 가장 최근 기록이 있는 날을 연다. 장부를 지정하지 않은 전체 범위도 같다. 보관 장부는 마지막 기록이 있는 날로 가고 기록이 없으면 오늘을 연다.
- 목록은 선택한 날부터 같은 달의 이전 날짜까지 날짜별로 이어진다. 그 아래에 `기록 추가`(보관 장부에서는 숨김)와 `N월 기록 보기`가 있다.
- 요약에는 그 달의 지출과 수입을 보여준다. 내부이체와 비지출 출금은 합계에서 빠진다.
- 다른 화면으로 이동할 때는 `book`만 넘긴다. 달력 → 검색은 헤더의 검색 아이콘, 달력 → 분석은 `분석 보기`, 검색 → 달력은 달력 아이콘이다. 분석이 `book`을 해석하는 것은 #446 범위다.
- 검색에서 장부를 바꿔도 `q`는 유지되고 결과는 첫 페이지부터 다시 불러온다. 결과에는 장부 이름, 개인 여부, 보관 여부가 표시된다. 장부 이름 자체는 검색 대상이 아니다.
- 태그 필터 UI는 제거했다. 태그 데이터와 API의 `tagId` 조건은 그대로 두었고 태그는 기록 상세에서 읽기 전용으로만 보인다.

## 검색 API

`GET /api/ledger-entries/search?q=<2자 이상>&book=<선택>&cursor=<선택>` → `{ data: { items, nextCursor } }`

- 정렬은 거래일 DESC, 생성 시각 DESC, ID DESC 순이다. 페이지는 `search_ledger_entries_scoped` RPC가 이 순서의 keyset으로 나누므로, 같은 시각 기록이 많아도 중복이나 누락이 생기지 않는다.
- `cursor`에는 마지막 행의 위치와 그 검색의 `q`·`book`이 함께 들어 있다. 다른 검색어나 장부에 이 cursor를 쓰거나 형식이 틀리면 `400 LEDGER_SEARCH_CURSOR_INVALID`로 응답한다.
- `book` 형식이 틀리면 `400 VALIDATION_ERROR`, 보이지 않는 장부면 `404 BOOK_UNAVAILABLE`이다.
- 캐시된 구버전 클라이언트가 보내는 `scope=shared|personal&offset=` 요청은 기존 `search_ledger_entries` RPC로 처리한다. 이 경로와 레거시 RPC는 #446에서 제거한다.

## 운영 적용

[#444 변경 요청](ledger-reclassify-requests.md)까지의 마이그레이션이 적용되어 있어야 한다. 이번 마이그레이션은 함수 하나만 추가하며 데이터를 바꾸지 않는다.

1. 사전 점검: 선행 함수가 있고 새 함수는 아직 없어야 한다.

   ```sql
   select to_regprocedure('public.create_ledger_reclassify_request(uuid,uuid,timestamptz,text)') is not null as has_444,
          to_regprocedure('public.search_ledger_entries(uuid,text,text,integer,integer)') is not null as has_legacy_search,
          to_regprocedure('public.search_ledger_entries_scoped(uuid,text,uuid,timestamptz,timestamptz,uuid,integer)') is null as scoped_absent;
   ```

2. `supabase/migrations/20261005120000_ledger_scoped_search.sql`을 적용한다.
3. 적용 후 점검: 아래 값이 순서대로 `false`(SECURITY INVOKER), `true`(authenticated 실행 가능), `false`(anon 실행 불가)여야 한다.

   ```sql
   select p.prosecdef,
          has_function_privilege('authenticated', p.oid, 'execute'),
          has_function_privilege('anon', p.oid, 'execute')
   from pg_proc p
   where p.oid = 'public.search_ledger_entries_scoped(uuid,text,uuid,timestamptz,timestamptz,uuid,integer)'::regprocedure;
   ```

4. 앱/API를 배포한다. 목적별 장부 MVP는 #446에서 한 번에 배포한다.

되돌리기: 앱만 이전 버전으로 되돌린다. 이전 앱은 레거시 RPC를 계속 쓰고 새 함수는 읽기 전용이라 남겨 두어도 문제가 없다. 함수를 지워야 한다면 `drop function public.search_ledger_entries_scoped(uuid, text, uuid, timestamptz, timestamptz, uuid, integer);`를 실행하면 되고 기록 데이터에는 영향이 없다.

## 재현 가능한 검증

운영 DB와 공유 `postgres` DB에는 fixture를 넣지 않는다. `oat_ledger_books_444_test`를 템플릿으로 `oat_ledger_books_445_test`를 만들고 마이그레이션을 적용한 뒤 실행한다.

```sh
docker exec supabase_db_oat psql -X -U supabase_admin -d postgres -c "create database oat_ledger_books_445_test template oat_ledger_books_444_test"
docker exec -i supabase_db_oat psql -X -U supabase_admin -d oat_ledger_books_445_test -v ON_ERROR_STOP=1 -1 < supabase/migrations/20261005120000_ledger_scoped_search.sql
docker exec -i supabase_db_oat psql -X -U supabase_admin -d oat_ledger_books_445_test -v ON_ERROR_STOP=1 < supabase/tests/ledger-scoped-search.sql
```

SQL 회귀는 두 가구, 세 사용자, 공용·개인·보관·빈 장부로 18가지를 확인한 뒤 롤백한다.

- 타인 개인 장부와 다른 가구 기록이 결과에 나오지 않는다.
- 장부 이름만 일치하는 기록은 결과에 나오지 않는다.
- 장부 조건은 검색 조건과 AND로 묶인다.
- 보관 장부 기록도 검색된다.
- 같은 시각 기록이 섞여 있어도 1건 단위 cursor 페이지에 중복이나 누락이 없다.
- 2자 미만 검색어와 LIKE 와일드카드가 처리된다.
- 페이지 크기 상한이 지켜진다.

실제 iPhone 설치형 PWA와 Safari 검증은 #438 결정에 따라 배포 후에 진행한다.
