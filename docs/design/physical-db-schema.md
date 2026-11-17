# 물리 DB 스키마

- 결정일: 2026-11-17
- 티켓: [물리 DB 스키마: 테이블·제약·반올림·날짜 규칙](https://github.com/Gn0lee/oat/issues/526)
- 관련 ADR: 0004~0009(도메인), 0011~0013(서버 아키텍처), 0014(해외 날짜는 현지 날짜), 0015(합 불변식 트리거와 예상 상태 기록), 0016·0017(통계 질문 목록에서 더한 칸)
- 후속 변경: [기존 데이터 전환](legacy-migration.md)(2026-11-17)에서 `ledgers.archived_at`을 더했다. [통계 질문 목록](stats-questions.md)(2026-11-17)에서 `wallets.stats_group`, `categories.is_fixed_default`, `records.is_fixed`, `records.spender_member_id`, 예상 기록 부분 인덱스를 더하고, 환불·혜택 줄도 원 기록과 같은 장부로 묶었다.
- 전제: [서버 아키텍처](server-architecture.md) 3절. PostgreSQL 18, Drizzle, DB 롤 셋(`owner`·`app`·`system`), 앱 레이어 권한 + 가구 RLS 안전망, 얇은 클라이언트.
- 이 문서는 테이블 모양과 규칙을 정한다. 칸 이름·타입의 최종 철자는 구현 때 Drizzle 스키마가 정본이 된다.

## 1. 전체 모양

```
가구 소유 (household_id + RLS)
  장부·지갑  ledgers · wallets · wallet_card_settings · wallet_brokerage_settings
             payment_methods · payment_method_targets · card_performance_months
             categories · counterparties
  기록       records ─┬─ legs        (지갑별 잔액 변화)
                      └─ lines       (바깥 몫, 카테고리)
             bills (청구서 입력값) · system_occurrence_dismissals
  정기       recurring_rules ─┬─ recurring_rule_legs · recurring_rule_lines
                              ├─ recurring_rule_settlements
                              └─ recurring_exceptions
  감사       audit_log

전역 기준 데이터 (RLS 없음)
  securities · security_daily_closes · security_live_quotes(UNLOGGED)
  dividend_events · fx_rates · tax_rate_periods · holidays · card_issuer_presets

계정·가구 경계 (RLS 없음, 접근 문맥 모듈만 읽음)
  Better Auth 테이블(user·session·account·verification·oauth_*)
  households · household_members · invitations

운영 (RLS 없음)
  idempotency_keys · pgboss.* (큐 라이브러리 소유 스키마)
```

## 2. 공통 규칙

1. **가구 소유 테이블은 자식까지 모두 `household_id`를 가진다.** 자식 행의 FK는 `(household_id, parent_id) → parent(household_id, id)` 두 칸으로 건다. 같은 가구 안의 다른 테이블을 가리키는 FK(다리 → 지갑, 줄 → 카테고리, 기록 → 장부 등)도 모두 두 칸이다. 그래서 부모마다 `UNIQUE (household_id, id)`를 둔다. 가구가 엇갈린 행은 DB가 거절한다.
2. **RLS 정책은 모든 가구 소유 테이블에서 같은 한 줄이다.** `household_id = NULLIF(current_setting('app.household_id', true), '')::uuid`이고, 설정이 없으면 0행이다. `NULLIF`가 필요한 이유: 풀 커넥션에서 한 번 `set_config(…, true)`를 쓴 뒤에는 트랜잭션이 끝나도 값이 NULL이 아니라 `''`로 남아서, 그대로 `::uuid`로 바꾸면 0행이 아니라 오류가 난다. `FORCE ROW LEVEL SECURITY`를 켠다.
   - **트랜잭션 하나 = 가구 하나.** 한 트랜잭션 안에서 `app.household_id`를 바꾸지 않는다. 커밋 시점 트리거(3.3)가 앞 가구의 행을 RLS 때문에 못 보고 통과하는 일을 막기 위해서다. worker도 가구마다 트랜잭션을 따로 연다.
3. **가구 소유가 아닌 테이블은 1절의 목록뿐이다.** 새 테이블은 기본이 가구 소유이고, 목록에 넣으려면 이 문서를 고친다.
   - `households`·`household_members`·`invitations`는 요청의 가구를 정하는 데 쓰여서 RLS를 걸 수 없다(가구를 알기 전에 읽어야 함). 권한 모듈의 접근 문맥 생성만 읽고 쓴다.
   - **카테고리는 가구마다 복사한다.** 가구를 만들 때 기본 카테고리 세트를 그 가구 행으로 넣는다. 전역 행과 가구 행을 섞지 않아서 정책 예외가 없다. 시스템 카테고리(투자 비용, 미분류 등)는 `system_key` 칸으로 식별한다.
4. **ID는 UUIDv7**이다. 기본값은 Postgres 18 내장 `uuidv7()`이고, 서버 코드가 미리 만들어 넣어도 된다. 초대 코드·공개 토큰에는 쓰지 않는다. Better Auth 테이블의 ID 형식은 Better Auth 설정을 따르고, 그 테이블을 가리키는 FK는 그 타입에 맞춘다.
5. **`version`은 묶음의 대표 행에만 둔다.** 대상: `records`, `wallets`, `payment_methods`, `ledgers`, `categories`, `counterparties`, `recurring_rules`, `bills`. 다리·줄·규칙의 다리/줄·하위 설정 테이블은 대표 행의 version으로 지킨다. 대표 행을 고칠 때는 자식을 통째로 갈아 끼우고 `version = version + 1 … WHERE version = ?`로 갱신한다. 바뀐 행이 0개면 409다.
6. **삭제는 진짜 삭제이고, 감사 기록에 직전 모습을 남긴다.** 소프트 삭제(`deleted_at`)는 두지 않는다. 필요해지면 칸을 더하고 RLS 정책에 `deleted_at IS NULL`을 같이 넣는 방식으로 추가한다. 휴지통·되돌리기는 감사 기록의 직전 모습으로 다시 만드는 기능으로 만든다.
7. **값 타입.**

   | 값 | 컬럼 | Drizzle 매핑 |
   |---|---|---|
   | 금액 | `bigint`, 통화 최소 단위(KRW 원, USD 센트) + `currency text`(CHECK 대문자 3글자) | `mode: 'number'`, CHECK `abs(amount) <= 9007199254740991` |
   | 종목 수량 | `numeric(24,8)` | 문자열 |
   | 단가·평단·주당 배당금 | `numeric` | 문자열 |
   | 환율 | `numeric(18,6)` | 문자열 |
   | 세율·요율 | `numeric(12,8)` | 문자열 |
   | 기록 날짜 | `date` | `mode: 'string'` (`YYYY-MM-DD`, JS `Date`로 바꾸지 않음) |
   | 같은 날 안의 시각 | `time(0)` NULL 허용 | `mode: 'string'` (`HH:MM:SS`로 나오고, API는 `HH:MM`으로 내보낸다) |
   | 순간값 | `timestamptz` | ISO 8601 UTC |

   통화는 `KRW`·`USD`로 시작하고, 통화별 소수 자릿수 표(KRW 0, USD 2)는 서버 상수로 둔다. 금액 칸 이름은 `amount`로 통일한다.
   - **집계 결과의 타입 함정**: `SUM(bigint)`의 결과는 `numeric`이라 드라이버가 문자열로 준다. 칸의 `mode: 'number'`는 집계 결과에 적용되지 않는다. 집계 쿼리는 `::bigint`로 되돌리거나, 결과를 받는 곳에서 한 함수로 파싱한다. 둘 중 하나로 통일하고 테스트로 지킨다.
8. **FK의 ON DELETE는 칸마다 정한다(5.8의 표).** 두 칸 FK에 그냥 `ON DELETE SET NULL`을 쓰면 `household_id`까지 NULL로 만들려다 NOT NULL 위반으로 삭제가 실패한다. Postgres 15부터 되는 칸 지정 문법 `ON DELETE SET NULL (origin_record_id)`을 쓴다. Drizzle이 이 문법을 만들지 못하면 그 FK만 마이그레이션 SQL을 손으로 쓴다.

## 3. 불변식

### 3.1 세 겹

| 겹 | 수단 | 범위 | 예 |
|---|---|---|---|
| 1 | CHECK 제약 | 행 하나 | 다리 금액 ≠ 0, 단위는 둘 중 정확히 하나, kind별 필수·금지 칸 |
| 2 | 지연 제약 트리거(`DEFERRABLE INITIALLY DEFERRED`) | 기록 하나 전체, 커밋 시점 | 줄 합 = 바깥 다리 합, 예상 상태는 다리 0개 |
| 3 | 도메인 서비스 + 통합 테스트 | 여러 기록, 시간 순서 | 돌려받은 돈 한도, 정산은 원 기록과 같은 장부, 증권 계좌 기록은 계좌의 장부, 보유 수량 음수 금지 |

DB 트리거는 2겹 하나만 둔다. 업무 규칙은 앱에 둔다(ADR 0012의 결). (ADR 0015)

### 3.2 다리와 줄의 부호, 교환 다리

- **부호.** 다리는 지갑에 들어오면 +, 나가면 −다. 줄은 같은 방향을 따른다(수입 +, 지출 −). 지출 1만 원은 다리 −10,000과 줄 −10,000이다. 신용카드·대출 지갑은 갚을 돈이 늘면 잔액이 더 음수가 된다.
- **교환 다리.** 매매와 환전은 바깥과 주고받은 돈이 아니라 맞바꾸기다(ADR 0009). 그런데 매수의 현금 다리(−)와 종목 다리(+), 환전의 KRW 다리(−)와 USD 다리(+)는 통화별로 더해도 0이 되지 않는다. 그래서 다리에 `is_exchange` 표시를 두고, **교환 다리는 줄 합 검사에서 뺀다.**
  - 매수: 현금 다리 −체결 금액(교환), 현금 다리 −매매 비용(일반, 비용 줄과 짝), 종목 다리 +수량(교환).
  - 환전: KRW 다리 −(교환), USD 다리 +(교환). 줄이 없다.
  - 교환 다리는 kind가 매매·환전인 기록에만 허용한다(CHECK는 트리거에서). 잔액 계산은 교환 여부와 관계없이 모든 다리를 더한다.
  - 평단의 원가는 종목 다리의 `unit_price`(체결 단가) × 수량을 반올림하지 않고 계산한다. 소수점 매매에서 센트로 반올림된 현금 다리를 수량으로 나누면 증권사 평단과 어긋나기 때문이다(0.012345주 × $512.34 → 현금 다리 $6.32 → $511.95). 실현손익의 받은 금액은 교환 현금 다리 금액이다.
- **종목 다리**는 줄 합 검사 대상이 아니다. 이관(계좌 사이 종목 이동)은 종목 다리 −/+만 있고 줄이 없다.

### 3.3 2겹 트리거가 확인하는 것

기록·다리·줄 중 어느 것이 바뀌면, 그 기록에 대해 커밋 시점에 한 번 확인한다.

- `status = confirmed`: 통화마다 `Σ 줄.amount = Σ 다리.amount (통화 다리이고 is_exchange = false)`.
- `status = expected`: 다리가 0개이고 줄이 1개 이상.
- `status = confirmed`인 기록은 다리가 1개 이상이다(빈 기록 금지).
- 교환 다리는 kind가 `trade`·`fx_exchange`일 때만 허용한다.
  - `trade`: 교환 현금 다리와 종목 다리가 **같은 지갑**에 각각 하나 이상, 부호가 반대다.
  - `fx_exchange`: 통화가 다른 교환 다리 둘 이상, 부호가 반대다.
- 종목 다리는 kind가 `trade`·`security_transfer`·`security_transfer_out`·`security_transfer_in`·`corporate_action`·`balance_adjustment`일 때만 허용한다. `security_transfer`(같은 장부 이관, 기록 하나)는 종목마다 수량 합이 0이다. 장부가 다른 이관의 출고·입고 기록은 각각 종목 다리 하나이고 합 검사 예외이며, 짝(같은 종목, 같은 수량, 반대 부호, `target_record_id` 연결)은 도메인 서비스가 확인한다.
- `expected` 기록은 역할이 혜택·정산인 줄만 가진다.
- `balance_adjustment`는 줄 없이 다리만 갖는다(줄 합 검사 예외). 잔액만 맞추고 수입·지출 통계에 들어가지 않는다.
- 이체(바깥 다리 합이 0)는 줄 0개가 정상이다.
- 확인할 기록 행이 RLS 때문에 보이지 않으면 통과시키지 않고 예외를 낸다(2.2의 "트랜잭션 하나 = 가구 하나"의 안전장치).

### 3.4 3겹에서 지키는 규칙

- **돌려받은 돈 한도**(ADR 0006·0007): 원 기록 + 카테고리별로 "줄 합 − 확정된 환불·혜택·정산"까지만 줄인다. 원 기록 수정으로 한도가 깨지면 저장을 막는다. 같은 원 기록에 환불 두 건이 동시에 들어와 각자 한도를 통과하지 않도록, 검사 전에 원 기록 행을 `SELECT … FOR NO KEY UPDATE`로 잠근다. 여러 원 기록을 가리키면 id 순서로 잠근다.
- **잠금 규칙**: 지갑·기록 잠금은 `FOR UPDATE`가 아니라 `FOR NO KEY UPDATE`로 한다(다른 트랜잭션이 그 행을 가리키는 FK 행을 넣는 것까지 막지 않기 위해). 여러 행을 잠글 때는 늘 id 순서로 잠가 교착을 피한다.
- **환불·혜택·정산 줄은 원 기록과 같은 장부**(공용 통계를 두 가구원이 같게 보기 위해서, 통계 질문 목록 3절), **증권 계좌의 기록은 계좌에 정한 장부**.
- **장부가 다른 두 증권 계좌 사이의 이관**: 장부가 같으면 기록 하나(종목 다리 −/+)이고, 다르면 출고(`security_transfer_out`)·입고(`security_transfer_in`) 기록 두 개로 나눈다. 입고 기록은 `target_record_id`로 출고 기록을 가리킨다. 입고 평단은 저장하지 않고 출고 시점의 출발 계좌 평단을 따라가 계산한다. 그래야 나중에 출발 계좌에 과거 매수를 끼워 넣어도 같은 장부 이관과 똑같이 평단이 따라온다. 두 기록은 같은 트랜잭션으로 저장하고 함께 지운다.
- **보유 수량 음수 금지**: 매매·이관·분할 기록을 쓰거나 지울 때, 그 계좌·종목의 이력 전체를 정렬 키(4.1) 순서로 다시 계산해서 어느 시점에서든 수량이 음수가 되면 거절한다("먼저 매수·이관 기록을 넣어 주세요"). 같은 날 매도를 먼저 넣고 매수를 나중에 넣으면 입력 순서(id) 때문에 거절될 수 있으니, 안내 문구에서 시각 입력을 권한다. 검사 동안 관련 지갑 행을 잠근다(이관이면 두 지갑을 id 순서로). 예수금 음수는 막지 않고 안내만 한다(주식 모델 결정).
- **권리 변동**: `corporate_action` 기록은 `records.corporate_action_type`(분할·병합·무상증자·주식배당·상장폐지)을 반드시 가진다. 병합(다리 −9, 총원가 유지)과 상장폐지(다리 −전량, 원가 전액 손실)는 다리 모양이 같아서 계산 모듈이 이 칸으로 구분한다.
- **상장폐지**: 현금 없이 종목만 사라지므로 매매가 아니라 `corporate_action`(상장폐지, 종목 다리 −수량, 현금 다리 없음)으로 적는다. 주식 모델 티켓이 말한 "현금 0원 매도"를 이 모양으로 바꿨다. "매매에는 늘 현금 다리가 있다"는 규칙과 "다리 금액 ≠ 0" CHECK를 지키기 위해서다. 실현손익(전액 손실)은 계산한다.
- **단가와 체결 금액**: 매매의 교환 현금 다리와 종목 다리의 `unit_price × 수량`은 최소 단위 1 이내로 같아야 한다. 사용자가 한쪽만 고쳐 어긋나면 다른 쪽을 다시 받는다.
- **다리의 결제수단과 지갑**: `legs.payment_method_id`가 있으면 그 결제수단이 가리키는 지갑(체크카드는 연결 통장, 신용카드는 청구 단위 지갑)이 다리의 지갑과 같아야 한다. DB에서는 `payment_methods`에 `UNIQUE (household_id, id, wallet_id)`를 두고 다리에서 세 칸 FK로 막는다.
- **카드 설정 이력**: 가장 최근 확정 청구서보다 앞선 `wallet_card_settings` 행은 고치거나 지울 수 없고 새 행을 더하기만 한다. 그래야 "확정한 청구서는 다시 배정하지 않는다"가 지켜진다.
- **장부 전용 카테고리**는 그 장부의 기록과 규칙에만 쓸 수 있다.
- **kind와 줄 역할**: `refund` 기록은 환불 줄을, `benefit`·`benefit_reversal`은 혜택 줄을, `settlement`·`settlement_return`은 정산 줄을, `expiry`는 소멸 줄을 하나 이상 가진다. 다른 kind도 이 역할의 줄을 섞어 가질 수 있다(급여 안의 정산 줄 등).
- **되돌림 줄**: 혜택 회수는 역할이 혜택이고 부호가 반대인 줄이며, 기록의 `target_record_id`가 원래 혜택 기록을 가리킨다. 정산 돌려주기도 같은 방식(역할 정산, 반대 부호)이다. 돌려받은 돈 한도와 "받은 혜택"은 되돌림 줄을 상계해서 계산한다.
- **원 기록 없는 환불**(앱을 쓰기 전에 산 물건의 환불 등)은 환불 줄이 아니라 일반 수입 줄로 적는다. 환불 줄은 원 기록이 반드시 있다(CHECK `role <> 환불 OR origin_record_id IS NOT NULL`). 이 CHECK 때문에 SET NULL이 환불 줄에 닿으면 삭제가 실패해서, 원 기록 삭제 규칙에 DB 안전망이 하나 더 생긴다.
- **0원 결제**(전액 쿠폰처럼 어느 지갑에서도 돈이 나가지 않은 결제)는 잔액이 바뀌지 않아 기록하지 않는다. 확정 기록은 다리가 1개 이상이고 다리 금액은 0이 아니기 때문이다.
- **자동 기록 삭제**: 정기 규칙이 만든 기록을 지우면, 같은 트랜잭션에서 `recurring_exceptions`에 그 회차의 건너뛰기를 넣는다. 그래야 worker가 놓친 회차를 채울 때 다시 만들지 않는다(정기 결정: "자동 기록을 지우면 건너뛴 것으로 본다").
- **원 기록 삭제**: 원 기록을 가리키는 줄(`origin_record_id`)이 있으면 역할별로 처리한다.
  - 예상 기록에서는 그 원 기록을 가리키는 **줄만** 지우고, 줄이 0개가 되면 기록을 지운다. 예상 묶음 정산의 다른 줄(다른 원 기록의 받을 돈)은 남는다.
  - 확정 정산 줄은 연결이 끊겨 **연결 대기**가 된다(정산 결정).
  - 확정 환불·확정 혜택 줄이 있으면 **삭제를 막고** 연결된 기록부터 정리하게 한다. 조용히 끊기면 혜택은 혜택 수입으로, 환불은 원 기록 없는 수입으로 바뀌어 통계가 뒤집히기 때문이다. 원 기록을 고칠 때 한도가 깨지면 저장을 막는 규칙(ADR 0007)과 같은 결이다.
  - FK는 `ON DELETE SET NULL (origin_record_id)`라서 서비스가 빠뜨려도 끊긴 참조가 남지 않는다.

## 4. 날짜·순서·반올림·환율

### 4.1 기록 날짜와 같은 날 안의 순서

- 기록 날짜(`records.date`)는 기본적으로 한국 날짜다. 예외는 둘이다. (ADR 0014)
  - **해외 카드 이용**: 카드사 명세서에 찍히는 **현지 이용일**. 청구서 배정과 통계 월이 명세서와 맞는다. 입력 화면은 오늘(한국)을 기본값으로 채우고 사용자가 바꾼다.
  - **해외 주식 체결**: 체결한 시장의 **현지 체결일**(미국은 미 동부). 배당락일 보유 판정과 SEC fee 세율 기간이 현지 날짜 기준이기 때문이다.
- `records.time`은 선택값이고, 기록 날짜와 같은 기준(현지면 현지 시각)의 `HH:MM`이다.
- **정렬 키**는 `(date, sort_time, id)`다. `sort_time`은 `coalesce(time, '24:00')`로 만든 NOT NULL 생성 칸이라, 시각이 없는 기록은 그날 맨 뒤에 온다. NULL이 없어야 행 값 비교(`(a, b, c) > (…)`)로 커서를 만들 수 있다. id가 UUIDv7이라 마지막 기준은 입력 순서다. 목록 커서 페이지네이션과 평단·보유 수량 계산이 같은 정렬 키를 쓴다.
- 기존 데이터 전환 스크립트는 UUIDv7의 시각 부분을 원래 기록의 생성 시각으로 만들어 넣는다. 그래야 옮긴 기록의 같은 날 순서가 원래 순서와 같다. 예외는 같은 날 매도를 먼저 입력해 보유 수량이 음수가 되는 매수뿐이고, 그날 매도 앞으로 당긴다([기존 데이터 전환](legacy-migration.md) 6절).
- 매입일(`purchase_date`)은 선택값이고 같은 날짜 기준을 따른다.

### 4.2 반올림

- 반올림은 "소수 × 소수 → 정수 금액"에서만 생긴다. 사람이 입력한 금액은 이미 정수다.
- **매매 금액(수량 × 단가)**: 통화 최소 단위에서 사사오입(half-up). 증권사 체결 금액과 다르면 사용자가 실제 금액으로 고친다.
- **매매 비용(거래세·SEC fee·수수료 추정)**: `tax_rate_periods` 행마다 `rounding_mode`(`floor`·`ceil`·`half_up`)를 둔다. 실제 값은 구현 전 확인 목록(농특세·SEC fee 등)과 함께 채운다. 수수료 추정은 사사오입이다.
- **비율 배분**(돌려받은 돈의 카테고리 배분, 결제 할인의 줄 배분): 끝전은 가장 큰 몫에 넣는다(ADR 0007). 할부 회차 원금의 나머지는 첫 회차에 넣는다.
- **계산값은 저장할 때 한 번 정수로 확정한다.** 요율·세율이 바뀌어도 과거 기록은 다시 계산하지 않는다.
- 비교·검증·집계용 중간 계산은 서버에서 소수 라이브러리로 하고, 부동소수점을 쓰지 않는다.

### 4.3 그날 기준환율

- **정의**: 기록 날짜의 **마지막 고시 환율**. 그날 고시가 없으면(주말·휴일) 그 이전의 가장 최근 값이다. 출처는 "시세 데이터 공급원 선택"에서 정한다(은행 매매기준율 계열이 1순위 후보).
- **기록에 함께 저장한다**: `records.fx_rate`, `records.fx_rate_date`. 외화 다리나 외화 줄이 있는 기록(매매, 환전, USD 배당 등)에 채운다. 나중에 환율 이력이 고쳐져도 과거 원화 값이 바뀌지 않는다. 사용자가 증권사 적용 환율로 덮어쓸 수 있다.
- **원화 환산**: 환산은 보여주는 단위마다 외화 금액 × 환율을 원 단위에서 반올림하고, 합계는 반올림한 값들의 합이다. 목록에 보이는 숫자를 더한 값과 합계가 정확히 같다.
  - 기록 목록·잔액은 다리 단위로, 카테고리 통계는 줄 단위로 환산한다. 그래서 한 기록 안에서 원화 기준 줄 합과 다리 합이 ±1원 다를 수 있다. 외화 기준으로는 늘 같다.
  - 반올림은 **절댓값 기준 사사오입**(half away from zero)이다. 환불이 원 지출의 정확한 반대 숫자가 되게 하기 위해서다. 4.2의 사사오입도 모두 이 방식이다.
- 해외 카드 다리는 처음부터 KRW 추정액이고 청구서 확정 때 고친다(신용카드 모델). 원래 외화 금액은 `foreign_amount`·`foreign_currency` 부가 정보이고 환산에 쓰지 않는다.

## 5. 테이블

칸은 결정에 필요한 것만 적는다. 모든 가구 소유 테이블은 `id`, `household_id`, `created_at`, `updated_at`을 가진다.

### 5.1 장부·지갑·결제수단

- **`ledgers`**: `kind`(공용·개인), `owner_member_id`(개인만, CHECK), 이름, `archived_at`(보관한 장부: 새 기록을 받지 않고 목록에서 접힘, 기존 데이터 전환에서 더함), version.
- **`wallets`**: `kind`(통장·현금·신용카드·대출·페이머니·포인트·상품권·증권 계좌), 이름, `owner_member_id`, `hidden_from_household`, `allow_member_use`, `archived_at`, `point_tracking_mode`(포인트만), `stats_group`(묶음: `spendable`·`saving`·`investment`·`points`·`liability`, NOT NULL, 기본값은 kind에서 나오고 부채 kind는 `liability`만 CHECK), version. 자산/부채는 kind에서 정한다. 잔액 칸은 없다. `allow_member_use`는 쓴 사람 계산에서 "함께 쓰는 지갑" 표시를 겸한다(ADR 0017).
- **`wallet_card_settings`** (이력, PK `(wallet_id, effective_from)`): 카드사, 결제일, 이용기간 규칙(`card_issuer_presets` 참조 또는 시작일 직접 입력), `effective_from`. 결제일을 바꾸면 새 행을 더한다. 기록은 매입일(모르면 이용일)에 유효한 행으로 청구서에 배정하고, 이미 확정한 청구서는 다시 배정하지 않는다.
- **`wallet_brokerage_settings`** (1:1, PK `wallet_id`): `ledger_id`, `cash_tracking_enabled`(기본 false), 과세 유형(일반·ISA·연금), 국내·해외 수수료율(NULL이면 추정 안 함).
- **`payment_methods`**: kind(신용카드·체크카드·페이 등), 이름, 가리키는 `wallet_id`(페이는 NULL), `owner_member_id`, `archived_at`, version. 카드 한 장(가족카드 포함)이 하나다.
- **`payment_method_targets`**: 페이의 연결 대상. 대상은 결제수단(페이에 등록한 카드) 또는 지갑(페이머니) 중 하나다(CHECK). `last_used_at`.
- **`card_performance_months`**: `(payment_method_id, month 'YYYY-MM')` 유니크, 실적 인정 금액, 추정 여부. 모델만 두고 기능은 범위 밖이다.
- **`categories`**: 이름, 수입/지출, 부모(선택), `system_key`, `is_fixed_default`(기록의 고정비 표시 기본값), `ledger_id`(NULL이면 가구 공통, 값이 있으면 그 장부 전용), 정렬, version. 장부 전용 카테고리는 그 장부를 볼 수 있는 사람에게만 보이고(권한 모듈), 그 장부의 기록에만 쓸 수 있다. 기본 카테고리는 모두 가구 공통이다.
- **`counterparties`**: `ledger_id`, 이름, version.

### 5.2 기록

**`records`** — 넓은 테이블에 kind별 CHECK를 건다.

| 묶음 | 칸 |
|---|---|
| 공통 | `ledger_id`, `kind`, `status`, `date`, `time`, `sort_time`(생성 칸), `title`(가맹점·기록 이름), `memo`, `excluded_from_stats`, version |
| 통계 귀속 | `is_fixed`(고정비, NOT NULL, 저장할 때 규칙·카테고리 기본값에서 정하고 사용자가 고친다), `spender_member_id`(쓴 사람 덮어쓰기, NULL이면 계산) (ADR 0017) |
| 예상 | `expected_wallet_id`(예상 혜택·정산을 받을 지갑. 예상 청구액에 예상 혜택을 넣을 때 쓴다) |
| 카드 | `payment_method_id`(앞단 결제수단: 사용자가 고른 것. 카드로 바로 결제하면 그 카드, 네이버페이를 거치면 네이버페이), `purchase_date`, `defer_to_next_bill`, `installment_months`, `installment_interest_free`, `foreign_amount`, `foreign_currency` |
| 정기 | `recurring_rule_id`, `occurrence_date`, `is_auto` |
| 환율 | `fx_rate`, `fx_rate_date` |
| 권리 변동 | `corporate_action_type` |
| 배당 | `dividend_event_id`, `dividend_wallet_id`(배당받은 증권 계좌), `dividend_per_share`, `dividend_base_quantity` |
| 연결 | `counterparty_id`(기록의 상대. 묶음 정산처럼 줄마다 상대가 다르면 NULL이고 줄의 `counterparty_id`를 쓴다), `target_record_id`(혜택 회수·정산 돌려주기 → 원래 혜택·정산, 할부수수료 → 할부 기록) |

- `kind` 초기 목록: `general`(수입·지출·이체), `card_payment`(카드대금), `refund`, `benefit`, `benefit_reversal`, `settlement`, `settlement_return`, `expiry`(소멸), `balance_adjustment`(잔액 맞춤), `trade`, `fx_exchange`(환전), `security_transfer`(같은 장부 이관), `security_transfer_out`·`security_transfer_in`(장부가 다른 이관), `corporate_action`(권리 변동, `corporate_action_type` 필수), `dividend`. 값은 추가만 한다(계약의 enum 규칙과 같다).
  - kind는 다리 모양 검사(3.3), 화면 기본값, 목록 분류에 쓴다. 돌려받은 돈인지, 소멸인지는 kind가 아니라 **줄의 `role`**이 정한다. 급여(`general`) 안의 회사 지원 정산 줄, 포인트 전환 기록 안의 소멸 줄처럼 한 기록에 역할이 섞이기 때문이다.
- `status`: `confirmed`, `expected`. 예상은 혜택·정산 줄만 가진 기록에만 쓴다.
- **연결 대기**는 저장하지 않고 계산한다: 확정 기록의 정산 줄인데 `origin_record_id`가 NULL이다. 원 기록 없는 혜택 줄은 혜택 수입이다.
- 유니크(NULL 제외 부분 유니크): `(recurring_rule_id, occurrence_date)`는 정기 회차를 두 번 기록하지 않게, `(dividend_wallet_id, dividend_event_id)`는 같은 배당을 두 번 기록하지 않게 한다. 백업 복구 뒤 큐가 되살아나도 중복이 생기지 않는다. 카드대금은 즉시결제를 여러 번 할 수 있어서 유니크가 없다.
- 기록이 원 기록을 가리키는 연결은 줄의 `origin_record_id`다(아래).

**`legs`**: `record_id`, `wallet_id`, `currency`+`amount` 또는 `security_id`+`quantity`(CHECK 정확히 한 짝), `unit_price`(종목 다리만, 아래 표), `payment_method_id`(이 다리에서 실제로 쓴 카드: 네이버페이 뒤의 가족카드 등), `is_exchange`, `is_estimated`(해외 카드의 KRW 추정액처럼 청구서에서 고칠 금액).

| kind | 종목 다리의 `unit_price` |
|---|---|
| `trade` 매수·매도 | 체결 단가(필수) |
| `balance_adjustment` 종목 시작 보유 | 시작 평단(필수) |
| `security_transfer`·`_out`·`_in` | NULL(평단은 출발 계좌에서 계산) |
| `corporate_action` | NULL(총원가 유지, 상장폐지는 원가 전액 손실) |

결제수단별 건수·통계는 기록 단위(`records.payment_method_id`, 품목 결정의 "결제수단은 기록 단위")이고, 카드 혜택·실적은 다리의 `payment_method_id`로 카드 한 장 단위로 모은다. 네이버페이로 카드와 페이머니를 나눠 낸 결제는 다리 둘에 각자의 결제수단이 붙는다.

추정 표시는 두 곳에만 둔다. 다리의 `is_estimated`는 금액 자체가 추정인 경우이고, 줄의 `is_estimated`는 매매 비용이 요율로 추정한 값인 경우다.

**`lines`**: `record_id`, `role`(일반·환불·혜택·정산·소멸), `currency`, `amount`(0 허용: 무료 품목), `category_id`(NULL은 미분류), `name`, `list_price`, `origin_record_id`, `counterparty_id`(정산 줄), `cost_type`(매매 비용의 수수료·세금), `is_estimated`(추정/실제), 정렬.
- `origin_record_id`는 역할이 환불·혜택·정산인 줄만 가질 수 있다(CHECK). 환불은 원 기록이 반드시 있다(삭제 규칙 3.4로 지킨다).
- 돌려받은 돈 한도와 통계는 줄의 역할로 계산한다. 정산 기록의 "초과분 일반 수입 줄"은 역할이 일반이라 연결 대기 줄과 구분된다.

**`bills`**: 청구서는 계산하는 창이고, 사용자가 확정한 것만 행으로 남는다. `(wallet_id, due_date)` 유니크, `confirmed_amount`, `confirmed_at`, version. 예상 청구액과 "설명되지 않은 차이"는 계산한다.

**`system_occurrence_dismissals`**: 건너뛴 시스템 예정. kind는 `card_payment`·`dividend`이고, 대상 칸이 kind마다 달라서 부분 유니크 두 개를 건다: 카드대금은 `(wallet_id, ref_date)`, 배당은 `(wallet_id, dividend_event_id)`. NULL 칸이 섞인 유니크 하나로는 중복을 막지 못한다.

### 5.3 정기

- **`recurring_rules`**: `ledger_id`, 종류 표시값(자동이체·정기결제·정기 수입·직접 입력), 주기(매월 N일/말일, 매주 요일, 매년, N개월마다), 시작일, 주말·공휴일 조정(그대로·앞 영업일·다음 영업일), 금액 유형(고정·변동), `auto_record`(고정만, CHECK), 종료(날짜 또는 횟수), 메모, version.
- **`recurring_rule_legs`**, **`recurring_rule_lines`**: 만들 기록의 틀. `legs`·`lines`와 같은 모양(줄의 `role`·상대·카테고리 포함, 급여 안의 정산 줄도 여기)이고, 같은 합 규칙을 도메인 서비스가 확인한다. 지갑·카테고리 FK는 `ON DELETE SET NULL`이고, 끊긴 규칙의 예정은 "확인 필요"다.
- **`recurring_rule_settlements`**: "매달 정산 붙이기" 틀(상대, 카테고리, 금액). 원 예정을 확정할 때 예상 정산을 만든다. 그달 카테고리 기록을 찾아 붙는 독립 정산 규칙은 `recurring_rules`의 종류 하나로 두고, 대상 카테고리를 이 테이블에 적는다.
- **`recurring_exceptions`**: `(rule_id, occurrence_date)` PK, `action`(건너뛰기·바꾸기), `override_date`, `override_amount`.
- 예정 자체는 저장하지 않는다(ADR 0008).

### 5.4 감사

**`audit_log`**: `household_id`, `ledger_id`(대상이 장부에 속하면), `actor_member_id`(worker면 NULL), `entry_point`(앱·MCP·worker), `request_id`, `entity_type`, `entity_id`, `action`(생성·수정·삭제), `before`·`after`(jsonb), `created_at`. 쓰기와 같은 트랜잭션에 남긴다. 보존 기한은 없다. 감사 기록을 읽을 때도 권한 모듈의 "볼 수 있는 장부"를 거친다(개인 장부 내용이 들어 있기 때문이다). `app` 롤은 INSERT와 SELECT만 받는다(고치거나 지울 수 없다). `ledger_id`는 FK를 걸지 않는다(장부가 지워져도 기록이 남아야 해서).

### 5.5 전역 기준 데이터

| 테이블 | 키 | 주요 칸 |
|---|---|---|
| `securities` | uuid | 시장, 유형, 코드, 이름, 통화, 상장 여부 |
| `security_daily_closes` | (종목, 현지 거래일) | 종가 `numeric`, 출처 |
| `security_live_quotes` (`UNLOGGED`) | 종목 | 현재가, 기준 시각 |
| `dividend_events` | uuid | 종목, 배당락일·기준일·지급일(현지), 주당액, 통화, 예정/확정, 출처 |
| `fx_rates` | (통화쌍, 고시일) | 값 `numeric(18,6)`, 출처 |
| `tax_rate_periods` | uuid | 시장, 종목 유형, 세금 종류, 적용 시작일·종료일, 세율, `rounding_mode` |
| `holidays` | (국가, 날짜) | 이름, 종류(지금은 한국만) |
| `card_issuer_presets` | uuid | 카드사, 결제일, 이용기간 시작·끝 규칙 |

- `securities`가 종목 마스터의 정본이다. API 메모리에는 사본만 둔다. 재동기화에도 id가 유지되도록 자연키 유니크를 둔다: `securities (market, code)`, `dividend_events (security_id, ex_date, 출처의 이벤트 구분)`.
- `security_live_quotes`는 WAL·백업에 들어가지 않는다. 비정상 종료 뒤나 백업 복구 뒤에는 비어 있고, 정상 재시작 뒤에는 옛 값이 남아 있다. 그래서 값이 있는지가 아니라 **기준 시각**으로 신선도를 판단한다. 오래됐거나 비었으면 마지막 종가를 기준 시각과 함께 보여준다.
- 쓰기는 worker의 `system` 롤만 한다. `app` 롤은 SELECT만 한다.

### 5.6 계정·가구 경계

- Better Auth 테이블은 Better Auth CLI로 생성해 Drizzle 스키마에 넣는다(서버 아키텍처 16번).
- **`households`**: 이름, version.
- **`household_members`**: `id`, `household_id`, `user_id`, 역할, `status`(활동·나감), `display_name`, `left_at`.
  - `(household_id, user_id)` 유니크: 나갔다가 같은 가구에 다시 들어오면 새 행을 만들지 않고 옛 행을 다시 활동으로 바꾼다. 그래야 옛 소유 데이터와 이어진다.
  - **사용자는 활동 중인 가구 하나에만 속한다**: `user_id` 부분 유니크(`status = 활동`). 여러 가구가 필요해지면 유니크를 풀고 "현재 가구"를 세션에 둔다.
  - **멤버 행은 지우지 않는다.** 가구 데이터의 소유자·작성자 칸(`ledgers`·`wallets`·`payment_methods`의 `owner_member_id`, 감사 기록의 `actor_member_id`)은 사용자가 아니라 이 멤버 행을 가리킨다. 그래서 가구원이 나가거나 계정을 지워도 기록이 깨지지 않고, 화면은 "나간 가구원"처럼 가려서 보여줄 수 있다. 계정을 지우면 `user_id`만 `SET NULL`이 된다.
- **`invitations`**: 가구, 초대 코드(추측 불가 랜덤, UUIDv7 아님), 만료 시각, 사용 여부.

### 5.7 운영

- **`idempotency_keys`**: `(user_id, key)` PK, `request_hash`, `operation`(생성·수정·삭제 등), `resource_type`, `resource_id`, `status_code`, `created_at`. "처리 중" 상태 칸은 두지 않는다.
  - 쓰기 트랜잭션 맨 앞에서 `INSERT … ON CONFLICT DO NOTHING`으로 넣는다. 그냥 INSERT하면 유니크 위반이 트랜잭션을 중단 상태로 만들어 그 뒤에 저장된 행을 읽을 수 없기 때문이다.
  - 같은 키가 동시에 오면 두 번째 INSERT는 첫 트랜잭션을 기다린다. 이 INSERT에만 `SET LOCAL lock_timeout`(예: 2초)을 걸고 바로 되돌린다. 트랜잭션 전체에 걸면 지갑 잠금 대기까지 409로 잘못 나간다. 기다림이 넘치면 409다.
  - 넣은 행이 없으면(이미 있음) 저장된 행을 읽는다. 본문 해시가 다르면 422, 같으면 `operation`에 따라 응답한다. 생성·수정은 리소스의 현재 상태를 다시 읽어 응답하고, 삭제는 저장된 `status_code`를 그대로 돌려준다(다시 읽으면 404라서).
  - 7일 뒤 worker가 지운다. 가구 소유가 아니고 비밀값도 아니다.
- **`pgboss.*`**: pg-boss가 만들고 관리하는 스키마다. 작업 예약은 기록 저장과 같은 트랜잭션으로 넣는다. `owner`가 스키마를 소유하고, `app`·`system`은 pg-boss가 요구하는 권한만 받는다.

### 5.8 FK의 ON DELETE

| FK | ON DELETE | 이유 |
|---|---|---|
| `legs`·`lines` → `records` | CASCADE | 기록 묶음 |
| `lines.origin_record_id` → `records` | `SET NULL (origin_record_id)` | 서비스가 먼저 역할별로 처리한다(3.4). 확정 정산 줄만 실제로 끊긴다 |
| `records.target_record_id` → `records` | NO ACTION | 혜택 회수·정산 돌려주기·할부수수료·이관 입고가 가리키는 기록은 먼저 정리해야 지운다. NO ACTION은 문장 끝에 검사해서, 이관 두 기록을 한 번에 지울 때 순서를 따지지 않는다 |
| `records.ledger_id` → `ledgers` | RESTRICT | 기록이 있는 장부는 지우지 않는다 |
| `legs.wallet_id` → `wallets` | RESTRICT | 다리가 있는 지갑은 보관만 한다 |
| `records`·`legs`의 `payment_method_id` → `payment_methods` | RESTRICT | 쓴 적 있는 결제수단은 보관만 한다 |
| `lines.category_id` → `categories` | RESTRICT | 카테고리를 지우려면 다른 카테고리로 옮긴 뒤 지운다 |
| `records`·`lines`의 `counterparty_id` → `counterparties` | RESTRICT | 받을 돈 묶음이 깨지지 않게 |
| `records.recurring_rule_id` → `recurring_rules` | `SET NULL (recurring_rule_id)` | 규칙을 지워도 확정된 기록은 남는다 |
| `recurring_rule_legs`·`recurring_rule_lines`의 지갑·카테고리 | `SET NULL (칸)` | 끊긴 규칙의 예정은 "확인 필요" |
| 규칙의 다리·줄·정산 틀·예외 → `recurring_rules` | CASCADE | 규칙 묶음 |
| 지갑 하위 설정 → `wallets` | CASCADE | 지갑 묶음 |
| `owner_member_id`·`actor_member_id`·`records.spender_member_id` → `household_members` | RESTRICT | 멤버 행은 지우지 않는다 |
| 전역 기준 데이터(`securities`, `dividend_events` 등)를 가리키는 칸 | RESTRICT | 전역 행은 지우지 않고 상장 여부 등으로 표시한다 |
| `audit_log`의 모든 칸 | FK 없음 | 대상이 지워져도 기록이 남아야 한다 |
| 그 밖의 모든 FK(`expected_wallet_id`, `payment_methods.wallet_id`, `categories.ledger_id`, `bills.wallet_id` 등) | RESTRICT | 표에 없으면 RESTRICT가 기본이다 |

## 6. 롤과 접근

- `owner`: 모든 테이블의 소유자. migrate만 쓴다.
- `app`: 가구 소유 테이블에 RLS를 받으며 읽고 쓴다. 전역 기준 데이터는 SELECT만 한다. 계정·가구 경계 테이블과 운영 테이블은 접근 문맥 모듈·중복 방지 처리가 쓰는 범위에서 읽고 쓴다.
- `system`: 전역 기준 데이터에 쓰고, `households` 목록을 읽는다. **가구 소유 테이블에는 `system` 정책도 권한도 없다.** 가구 횡단 작업(오늘 예정 처리, 배당 예정 판정)은 가구 목록을 돈 뒤, 가구마다 `app` 롤 + 가구 설정으로 "이 가구에 오늘 할 일이 있나"를 판정하고 처리한다. 가구가 수천 개가 되어 느려지면 그때 가구별 "다음 할 일 날짜" 같은 가구 경계 테이블을 더한다. (서버 아키텍처 32번의 "가구 소유 테이블에서는 정해진 조회만"을 이렇게 좁혔다.)

## 7. 인덱스

1. **모든 FK에 인덱스를 둔다.** Postgres는 FK 칸에 인덱스를 자동으로 만들지 않는다.
2. **조회 패턴 인덱스는 `household_id`를 맨 앞에 둔다.** 처음 둘 것:
   - `records (household_id, ledger_id, date, sort_time, id)`: 목록·커서
   - `legs (household_id, wallet_id)` + 기록 날짜 정렬을 위한 조인: 잔액·평단. 느리면 `legs`에 기록 날짜를 복제한다.
   - `lines (household_id, origin_record_id)`: 돌려받은 돈 합계
   - `records (household_id, recurring_rule_id, occurrence_date)`: 예정 확정 여부
   - `records (household_id, ledger_id) WHERE status = 'expected'`: 받을 돈(통계 질문 목록 O4)
3. **나머지는 느린 쿼리를 측정한 뒤에 더한다.** 요약 테이블도 같다(서버 아키텍처 29번).

## 8. 잔액·평단·집계

- 잔액, 예상 청구액, 평단, 실현손익, 예정, 통계는 모두 조회할 때 계산한다. 요약 테이블은 처음에 두지 않는다.
- 평단은 계좌·종목별로 정렬 키 순서에 따라 이동평균을 다시 계산한다(순수 계산 모듈).
- 요약 테이블을 넣게 되면 기록 쓰기와 같은 트랜잭션에서 갱신한다. 돌려받은 돈이 원 기록의 달을 바꾸므로(ADR 0006), 월 요약은 원 기록의 달을 무효화해야 한다.
- 통계 질문 목록의 PoC(기록 100만 건, 큰 가구 10만 건)에서 월 통계는 수 ms였다. 가장 느린 것은 월별 자산 추이(10년치 438ms)이고, 요약 테이블을 넣는다면 첫 후보는 원 기록의 달 문제가 없는 **지갑 × 단위 × 월 변화량**이다(통계 질문 목록 2.1).

## 9. 가구원이 나갈 때

정책은 지도의 fog("가구원 나가기·계정 삭제")에서 정한다. 이 스키마는 그 정책이 무엇이 되든 기록이 깨지지 않게 하는 장치만 둔다.

- 소유자·작성자 칸은 사용자가 아니라 `household_members` 행을 가리키고, 멤버 행은 지우지 않는다(5.6). 방향은 "기록은 남기고 사람은 가린다"이다.
- 다리가 있는 지갑은 지울 수 없고 보관(`archived_at`)만 된다(5.8). 그래서 나간 사람의 지갑을 가리키는 공용 기록이 깨지지 않는다.
- 세션과 MCP 토큰은 나갈 때 무효화한다(서버 아키텍처 15번).
- fog에서 정할 것: 나간 사람의 개인 장부 기록(남겨서 지갑 잔액을 지킬지, 지우고 잔액 맞춤으로 대신할지), 숨긴 지갑, 감사 기록 속 개인 장부 내용, 개인정보 삭제 요청과의 관계, 데이터를 들고 새 가구로 옮기기.

## 10. 다른 티켓에 넘기는 것

- **기존 데이터 → 새 스키마 매핑과 검증**: [기존 데이터 전환](legacy-migration.md)에서 정했다. `ledgers.archived_at`을 더했다.
- **시세 데이터 공급원 선택**: `fx_rates`의 출처(그날 기준환율), 종가·배당 일정의 출처.
- **MCP 툴 설계**: MCP 쓰기의 중복 방지 키 정책, 감사 기록 기반 되돌리기.
- **통계 화면 구성**: 원화 환산 규칙(4.3). 질문 목록과 요약 테이블 판단은 [통계 질문 목록](stats-questions.md)에서 정했다.
- **가구원 나가기·계정 삭제**(새 fog): 9절의 남은 질문.
- **구현 전 확인**: 세율과 `rounding_mode` 실제 값(농특세, SEC fee, 코넥스, ETF·ETN, NXT), KIS 배당 API 필드, 특일 정보 API의 대체·임시공휴일 필드, 미국 T+1 결제 규정.
