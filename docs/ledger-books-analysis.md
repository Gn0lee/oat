# 분석·허브 요약의 장부 범위 (#446)

분석(`/ledger/analysis/**`)과 장부 허브 요약은 달력·검색과 같은 거래 집합을 쓴다. 계약은 #437 해결 댓글이다.

## 조회 범위

- `book`이 없으면 전체 장부다. 보이는 공용 장부와 본인 개인 장부가 들어가고 보관 장부도 포함한다. 경계는 `ledger_entries` RLS가 정한다.
- `book=<ID>`는 그 장부만 쓴다. 없는 장부, 다른 가구 장부, 다른 사람 개인 장부는 모두 같은 `404 BOOK_UNAVAILABLE`이다. 화면은 "장부를 볼 수 없음"과 "전체 장부로 이동"을 보여준다.
- 수입·지출 합계에서 내부이체와 비지출 출금은 뺀다. 거래 ID는 한 번씩만 센다.
- 공용/개인 구분은 `is_shared`가 아니라 장부 공개 범위에서 가져온다(`lib/api/ledger-stats.ts`의 `resolveScope`).

## 통계 API

`GET /api/ledger/stats/{summary,by-member,by-category,by-payment-method,trend,daily,details}`

- 공통 파라미터: `book`(선택). 기간은 `year`·`month`(KST)이고 trend는 `months`, details는 `date`도 받는다. 형식이 틀리면 `400 VALIDATION_ERROR`다.
- 응답마다 조회 범위 `bookId: null | ID`가 들어간다.
- `summary`는 `total`과 함께 공용·내 개인 하위 합계 `shared`·`personal`을 준다. 허브(`/api/ledger-entries/summary`)는 이 `total`을 그대로 쓴다.
- `by-member`
  - 전체: 구성원마다 공용 지출이 나오고, 개인 지출은 내 행에만 있다. 다른 사람 개인 지출은 `null`이고 화면에는 "비공개"로 나온다. 0원으로 표시하지 않는다.
  - 공용 장부: 작성자별 공용 지출만 나온다.
  - 개인 장부: 생성자 한 행만 나온다.
- `trend`·`daily`는 KST 경계로 나눈다(예: 10/1 00:30 KST 거래는 10월 1일).
- `details`의 `viewAllHref`는 `/ledger/records?book&date&type&categoryId|paymentMethodId…`다. 달력은 `type`·`paymentMethodId`·카테고리 조건을 읽어 같은 원본 거래를 보여주고, 상단에 조건과 "조건 해제"를 둔다.

## 화면

- 공용/개인 탭은 없어졌다. 모든 분석 화면 위에 달력과 같은 장부 칩이 있다.
- `book`, `year`, `month`, 카테고리 화면의 `type`은 URL에 있다. 새로고침, 뒤로 가기, 하위 화면 이동에서 그대로 남는다. 하위 화면의 뒤로 가기는 `book`·`year`·`month`를 유지한 채 분석 허브로 간다.
- 장부를 바꾸면 기간과 유형은 유지되고, 화면 안의 선택 상태(카테고리 선택 등)는 초기화된다.
- 쿼리 키에는 사용자·가구·`book`·조건이 들어간다.

## 구버전 요청 관측

목적별 장부 이전 클라이언트가 보내는 형태는 지금도 처리한다. 다만 서버 로그에 JSON 한 줄을 남긴다.

```json
{"event":"legacy-ledger-contract","contract":"<종류>","route":"<경로>"}
```

| contract | 구버전 요청 |
| --- | --- |
| `stats-scope` | 통계 API의 `scope=shared\|personal` |
| `summary-scope` | `/api/ledger-entries/summary`의 `scope=shared\|personal` |
| `entries-scope` | `/api/ledger-entries`의 `scope=shared\|personal` |
| `entries-tag-filter` | `/api/ledger-entries`의 `tagId` |
| `search-scope-offset` | `/api/ledger-entries/search`의 `scope`+`offset` |
| `entry-create-is-shared` | `bookId` 없이 `isShared`로 만드는 단건·다건 생성 |
| `tags-scope` | `/api/ledger-tags`의 `scope` |

운영 배포 뒤 Vercel 런타임 로그에서 `legacy-ledger-contract`를 검색한다. 정한 관측 기간 동안 0건이어야 `is_shared`·레거시 호환 제거(#446 PR C)를 진행한다. `scope=all`은 기록하지 않는다. 현재 허브가 보내는 값이기 때문이다.

## MCP

MCP 서버·토큰 화면·`packages/mcp-bridge`는 사용하지 않아 삭제했다(2026-10-05 사용자 결정). DB의 `mcp_tokens`·`mcp_audit_logs`는 남아 있다.

## 재현 가능한 검증

운영 DB나 공유 `postgres` DB에는 fixture를 넣지 않는다. 이번 변경에는 마이그레이션이 없다.

1. `oat_ledger_books_445_test`를 템플릿으로 `oat_ledger_books_446_test`를 만든다.
2. 이 DB를 가리키는 PostgREST·GoTrue와 `/rest/v1`·`/auth/v1` 프록시를 띄운다. 그 프록시를 가리키는 `next dev`를 실행한다.
3. GoTrue admin API로 `a1/a2/b1/b2@oat.test`를 만든다.
4. 아래를 실행한다.

```sh
docker exec -i supabase_db_oat psql -X -U supabase_admin -d oat_ledger_books_446_test < supabase/tests/ledger-analysis-fixture.sql
node supabase/tests/ledger-analysis-consistency.mjs <A 가구 생활비 ID> <B 가구 생활비 ID>
```

검사 범위는 두 가구, 네 사용자, 공용·각자 개인·보관·빈 장부다. 사용자와 범위마다 다음 값이 달력의 거래 ID·금액과 같은지 대조한다.

- 허브 요약
- 분석 summary(공용+개인 = 전체 포함)
- 카테고리(지출·수입)·결제수단·일별·추이 합계
- 카테고리·일별·결제수단 원본 상세의 거래 ID
- 결제수단 전체보기 링크로 연 달력 목록
- 구성원별 행

숨은 장부 ID는 8개 경로 모두 `404 BOOK_UNAVAILABLE`이어야 한다.

2026-10-05 결과는 321개 항목 통과, 실패 0이다. 390×844 모바일 브라우저에서도 다음을 확인했다. 콘솔 오류는 없었다.

- 분석 허브의 전체 합계와 하위 합계
- 장부 칩 전환 후 기간 유지와 뒤로 가기 링크
- 칩 높이 44px, 가로 넘침 없음
- 숨은 장부 직접 링크
- 구성원별 "비공개"
- 결제수단 상세 → 전체 기록 보기 → 달력 조건 표시

실제 iPhone 설치형 PWA·Safari 검증은 #438 결정에 따라 배포 후 진행한다.
