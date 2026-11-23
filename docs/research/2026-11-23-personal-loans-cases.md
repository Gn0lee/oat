# 개인 가계부 앱의 "가구 밖 개인 간 빌려준 돈·빌린 돈" 기록 방식 조사

조사일: 2026-11-23. 방법: 웹 검색과 공식 문서·도움말·포럼 열람. 직접 열어 확인한 것에만 출처를 달았고, 확인하지 못한 것은 "미확인"으로 표시했다. 일부 사이트(Firefly III 문서 일부, Monarch 도움말)는 자동 열람이 막혀 검색 요약에 의존했으며, 해당 칸에 따로 표시했다.

## 1. 요약

1. 서구 가계부 앱은 대부분 빌려준 돈을 "지출"이 아니라 "내 자산(받을 돈)으로 옮긴 이체"로 기록하라고 안내한다. YNAB, GnuCash, Firefly III가 공식 문서로 이를 확인했다.
2. 전용 기능이 있는 앱은 Firefly III(liability + 방향)뿐이다. 나머지는 수동 자산 계좌로 우회하며, Splitwise는 "상대가 전액을 갚아야 하는 지출"로 우회한다.
3. 일부 상환은 "이체를 나눠 하면 잔액이 줄어드는" 방식이 일반적이다. 이자는 Firefly III와 GnuCash만 문서에 예시가 있고, 탕감은 Firefly III만 명시한다(지출 계정 "loan forgiveness"로 보냄). GnuCash 문서는 탕감을 다루지 않는다.
4. 국내 범용 가계부(편한가계부·뱅크샐러드·토스)는 채권·채무 전용 기능을 공식 자료에서 확인하지 못했다("미확인"). 국내에서 상대·상환 기한을 붙이는 앱은 "빌린 돈·빌려준 돈" 전용 앱(페이노트 등)이다.
5. 회계로는 원금은 자산(대여금)·부채(차입금)이고, 이자만 손익이며, 회수 불능은 대손(손실), 빌린 쪽의 면제는 이익이다. 한국에서는 면제가 증여세 문제가 될 수 있다.

## 2. 앱별 비교표

"미확인"은 이번 조사에서 공식 자료로 확인하지 못했다는 뜻이다(기능이 없다는 뜻이 아니다).

| 앱 | 빌려준 돈 기록 위치 | 상대 붙임 | 일부 상환 | 이자 | 탕감 처리 | 순자산 포함 | 기한/알림 | 출처 |
|---|---|---|---|---|---|---|---|---|
| Firefly III | liability 계정(유형 Loan/Debt/Mortgage), 방향 "I am owed". 빌려줄 때 자산 계정에서 liability로 출금 | liability 계정 하나가 상대 하나(계정 이름으로 구분). 별도 "사람" 필드는 미확인 | 상환 거래마다 "amount due"가 줄어듦 | 자동 계산 안 함. 받은 이자는 수익 계정 "interest payments"에서 liability로 입금해 금액을 늘림 | liability에서 지출 계정(예: "loan forgiveness")으로 출금 | 현재 v6.0 기준 순자산에 자산으로 포함(v5.7은 달랐음. 서드파티 gist) | 미확인 | [how-to](https://docs.firefly-iii.org/how-to/firefly-iii/finances/liabilities/index.md), [개념](https://docs.firefly-iii.org/explanation/financial-concepts/liabilities/index.md), [순자산 gist](https://gist.github.com/JC5/909385c5086f9e07ba2c32e047446d68) |
| YNAB | 추적(tracking, 자산) 계정에 대출 전액을 시작 잔액으로. 정기 상환이면 예약 거래(inflow) | 계정 이름·메모에 상대 표기 | 상환액만큼 추적 계정에서 현금 계정으로 이체, 메모에 "Paid/Owes" 갱신 | 문서에 없음 | 문서에 없음 | 추적 계정은 예산에는 미포함(순자산 화면 포함 여부는 미확인) | 예약 거래가 등록부에 떠서 "연락 알림" 역할 | [YNAB 대여 안내](https://support.ynab.com/en_us/tracking-loans-to-family-and-friends-rkOkPvYPgx.md) |
| Monarch Money | 공식 안내 미확인. 수동 계정(자산)으로 추정 | 미확인 | 미확인 | 미확인 | 미확인 | 계정별 "Exclude account balance"로 순자산 제외 가능 | 미확인 | [계정 편집](https://help.monarch.com/hc/en-us/articles/360058636951-Edit-Accounts) (검색 요약 기반) |
| Actual Budget | 공식 안내 미확인. 문서상 오프 예산(off budget) 계정은 예산에 영향이 없고 잔액만 추적(투자·모기지 용도) | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | [계정 개요](https://actualbudget.org/docs/accounts/overview/) |
| Lunch Money | 공식 안내 미확인. 수동 계정/자산으로 추가 가능 | 미확인 | 미확인 | 미확인 | 미확인 | 계정 유형에 따라 순자산 가감(검색 요약 기반, 직접 확인 못함) | 미확인 | [계정 추가](https://support.lunchmoney.app/setup/accounts/adding-accounts) |
| GnuCash | 자산 계정 "Money owed to you"(상대별 하위 계정) | 하위 계정 이름으로 상대 구분 | 상환마다 원금·이자를 나눠 기록, 잔액 감소 | 상환 분할 시 수익 계정(Income:Interest Income:상대)에 기록 | 이 가이드에는 없음. 일반 관행은 대손 비용 계정으로 대체(메일링 리스트) | 자산 계정이라 순자산에 포함 | 미확인 | [GnuCash 가이드](https://code.gnucash.org/docs/C/gnucash-guide/loans_personalLoanToSomeOne.html), [대손 메일링](https://lists.gnucash.org/pipermail/gnucash-user/2019-April/083988.html) |
| Splitwise | 전용 대여 기능 없음. 지출을 추가하고 상대가 전액 부담하도록 지정 | 친구/그룹 단위로 상대가 곧 사람 | "Settle up"에서 현금 지급 기록. 부분 정산은 요청 중인 기능 | 미확인 | 선물·면제 옵션 없음(요청 게시글 존재) | 해당 없음(자산 앱 아님) | 미확인 | [Lending 답변](https://feedback.splitwise.com/forums/162446-general/suggestions/15273705-lending), [현금 기록](https://feedback.splitwise.com/forums/162446-general/suggestions/3911935-be-able-to-say-someone-paid-you-in-cash-even-if-th) |
| 편한가계부 (Realbyte "Money Manager"의 한국 앱) | 채권·채무 전용 기능은 미확인. 계좌 그룹, 자산 간 이체, 거래처 통계가 있다고 소개됨 | 거래처 통계는 있으나 대여 상대 기능은 미확인 | 미확인 | 미확인 | 미확인 | 전체 자산 현황 표시. 대여금이 들어가는지는 미확인 | 일반 알림 기능만 소개. 상환 기한 알림은 미확인 | [앱스토어 설명](https://apps.apple.com/us/app/%ED%8E%B8%ED%95%9C%EA%B0%80%EA%B3%84%EB%B6%80-%EA%B4%91%EA%B3%A0%EC%A0%9C%EA%B1%B0/id564730202?l=ko) |
| 머니매니저 (Realbyte) | 위 편한가계부와 같은 회사 앱으로 보이나, 대여·대출 기능 문서는 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | [앱스토어](https://apps.apple.com/app/id560481810) |
| 뱅크샐러드 | 미확인(수동 대여금 등록 도움말을 못 찾음) | 미확인 | 미확인 | 미확인 | 미확인 | 월간 머니리포트가 계좌·투자·부동산 등 항목별 순자산을 보여준다고 보도됨. 대여금 항목은 미확인 | 미확인 | [SBS Biz](https://biz.sbs.co.kr/amp/article/20000338661) |
| 토스 | 미확인(가계부에 대여금 등록 기능 자료 없음) | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | [토스 자산관리](https://toss.im/service/asset-management) |
| 똑똑가계부 | 미확인(앱스토어 검색에서 편한가계부 제목에 이름만 나옴) | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | [편한가계부 앱스토어](https://apps.apple.com/kr/app/%ED%8E%B8%ED%95%9C%EA%B0%80%EA%B3%84%EB%B6%80-%EB%98%91%EB%98%91%EA%B0%80%EA%B3%84%EB%B6%80-%EC%9A%A9%EB%8F%88-%EA%B8%B0%EC%9E%85%EC%9E%A5-%EC%8B%AC%ED%94%8C%ED%95%9C-%EA%B0%80%EA%B3%84%EB%B6%80/id6444122615) |
| (참고) 페이노트 | 빌린 돈·빌려준 돈 전용 앱 | 거래 단위 기록(상대 필드는 미확인) | 앱스토어 리뷰에 "일부 상환도 되면 좋겠다"는 요청이 있어 미지원으로 보임(2025-08, 리뷰 기반) | 미확인 | 미확인 | 해당 없음(전용 앱) | 상환 기한 설정 가능 | [앱스토어](https://apps.apple.com/kr/app/%ED%8E%98%EC%9D%B4%EB%85%B8%ED%8A%B8-%EB%B9%8C%EB%A6%B0-%EB%8F%88-%EB%B9%8C%EB%A0%A4%EC%A4%80-%EB%8F%88-%EA%B8%B0%EB%A1%9D%ED%95%98%EB%8A%94-%EA%B0%80%EA%B3%84%EB%B6%80-%EC%95%B1/id6741191038) |

## 3. 앱별 짧은 설명

### Firefly III
- 문서는 liability를 두 방향으로 나눈다. 내가 갚을 돈("You owe money")과 상대가 나에게 갚을 돈("I am owed money")이다. 유형은 Loan, Debt, Mortgage 세 가지이고 신용카드는 liability로 보지 않는다. ([how-to](https://docs.firefly-iii.org/how-to/firefly-iii/finances/liabilities/index.md))
- 받을 돈은 "I am owed amount" 초기값으로 시작하거나(이 금액은 거래 내역이 없음), 자산 계정에서 liability로 출금해 만든다. 추가로 빌려주면 같은 출금을 더 한다. 상환은 liability에서 자산 계정으로 입금이다. 문서는 "amount due"가 줄어든다고 설명한다. ([개념](https://docs.firefly-iii.org/explanation/financial-concepts/liabilities/index.md))
- 이자: liability에 이율을 넣을 수 있지만 이자를 자동으로 계산하지 않는다. 내가 이자를 받으면 수익 계정(예: "interest payments")에서 liability로 입금해 받을 금액을 늘린다. 이자를 받을 때 손익으로 어떻게 보이는지(수익 계정 입금이므로 수입 집계에 잡힐 것으로 보이나 문서에는 명시가 없음)는 미확인.
- 탕감: 문서가 직접 다룬다. "일부를 탕감하고 돌려받지 않을 때"는 liability에서 새 지출 계정(예: "loan forgiveness")으로 출금한다. 즉 탕감액은 지출로 잡힌다.
- 순자산: 서드파티 gist 기준 v6.0에서는 liability 잔액이 자산으로 순자산에 들어가고, v5.7에서는 "주머니" 모델이라 달랐다. 공식 문서에서 최신 버전 동작을 직접 확인하지는 못했다. 대시보드 노출 방식은 미확인. ([gist](https://gist.github.com/JC5/909385c5086f9e07ba2c32e047446d68))
- 참고: 환급 튜토리얼은 친구가 대신 갚은 지출을 원 지출에서 빼는 방식과 수입으로 보는 방식 중 선택이라고 설명한다. 이는 대여가 아니라 더치페이 사례다. ([refund](https://docs.firefly-iii.org/tutorials/finances/refund/index.md))

### YNAB
- 두 가지를 권한다. 정기 상환이면 예약 거래(inflow)로 등록하고, 장기 대여면 추적(자산) 계정에 전액을 시작 잔액으로 둔다. 상환을 받으면 추적 계정에서 현금 계정으로 이체하고, 잔액이 0이면 완납이다.
- 일부 상환은 메모에 "Paid/Owes"를 갱신하거나 이체액만큼 잔액을 줄이는 방식이다.
- 이자와 탕감은 이 문서에 없다. Loan Planner는 "내가 빌린 빚" 전용이라 빌려준 돈에는 쓰지 말라고 명시한다. ([출처](https://support.ynab.com/en_us/tracking-loans-to-family-and-friends-rkOkPvYPgx.md))

### Monarch Money, Actual Budget, Lunch Money
- 세 앱 모두 "친구에게 빌려준 돈"을 직접 다룬 공식 도움말은 찾지 못했다(미확인). 아래는 일반 기능 문서에서 확인한 것만이다.
- Monarch: 계정마다 자산/부채를 지정하고, 계정별로 순자산에서 제외할 수 있다. ([Edit Accounts](https://help.monarch.com/hc/en-us/articles/360058636951-Edit-Accounts))
- Actual: 오프 예산 계정은 예산에 영향이 없고 거래를 분류할 수 없으며 잔액만 추적한다. 투자·모기지용으로 소개된다. ([문서](https://actualbudget.org/docs/accounts/overview/))
- Lunch Money: 수동 계정/자산을 만들 수 있다. 계정 유형이 순자산 가감을 정한다는 설명은 검색 요약에서만 확인했다. ([문서](https://support.lunchmoney.app/setup/accounts/adding-accounts))
- 어느 앱이든 "이 방식을 쓰면 된다"는 말은 추정이므로 보고서의 결론에는 쓰지 않았다.

### GnuCash
- 2,000달러를 빌려주면 은행 계정에서 자산 계정 "Money owed to you"(상대별 하위 계정)로 옮긴다. 상환은 원금과 이자로 쪼개며, 이자는 Income:Interest Income:상대 계정에 기록한다. 가이드의 예: 첫 상환 이자 8.33, 원금 107.23. ([가이드](https://code.gnucash.org/docs/C/gnucash-guide/loans_personalLoanToSomeOne.html))
- 이 가이드에는 탕감·대손이 없다. 메일링 리스트에는 대손을 "채권 계정에서 대손 비용(Expense:Bad Debts) 계정으로" 옮기라는 답이 있다. 사업 청구서 맥락이며 개인 대여에 대한 공식 가이드는 아니다. ([메일링](https://lists.gnucash.org/pipermail/gnucash-user/2019-April/083988.html))

### Splitwise
- 대여와 더치페이를 구분하는 전용 기능은 없다. 운영 측 답변은 "대여는 고려했지만 추가할 계획이 없고, 상대가 전액을 갚아야 하는 지출로 기록하라"는 것이다. 즉 대여를 지출 형태로 우회하며, 기록상 더치페이와 구분되지 않는다. ([Lending](https://feedback.splitwise.com/forums/162446-general/suggestions/15273705-lending))
- 갚기: "Settle up"에서 현금 지급 기록을 선택한다. 이는 지출이 아니라 정산(payment)이다. ([cash payment](https://feedback.splitwise.com/forums/162446-general/suggestions/3911935-be-able-to-say-someone-paid-you-in-cash-even-if-th))
- 부분 정산, 선물(갚지 않아도 되는 지급)은 사용자 요청 게시글이 있어 정식 기능으로 보이지 않는다(요청 게시글 존재만 확인, 현재 상태는 미확인). ([부분 정산 요청](https://feedback.splitwise.com/forums/162446-general/suggestions/8278218-allow-partial-settlement-of-bills), [선물 요청](https://feedback.splitwise.com/forums/162446-general/suggestions/6681329-allow-gift-payments-that-don-t-need-to-be-paid-bac))
- YNAB 문서도 Splitwise 연동 가이드를 따로 둔다(내용은 이번에 열람하지 않음). ([YNAB Splitwise](https://support.ynab.com/en_us/splitwise-and-ynab-a-guide-H1GwOyuCq.md))

### 국내 앱
- 편한가계부: 앱스토어 설명에서 확인되는 것은 계좌그룹 추가·삭제·편집, 자산 간 이체·자동이체, 거래처 통계, 알림, 통장 잔액과 전체 자산 현황이다. "빌려준 돈/채권/채무" 문구는 설명에 없으며, 기능 유무는 미확인이다. App Store 상 같은 Realbyte 앱(id560481810)이 영문 "Money Manager"로 올라 있어 머니매니저와 같은 앱 계열로 보인다(동일 앱 여부는 앱 설명 일치로 추정). 똑똑가계부는 별도 정보를 못 찾았다. ([설명](https://apps.apple.com/us/app/%ED%8E%B8%ED%95%9C%EA%B0%80%EA%B3%84%EB%B6%80-%EA%B4%91%EA%B3%A0%EC%A0%9C%EA%B1%B0/id564730202?l=ko))
- 뱅크샐러드, 토스: 연동 자산 위주 서비스이며 개인 간 대여금을 등록하는 기능에 대한 공식 자료를 찾지 못했다(미확인). ([뱅크샐러드 보도](https://biz.sbs.co.kr/amp/article/20000338661), [토스](https://toss.im/service/asset-management))
- 전용 앱 시장은 따로 있다. 페이노트는 빌린 돈·빌려준 돈 기록과 상환 기한 설정을 소개하고, 정산 완료/미완료를 구분한다. 같은 앱 리뷰에 일부 상환 요청이 있다. 돈워리, 빌빌, IOUly 같은 비슷한 앱도 스토어에 있다(세부 기능 미확인). ([페이노트](https://apps.apple.com/kr/app/%ED%8E%98%EC%9D%B4%EB%85%B8%ED%8A%B8-%EB%B9%8C%EB%A6%B0-%EB%8F%88-%EB%B9%8C%EB%A0%A4%EC%A4%80-%EB%8F%88-%EA%B8%B0%EB%A1%9D%ED%95%98%EB%8A%94-%EA%B0%80%EA%B3%84%EB%B6%80-%EC%95%B1/id6741191038))

## 4. 회계 개념 (가계부 관점)

대여금(받을 돈)은 내 자산이고, 차입금(갚을 돈)은 내 부채다. 돈을 빌려주거나 갚는 것은 자산·부채의 위치만 옮기는 거래라 손익(지출·수입)이 아니다. 그래서 위 앱들도 대부분 빌려줄 때를 "이체"로 다룬다. 손익에 닿는 것은 이자뿐이다. 받은 이자는 수익(이자수익), 낸 이자는 비용(이자비용)이다. Firefly III와 GnuCash가 이자를 별도 수익 계정으로 쪼개는 것도 같은 이유다.

회수할 수 없게 된 대여금은 자산이 사라지는 것이므로 대손(손실)으로 처리한다. 앱에서는 Firefly III가 "loan forgiveness" 지출 계정으로, GnuCash가 대손 비용 계정으로 옮기는 방식이 이에 해당한다. 반대로 빌린 쪽이 채무를 면제받으면 갚을 의무가 사라지는 만큼 이익(채무면제이익)이 된다. 일반 개념 설명은 회계 교재 수준의 상식이며, 이번 조사에서 K-IFRS·일반기업회계기준 원문은 열람하지 못했다(원문 조항은 미확인). 한국 세법 맥락에서 확인된 것: 대금업을 표방하지 않은 개인이 받는 이자는 비영업대금의 이익으로 이자소득이며 원천징수세율 25%다([국세청 원천징수 세율 안내](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2415&cntntsId=7703), [소득세법 제129조](https://www.law.go.kr/LSW//lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000821176&lsId=001565&print=print)). 채권자가 채무를 면제해 주면 그 이익이 증여로 과세될 수 있다는 설명도 있다(상속세및증여세법 제36조, 검색 요약·해설글 기반이므로 세무사 확인 필요: [해설](https://ai.bznav.com/contents/3223758)). 개인 가계부가 세무 판단을 대신할 필요는 없다고 보이나, 이는 이 보고서의 의견이다.

## 5. 공통 패턴과 차이점

공통 패턴
- 빌려준 돈은 지출이 아니라 자산(받을 돈)으로 옮기는 이체로 기록한다. (Firefly III, YNAB, GnuCash 공식 문서)
- 상환은 반대 방향 이체로 기록해 잔액이 줄어든다. 일부 상환은 별도 기능이 아니라 "이체를 여러 번"이다.
- 상대(사람)는 별도 엔티티가 아니라 계정/하위 계정 이름이나 메모로 표현하는 경우가 많다(Firefly III, GnuCash, YNAB).

차이점
- 방향 개념: Firefly III만 한 계정 유형에서 "받을 돈/갚을 돈"을 방향으로 구분한다. 나머지는 자산 계정과 부채 계정을 따로 쓴다.
- 이자: 자동 계산은 Firefly III도 하지 않는다(수동 입금). GnuCash는 상환 분할 때 이자 계정을 쓴다. YNAB 문서는 이자를 다루지 않는다.
- 탕감: 명시적 문서는 Firefly III(지출 계정으로 출금)뿐이다. YNAB는 문서에 없고 GnuCash는 가이드에 없다.
- 기한·알림: 범용 앱 중에서는 확인된 것이 없다(YNAB 예약 거래가 간접적). 국내에서는 전용 앱(페이노트)만 상환 기한을 문서화했다.
- Splitwise는 "자산" 개념 없이 상대와의 잔액만 관리하며, 대여는 더치페이와 같은 지출 형태로 우회한다.

미확인으로 남은 것
- Monarch, Actual, Lunch Money의 대여금 권장 방식(공식 자료 없음).
- 편한가계부·머니매니저·뱅크샐러드·토스·똑똑가계부의 채권·채무 기능 유무와 기한 알림.
- Firefly III 최신 버전의 대시보드·순자산 표시를 공식 문서로 직접 확인한 것.
- 회계기준 원문과 세법 조문의 직접 확인(개인 간 대여 탕감 시 증여 판단 기준 등).
