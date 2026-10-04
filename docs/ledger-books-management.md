# 목적별 장부 관리와 기본 조회 (#441)

장부 허브는 본인이 볼 수 있는 공용·개인·보관 장부의 기록을 한 번씩 합산한다. 내부이체와 비지출 출금은 수입·지출 합계에서 제외한다. 활성 장부 목록에서 장부별 기록 조회로 이동하며, 보관 장부는 관리 목록과 조회 선택기에 남는다.

장부 생성, 이름 변경, 보관·재활성화, 기본 장부 교체, 빈 장부 삭제를 제공한다. 공용 장부의 이름 변경·보관·재활성화는 구성원에게 허용하고, 기본 교체는 가구 소유자에게만 허용한다. 삭제는 작성자 또는 공용 장부의 가구 소유자에게 허용하며, 개인 장부는 작성자만 관리한다. 기본·보관·거래가 있는 장부는 삭제할 수 없다. 구버전 입력 호환 때문에 개인 `개인 생활비`의 이름 변경·삭제 제한을 유지한다.

## 배포 순서

먼저 [#440 이전 절차](ledger-books-migration.md)의 backfill·검증·NOT NULL·원자적 쓰기 마이그레이션을 완료해야 한다. 이번 마이그레이션은 기존 거래나 잔액을 수정하지 않는다.

1. `supabase/migrations/20261004034539_ledger_book_management.sql`을 적용한다. `mutate_ledger_book`은 인증된 사용자에게만 실행을 허용하고, 가구→장부 순서로 잠근 뒤 권한과 상태를 다시 확인한다. 기본 교체는 기존 `make_default_ledger_book` RPC를 사용한다.
2. 이번 앱/API 버전을 배포한다. `/api/ledger-books`와 개별 장부 관리 API가 설치된 RPC를 요구한다.
3. 실제 계정으로 목록·합계·개인 장부 차단·관리 후 조회 복귀를 확인한다. 장애 시 장부·거래·호환 스키마를 보존한 채 앱/API를 수정하거나 이전 버전으로 되돌린다.

## 재현 가능한 검증

운영 DB에 테스트 fixture를 넣지 않는다. 기존 스키마와 마이그레이션이 설치된 로컬 scratch DB에서 다음을 실행한다.

```sh
docker exec -i supabase_db_oat psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d oat_ledger_books_440_test < supabase/tests/ledger-books-management.sql
python3 supabase/tests/ledger-books-management-concurrency.py
pnpm type-check
pnpm exec vitest run lib/api/ledger.test.ts lib/api/ledger-book-queries.test.ts lib/api/ledger-books.test.ts schemas/ledger-book.test.ts app/api/ledger-books app/api/ledger-entries/route.test.ts app/api/ledger-entries/summary/route.test.ts components/ledger/books components/ledger/LedgerSummarySection.test.tsx components/ledger/records hooks/use-ledger-entries.test.ts hooks/use-ledger-entries.test.tsx lib/ledger-books/navigation.test.ts constants/service-routes.test.ts components/layout/ServiceHeader.test.tsx lib/providers.test.tsx
```

SQL 검증은 두 가구·네 사용자의 권한, 기본 장부 유지, 이름 충돌, 보관·삭제 거절, 재활성화, 기존 금융 데이터 보존을 확인한 뒤 롤백한다. 동시성 검증은 삭제와 첫 거래 입력의 두 순서, 기본 교체가 보관·삭제보다 먼저인 경우, 보관이 기본 교체보다 먼저인 경우를 실제 잠금 대기로 확인한다. 총 다섯 경우가 통과했고 기본 교체 경쟁에서도 활성 공용 기본 장부 하나가 유지됐다. fixture는 검증 뒤 제거한다.

2026-10-04 격리된 로컬 Supabase와 실제 Next API에서 네 사용자의 인증 요청을 검증했다. 가구 소유자와 구성원의 전체 지출은 각각 7,000원·8,000원이었고, 타인 개인 장부·다른 가구·없는 장부 요청은 동일한 404 응답이었다. 생성·이름 변경·보관·재활성화·삭제와 권한/상태 오류도 검증했다. `agent-browser`의 390×844 화면에서 허브→장부별 조회, 보관 중 읽기 전용, 재활성화, 생성·삭제, 관리 후 날짜 복귀, 삭제창 취소 후 포커스 복귀를 확인했다. 1280×900 조회 화면과 모바일 화면에 가로 넘침이 없었으며, 장부 선택·월 이동·새로고침 버튼은 44px 이상이었다. 새 브라우저 세션에서 잘못된 날짜와 접근 불가 링크 처리 중 JavaScript 오류가 없었다.

전체 Vitest 133개 파일·692개 테스트와 마지막 변경의 추가 집중 검증, 타입 검사, 프로덕션 빌드가 통과했다. 변경 파일의 Biome 검사에 오류는 없었으며, 기존 기록 상세 테스트의 `any` 경고 5개는 남아 있다. 검증용 Next·인증·REST 서버, 브라우저 인증 프로필과 네 사용자·두 가구 fixture를 정리했다.

## 남은 티켓과 실기기 확인

장부 지정 입력·재분류는 #442, 변경 요청은 #444, 전체 캘린더·검색 확장은 #445, 분석·최종 출시와 구버전 호환 제거는 #446 범위다. 현재 입력 API는 장부 ID를 받지 않으므로 임의의 새 장부 화면에는 잘못된 장부로 기록을 만드는 입력 버튼을 노출하지 않는다.

운영 적용과 실제 iPhone 설치형 PWA·Safari 직접 링크/새로고침/뒤로 가기는 이번 로컬 검증에 포함되지 않았다. 실기기에서 관리 후 장부·날짜·조회 조건 복원, 보관 상태, 계정 전환 시 개인 데이터 제거를 확인하고 기종·iOS·앱/API 버전을 기록해야 한다. 자동 브라우저 검증으로 실기기 통과를 대체하지 않는다.
