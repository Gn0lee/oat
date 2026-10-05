# 목적별 장부 MVP 운영 적용 런북 (#446)

운영 DB 적용부터 앱 배포, 출시 판정까지 한 문서로 묶는다. 단계별 근거와 상세 설명은 각 문서에 있다.

- [#440 이전](ledger-books-migration.md)
- [#441 관리](ledger-books-management.md)
- [#442 기록 쓰기](ledger-book-entry-writes.md)
- [#444 변경 요청](ledger-reclassify-requests.md)
- [#445 검색](ledger-scoped-search.md)
- [#446 분석](ledger-books-analysis.md)

**실행은 운영 담당자(사용자)가 한다.** Claude는 운영 DB에 접속하거나 명령을 실행하지 않는다. 운영 담당자가 단계마다 명시적으로 승인한 것만 돕는다. 표의 "기록"은 이 문서 밖, 접근이 제한된 출시 기록에 남긴다. 개인 데이터, 연결 정보, 체크포인트 파일은 Git, 이슈, 일반 로그에 넣지 않는다.

## 시작 전에 정할 것

1. **배포할 앱 버전.** 현재 운영 앱은 2026-09-18 배포한 `4f7ca4b`다. `Gn0lee/issue-428-iphone-input` 브랜치 빌드이고 main에는 없다. main은 #428을 #439로 되돌렸다. 따라서 이번 main 배포에서는 #428의 iPhone 입력 드로어 수정이 빠진다. 배포할 커밋을 정해 기록한다. 기본값은 #446 PR A까지 병합된 main이다.
2. **구버전 수정 공백.** 운영 앱(`4f7ca4b`)은 `ledger_entries`를 직접 INSERT·UPDATE·DELETE한다. #442 마이그레이션은 authenticated의 직접 UPDATE 권한을 회수한다. 리허설에서 #442 적용 직후 구버전의 기록 **수정**이 `permission denied`로 실패했다. 입력·삭제·조회·검색은 계속 됐다. 그래서 4~6단계는 쉬지 않고 이어서 하고, 그동안 가족에게 기록 수정을 잠시 멈추도록 알린다. 1~3단계(#440·#441)는 구버전 입력·수정·삭제·검색을 모두 유지한다.
3. **감사 증빙.** #440 기준 추출 **전에** 모든 쓰기 경로를 덮는 감사 창이나 WAL 증빙이 있어야 한다([#440 체크포인트](ledger-books-migration.md#실행-전-체크포인트)). 없으면 시작하지 않는다.
4. **연결.** PG 연결 환경변수(`PGHOST`, `PGUSER`, `PGDATABASE`, `PGPASSWORD` 또는 `.pgpass`)를 안전하게 주입한다. `supabase link`의 대상과 같은 운영 DB인지 확인한다. 명령 인수나 출력에 연결 정보를 남기지 않는다. 아래 명령은 모두 저장소 루트에서 실행한다.
5. **보안 저장소.** 체크포인트 파일과 기록을 둘 경로 `$SECURE`(암호화, 운영 담당자만 읽기)를 정한다.

## 공통 규칙

- DDL 마이그레이션 실행 형식은 아래와 같다. 성공 커밋을 확인한 뒤에만 이력을 맞춘다.

  ```sh
  PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s' psql -X -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/<파일>
  supabase migration repair --linked --status applied <파일명 앞 버전>
  ```

  `supabase db push`나 전체 자동 적용은 쓰지 않는다. 첫 명령이 실패하면 repair와 다음 단계를 실행하지 않는다. 커밋됐는데 응답이 유실됐으면 DB 객체를 확인한 뒤 **이력만** 맞춘다. 같은 SQL을 다시 실행하지 않는다.
- 잠금·시간 제한을 넘으면 해당 트랜잭션만 롤백된다. 차단 세션을 확인하고 5/10/20초 간격으로 최대 3번 재시도한다. 그래도 안 되면 중단한다.
- 단계가 실패하면 그 자리에서 멈춘다. 이미 커밋된 장부·`book_id`·거래·태그는 보존한다. **DB 스냅샷 전체 복원, 거래 삭제, 공개 범위 확대, 장부 테이블 삭제는 복구 수단이 아니다.** 앱은 구버전 그대로 두면 동작한다(4단계 이후는 2번 항목의 수정 공백 주의).

## 단계

| # | 할 일 | 통과 조건 | 기록 |
| --- | --- | --- | --- |
| 1-0 | `psql -X -q -v ON_ERROR_STOP=1 -f scripts/ledger-books/preflight.sql` | 예외 없음. 가구 수, 거래 수(공용/개인), 미처리 요청 수 출력 | 출력 수치, 시각 |
| 1-1 | `psql -X -q -A -t -v ON_ERROR_STOP=1 -f scripts/ledger-books/checkpoint.sql > "$SECURE/checkpoint.before.jsonl"` | 파일 생성. `-q`를 빼면 BEGIN/COMMIT이 섞인다 | 줄 수, sha256, 스냅샷 시각 |
| 1-2 | expand `20261002063236_expand_ledger_books.sql` + repair | 가구마다 활성 공용 기본 `생활비` 생성 경로 설치. 구버전 입력이 장부를 자동 배정 | 성공 시각 |
| 1-3 | `psql -X -v ON_ERROR_STOP=1 -f scripts/ledger-books/index-online.sql` (`--single-transaction` 금지) | 예외 없음(인덱스 valid·ready) | — |
| 1-4 | install-backfill `20261002063302_install_ledger_books_backfill.sql` + repair | 아래 확인 쿼리 결과 `f|f|t` | 결과 |
| 1-5 | `PGOPTIONS='-c lock_timeout=5s -c statement_timeout=30s' psql -X -v ON_ERROR_STOP=1 -f scripts/ledger-books/backfill-batch.sql` 반복. 호출마다 커밋 | 두 수치 `remaining_null_entries`·`households_without_active_shared_default`가 모두 0. 반환 0만으로는 완료가 아니다 | 호출별 반환 건수, 시각 |
| 1-6 | 새 연결에서 NULL·기본 장부 확인 쿼리([#440](ledger-books-migration.md#단계별-적용)) | 둘 다 0 | 결과 |
| 1-7 | `psql -X -q -A -t -v ON_ERROR_STOP=1 -f scripts/ledger-books/checkpoint.sql > "$SECURE/checkpoint.after.jsonl"` | 파일 생성 | 줄 수, sha256 |
| 1-8 | `psql -X -v ON_ERROR_STOP=1 -f scripts/ledger-books/reconcile.sql` | `assert_reconciled` 통과 | 공개 범위별 거래 수 |
| 1-9 | `python3 scripts/ledger-books/compare-checkpoints.py "$SECURE/checkpoint.before.jsonl" "$SECURE/checkpoint.after.jsonl" "$SECURE/expected-changes.txt"` | `OK`. 감사 증빙에 있는 정상 쓰기만 `expected-changes.txt`(`relation id` 줄)에 넣는다 | 출력 전체 |
| 1-10 | validate `20261002063304_validate_ledger_books.sql` + repair | 성공. 불일치는 보정하지 않고 중단 | — |
| 1-11 | enforce `20261002063305_enforce_ledger_books_not_null.sql` + repair, 이어서 1-6 쿼리 재실행 | 성공, 두 수치 0 | 결과 |
| 1-12 | atomic `20261002111422_atomic_ledger_writes.sql` + repair | 성공 | — |
| 2 | #441 `20261004034539_ledger_book_management.sql` + repair | `to_regprocedure('public.mutate_ledger_book(uuid,text,text)') is not null` | — |
| 3 | 두 계정으로 구버전 앱 입력·조회·검색을 짧게 확인 | 정상. 4단계로 넘어가기 전 가족에게 수정 중지를 알린다 | 시각 |
| 4-1 | #442 enum `20261004083722_ledger_entry_request_expiry.sql` + repair (단독 커밋) | 성공 | — |
| 4-2 | #442 writer `20261004083724_ledger_book_entry_writes.sql` + repair | 아래 확인 쿼리 `f|t` | 결과 |
| 5-0 | #444 사전 점검([#444 0단계](ledger-reclassify-requests.md#0-사전-점검)) | 전부 `t`. 요청 상태 분포 기록 | 분포 |
| 5-1 | #444 enum `20261005090000_record_change_request_reclassify_type.sql` + repair (단독 커밋) | 성공 | — |
| 5-2 | #444 RPC `20261005090100_ledger_reclassify_requests.sql` + repair | [#444 3단계](ledger-reclassify-requests.md#3-적용-후-점검) 전부 `t`. 분포가 5-0과 같음 | 결과 |
| 6-0 | #445 사전 점검([#445 1번](ledger-scoped-search.md#운영-적용)) | `t|t|t` | — |
| 6-1 | #445 `20261005120000_ledger_scoped_search.sql` + repair | 적용 후 점검 `f|t|f` | 결과 |
| 6-2 | `supabase migration list --linked`로 남은 마이그레이션 확인 | 로컬과 원격 이력이 같고 남은 파일 없음. #446 PR A는 마이그레이션이 없다 | — |
| 7 | GitHub Actions `Deploy to Vercel`을 `production`으로 수동 실행(정한 커밋) | 배포 URL 확인 | 커밋, 배포 URL, 시각 |
| 8 | 배포 후 확인(아래) | 전부 통과 | 결과 |

1-4 확인 쿼리:

```sql
select has_function_privilege('anon','public.backfill_ledger_books(integer)','execute'),
       has_function_privilege('authenticated','public.backfill_ledger_books(integer)','execute'),
       has_function_privilege('service_role','public.backfill_ledger_books(integer)','execute');
```

4-2 확인 쿼리:

```sql
select has_table_privilege('authenticated','public.ledger_entries','UPDATE'),
       to_regprocedure('public.write_ledger_entry(text,uuid,jsonb,uuid)') is not null;
```

## 8. 배포 후 확인

새 앱이 뜨면 두 계정으로 확인한다. 자동 검증과 모바일 브라우저 검증은 배포 전 PR에서 끝냈다. 여기서는 운영 데이터와 실제 계정을 확인한다.

- 기존 거래가 전과 같은 사람에게만 보인다. 공용은 두 사람 모두, 개인은 작성자만 본다. 전체 장부 달력, 허브 요약, 분석 summary의 이번 달 지출·수입이 서로 같다.
- 계좌·결제수단 잔액이 1-1 체크포인트와 같다. 다르면 감사 증빙의 정상 거래로 설명돼야 한다.
- 새 입력(한 건·여러 건), 수정, 장부 이동(공용↔개인 확인), 장부 생성·보관·재활성화, 다른 사람 공용 기록의 이동 요청과 승인, 검색, 분석 장부 칩이 동작한다.
- 다른 사람 개인 장부의 ID로 `/ledger/records?book=…`과 `/ledger/analysis?book=…`을 직접 열면 "장부를 볼 수 없음"이 나온다.
- Vercel 런타임 로그에서 오류와 `legacy-ledger-contract`를 확인한다([관측](ledger-books-analysis.md#구버전-요청-관측)).

실패하면 다음 순서를 따른다.

- 개인 정보 노출, 거래 누락·중복, 잔액 차이, 입력·권한 오류는 **출시 보류**다. 이전 배포로 되돌리거나 수정 배포한다.
- DB는 되돌리지 않는다. 새 스키마는 구버전 앱과 함께 동작한다. 단, 구버전은 기록 수정이 안 된다(시작 전 2번).

## 출시 판정 체크리스트 (#438)

- [ ] #440~#445 및 #446 PR A 병합, 배포 커밋 기록
- [ ] 1~6단계 통과 기록(사전 점검, 체크포인트 대조 OK, NULL 0, 각 적용 후 점검)
- [ ] 배포 후 확인 통과: 개인 정보 비노출, 거래 누락·중복 0, 잔액 불변, 전체/장부별 달력·검색·분석 일치
- [ ] 입력·권한 오류 없음(두 모바일 2단계 입력 포함)
- [ ] 접근성 기본 기준: 44px 터치 영역, 버튼 이름·상태, 키보드·포커스 복귀(자동·모바일 브라우저 검증 기록)
- [ ] 실제 iPhone 설치형 PWA·Safari: 배포 후 실사용 중 진행하고 결과를 기록한다. 출시 blocker가 아니다(2026-10-04 결정). VoiceOver는 선택이다.
- [ ] 구버전 요청 관측 시작일 기록. 관측 기간 0건이 확인돼야 #446 PR C(`is_shared`·레거시 제거)를 진행한다.

기능에 영향 없는 시각적 미세 조정만 후속으로 미룰 수 있다.

## 리허설 기록 (2026-10-05)

로컬 Supabase의 공유 `postgres` DB는 #440 이전 상태다(마지막 이력 `20260920000000`, 1가구 9건: 공용 7, 개인 2). 이 DB는 수정하지 않았다. 대신 `pg_dump`로 격리 DB `oat_ledger_books_446_rehearsal`에 복사했다. 거래 없는 가구 하나를 추가한 뒤 위 1~6단계 명령을 그대로 실행했다. 실행은 `docker exec`로 이 DB에만 했다. 단계 사이마다 구버전 앱처럼 authenticated 사용자로 직접 쓰기를 넣었다.

- preflight 통과. 백필 첫 호출 9건, 이후 0건. NULL 0, 기본 장부 없는 가구 0(빈 가구 포함).
- reconcile 통과. 체크포인트 비교 결과 기준 22행의 누락·변경 0. 추가 12행은 모두 구버전 쓰기였고, 기대 목록에 넣자 `OK`.
- backfill 함수 실행 권한 `f|f|t`, 4-2 `f|t`, 5-0 전부 `t`, 5-2 전부 `t`, 6-0 `t|t|t`, 6-1 `f|t|f`. 저장소의 마이그레이션이 모두 적용됐다.
- 구버전 쓰기
  - expand부터 #441까지: 공용·개인 입력, 수정, 삭제, 레거시 검색 모두 정상. 새 행은 장부가 자동 배정됐고, `is_shared`와 장부 공개 범위 불일치는 0이었다. 다른 구성원은 개인 행을 볼 수 없었다.
  - #442 이후: 입력·삭제·레거시 검색은 정상, **수정은 `permission denied`**.
- preflight는 적용 뒤 다시 실행해도 통과했다.

운영에서는 감사 증빙 대조, 실제 계정 확인, 시간 측정을 다시 해야 한다. 리허설 데이터는 작아서 잠금 시간의 근거가 되지 못한다.
