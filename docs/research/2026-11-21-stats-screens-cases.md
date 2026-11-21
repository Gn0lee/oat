# 통계·홈 화면 사례 조사

조사일: 2026-11-21 · 범위: 웹 조사만(앱 직접 실행 없음)

표기: **[1차]**는 공식 도움말·공식 문서·공식 블로그·앱스토어 설명에서 확인한 것, **[2차]**는 리뷰·블로그·제3자 정리로만 본 것, **미확인**은 공개 자료로 확인하지 못한 것이에요. 스크린샷을 직접 본 것은 없어서 차트 모양은 대부분 문서 문장 기준이에요.

## 요약표

| 앱 | 소비 vs 자산 위치 | 월초(1~5일) 비교 방식 | 카테고리 차트 | 가구 공유·프라이버시 | 시세 기준 시각 |
|---|---|---|---|---|---|
| 토스 | 홈에 자산+소비 함께, 소비 상세는 홈 안 | 예상지출(월말 예측), 월간 리포트는 전월 대비 | 도넛 [1차, 2019 예시] | 해당 없음(개인) | 미확인 |
| 뱅크샐러드 | 하단 카테고리 자산/가계부 분리 | 월간 리포트 전월 대비. 같은 날 비교 미확인 | 미확인 | 해당 없음 | 미확인 |
| 편한가계부 = Money Manager(Realbyte) | 가계부·통계·자산 탭 | 예산 기반(주·월·년). 같은 날 비교 미확인 | 원형(파이) + 카테고리 선 그래프 | 해당 없음 | 해당 없음(수기) |
| Monarch | 대시보드 위젯형, 순자산은 Accounts | 미확인(월간 progress 카드, 지출 평균) | 리포트에 트리맵 등 | **모두 보임**, 소유자 라벨로 필터만 | 미확인 |
| Copilot | 대시보드/카테고리/투자 탭 | **이상 속도 점선 vs 실제 누적 실선**, MTD vs 전월 MTD | 카테고리별 진행 막대 + 색 | 같은 로그인 공유(권한 분리 없음) | Last Price 약 15분 지연, 보유는 하루 1회 |
| YNAB | Plan 중심, 리포트는 Reflect | 예산(봉투) 기반, 속도 차트 없음 | Spending Breakdown(모양 미확인) | 플랜 단위 공유, 공유 플랜은 전부 보임 | 해당 없음 |
| Rocket Money | 대시보드, 순자산은 More 아래 | Safe to Spend(다음 월급까지) | 미확인 | 파트너는 연결 계좌 전부 보고 관리 | 미확인 |
| Honeydue | 커플 공용 대시보드 | 미확인 | 미확인 | **계좌별 3단계: 잔액+거래 / 잔액만 / 없음** | 해당 없음 |
| 가계부부(국내 부부) | 통계 탭 | 예산 사용률 색 | 기간별·카테고리별 그래프 | 자산을 '비밀 자산'으로 숨김, 주체별 통계 | 해당 없음 |

## 1. 탭 구조, 소비 통계와 자산 통계의 위치

- **토스**: 2021-08 개편으로 "내 소비" 탭이 홈으로 들어왔어요. 홈에서 자산(입출금·저축·투자·대출을 유형별로 묶고 총액), 소비(월 합계를 달력·타임라인으로), 납부 리마인더를 함께 보여줘요. 신용점수·보험 등은 "전체" 탭으로 갔어요. [1차] [토스피드 new-home](https://toss.im/tossfeed/article/new-home). 공식 서비스 페이지는 "소비 캘린더"와 "소비 분석(지난달보다 얼마나 더 썼고 어디에 가장 많이 썼는지)"을 소개해요. [1차] [toss.im 자산관리](https://toss.im/service/asset-management). 현재(2026) 하단 탭 구성은 **미확인**.
- **뱅크샐러드**: 상단 탭에 흩어진 서비스를 하단 카테고리 "자산, 가계부, 건강, 금융 매칭"으로 묶었어요(2021). [2차] [바이라인네트워크](https://byline.network/2021/09/31-95/). 현재 탭 구성은 **미확인**.
- **편한가계부**: 한국 App Store의 편한가계부(id560481810) 개발사가 Realbyte Inc.로, 영문 "Money Manager Expense & Budget"과 같은 앱이에요. 주·월·년 통계, 계좌별 통계, 달력, 자산 그룹, 복식부기식 계좌 반영을 내세워요. [1차] [App Store KR](https://apps.apple.com/kr/app/id560481810). 별개로 "편한가계부 - 똑똑가계부"(id6444122615)라는 다른 앱도 있어요. [1차] [App Store](https://apps.apple.com/kr/app/%ED%8E%B8%ED%95%9C%EA%B0%80%EA%B3%84%EB%B6%80-%EB%98%91%EB%98%91%EA%B0%80%EA%B3%84%EB%B6%80-%EC%9A%A9%EB%8F%88-%EA%B8%B0%EC%9E%85%EC%9E%A5-%EC%8B%AC%ED%94%8C%ED%95%9C-%EA%B0%80%EA%B3%84%EB%B6%80/id6444122615)
- **Monarch**: 대시보드가 위젯형이고 순서 변경·제거가 돼요(순자산, 최근 거래, 투자 성과 등). [1차] [monarch.com/features/dashboard](https://www.monarch.com/features/dashboard), [Customize Your Dashboard](https://help.monarch.com/hc/en-us/articles/360058127551-Customize-Your-Dashboard)
- **Copilot**: iOS에서 Dashboard가 기본 홈 탭이고 Settings > Appearance > App sections에서 탭 순서를 바꿀 수 있어요. 별도 Categories, Cash Flow, Investments 탭이 있어요. [1차] [Dashboard tab](https://help.copilot.money/en/articles/6045480-dashboard-tab)
- **YNAB**: 리포트는 Reflect에 있고, 모바일은 Net Worth, Spending Breakdown, Income vs. Spending(최근 6개월), Age of Money만 있어요. Spending Trends는 웹 전용. [1차] [Reflect in YNAB](https://support.ynab.com/en_us/reflect-in-ynab-B1GJsrWkj)
- **Rocket Money**: 순자산은 모바일 대시보드의 "More" → "Net Worth"로 들어가요. [2차] 검색 요약에 인용된 도움말 문장, 원문 미열람. Premium에서 월·연 지출 추이와 순자산 추이가 열린다는 리뷰가 있어요. [2차] [FinanceBuzz](https://financebuzz.com/truebill-review)

## 2. 첫 화면 숫자와 위계

- **Copilot Dashboard 순서**: ① 지출 그래프와 그 위 **Free to Spend**(예산 기준 남은 돈) → ② To Review(새 거래 확인) → ③ Budgets(추세 카테고리별 남은 돈) → ④ Upcoming(예정 정기결제 가로 스크롤) → ⑤ Net This Month(이번 달 누적 수입·지출 vs 전월 같은 시점까지). [1차] [Dashboard tab](https://help.copilot.money/en/articles/6045480-dashboard-tab). 예산을 끄면 맨 위 숫자가 "이번 달 지출(예정 정기결제 포함)", 그 아래 지난달 총액이에요. [1차] [Optional budgeting](https://help.copilot.money/en/articles/6282850-optional-budgeting)
- **토스**: 자산 총액·유형별 보유 → 월 소비 합계(달력/타임라인) → 리마인더 순으로 홈에 보여요. 즐겨찾기한 카드는 첫 화면에서 사용 금액을 바로 봐요. [1차] [new-home](https://toss.im/tossfeed/article/new-home), [토스피드 내 소비 활용기](https://toss.im/tossfeed/article/toss-user-interview-timeline)
- **Monarch**: 월별 순자산, 가용 저축, 이번 달 vs 지난달 지출, 최근 거래가 대시보드에 있다고 해요. [2차] [Motley Fool](https://www.fool.com/the-ascent/personal-finance/monarch-money-review). 월중엔 "[Month]'s progress", 지난 달은 "[Month]'s review" 카드가 붙어요. [2차] 검색 요약에 인용된 [Monthly Progress Report](https://help.monarch.com/hc/en-us/articles/4402543752468-Monthly-Progress-Report)(원문 403)
- **Rocket Money**: 핵심 숫자는 "Safe to Spend(다음 월급날까지 써도 되는 돈)". [1차] [Spending insights](https://www.rocketmoney.com/feature/spending-insights)
- **YNAB**: Home 탭에서 예상 수입이 카테고리를 다 덮는지 봐요(남은 할당 중심). [1차] [Reflect in YNAB](https://support.ynab.com/en_us/reflect-in-ynab-B1GJsrWkj)

## 3. 월초(1~5일) "이번 달 vs 평소/지난달" 처리 (핵심)

| 방식 | 사례 | 월초에 어떻게 보이나 |
|---|---|---|
| **선형 이상 속도선** | Copilot: 점선 = 예산(또는 지난달 총액)을 한 달에 고르게 펼친 선, 실선 = 실제 누적. 실선 끝점이 "오늘 기준 이상치"보다 위/아래인지로 색이 바뀜 | 1일에도 기준선이 0에서 시작하니 "작아서 무의미"한 문제가 없음. 대신 월초 월세 같은 큰 결제가 스파이크를 만들어서 **예정 정기결제는 차트에서 제외**하라고 안내 [1차] [Dashboard tab](https://help.copilot.money/en/articles/6045480-dashboard-tab), [Optional budgeting](https://help.copilot.money/en/articles/6282850-optional-budgeting) |
| **같은 날까지 누적 비교(MTD vs 전월 MTD)** | Copilot "Net This Month" | 수입·지출 둘 다 전월 같은 시점까지와 비교 [1차] 같은 문서 |
| **카테고리 속도 색** | Copilot Categories: 예산 대비 속도로 초록/노랑~주황/초과 시 빨강, 정기결제 예정분은 외곽선 막대 | 예산 없으면 전월과 비교 [1차] [Categories tab](https://help.copilot.money/en/articles/9504513-categories-tab-overview) |
| **월말 예측** | 토스 "예상지출"(이번 달 지출 예측), 평소보다 큰 비고정 지출은 빨간색 | 숫자 1개로 월말을 미리 보여줌. 계산식 **미확인** [1차, 2019 기사·예시 이미지] [토스피드](https://toss.im/tossfeed/article/toss-user-interview-timeline) |
| **최근 6개월 일별 기준** | PocketGuard Pace: 오늘까지 실제 지출 vs 과거 지출을 일별 표로, 최근 6개월 패턴 반영 | 월초 처리 방식 **미확인** [1차] [PocketGuard Pace](https://pocketguard.com/help/pace-metric-on-the-plan-tab/) |
| **같은 날 누적 선(Mint식)** | Simplifi 커뮤니티에서 "Mint에 있던 같은 날 누적 지출 선 차트"를 요청 | 사용자 수요가 있다는 근거 정도 [2차] [Simplifi community](https://community.simplifimoney.com/discussion/8563/add-mountain-chart-line-to-track-net-worth-monthly-spending) |
| **월 마감 후 리포트** | 뱅크샐러드 월간 머니리포트(2026-10): 수입·지출 전월 대비, 지출을 고정비/변동비로, 순자산 3개월 추이를 항목별로 | 월초 실시간 비교는 아님 [2차] [SBS Biz](https://biz.sbs.co.kr/amp/article/20000338661) |
| **달력에서 지난달 같은 시기 직접 보기** | 토스 사용자가 달력으로 지난달 비슷한 시기를 넘겨 봄 | 앱이 비교해주는 게 아니라 사용자가 비교 [1차, 사용자 인터뷰] [토스피드](https://toss.im/tossfeed/article/toss-user-interview-timeline) |
| 예산 기반 | YNAB, Money Manager(주·월·년 예산), 가계부부(예산 사용률 색) | 월초엔 "남은 예산"이 큼 |

Monarch의 누적 속도 차트 존재 여부는 **미확인**(공식 페이지·리뷰 어디에도 문장 없음).

## 4. 차트 종류

- **지출 속도**: Copilot은 누적 실선 + 이상 속도 점선 [1차]. 실시간 추정 잔액은 점선으로 표시한다는 설명이 투자 탭 문서에 있어요 [1차] [Investments tab](https://help.copilot.money/en/articles/5377645-investments-tab-overview).
- **카테고리**: 토스 도넛 [1차, 2019]. Money Manager는 파이 차트에 카테고리 비율(%)을 이름 옆에 쓰고, 목록에서 카테고리를 누르면 선 그래프(월별 추이) [2차, 공식 도움말 검색 요약, 원문 403] [Realbyte Stats Tab](https://help.realbyteapps.com/hc/en-us/articles/360045310273-Stats-Tab). Copilot은 지출 순 정렬된 카테고리 진행 막대 [1차]. Monarch 리포트에 트리맵 보기 [2차, 검색 요약].
- **순자산/자산 추이**: Monarch "Chart your net worth over time"(모양 미확인) [1차]. Copilot은 계좌 유형별로 쪼개 볼 수 있음 [2차] [Penny Hoarder](https://www.thepennyhoarder.com/budgeting/budgeting-copilot-money-review/). 뱅크샐러드는 3개월 추이를 항목별(계좌·현금, 투자, 연금, 페이머니, 포인트, 부동산, 자동차)로 [2차]. **누적 영역 vs 선**: 어느 앱이 어떤 모양인지 공개 문장으로는 **미확인**.
- **결제수단·구성원별**: 편한가계부 "카드/현금 지출 비중, 통장/카드별 지출금액" [1차 App Store]. 토스 "연결한 카드·계좌별" 소비 [1차]. 가계부부 "주체별" 상세(기록 보기 ↔ 카테고리별 보기 전환) [1차 App Store]. 차트 모양은 **미확인**.

## 5. 파트너 간 공용/개인 데이터

- **Monarch**: 공식 도움말은 "계좌나 거래를 숨길 수 없고, 가구에 초대하면 연결된 모든 계좌·거래를 볼 수 있다"고 해요. 눈 아이콘 숨김은 **내 목록·리포트·예산에서 빼는 기능**이지 파트너 비공개가 아니에요(NerdWallet은 비공개처럼 설명해 공식과 충돌). Shared Views는 계좌·거래에 mine/theirs/ours 라벨을 달고 거래는 계좌 라벨을 상속, 개별 수정 가능. Accounts·순자산, Reports, Cash Flow, Transactions에 "Owners" 필터가 생겼고 **예산 페이지는 아직 미지원**. 공동 계좌 잔액을 나눠 귀속하는 방식은 **미확인**. [1차] [Monarch 블로그 Shared Views](https://www.monarch.com/blog/shared-views), [2차] [Monarch for Couples](https://help.monarch.com/hc/en-us/articles/20926382202004-Monarch-for-Couples)(원문 403, 검색 요약), [NerdWallet](https://www.nerdwallet.com/finance/learn/monarch-money-app-review)
- **Honeydue**: 계좌마다 "잔액과 거래 모두 / 잔액만 / 아무것도" 중 고름. 사소한 소비로 다투는 커플엔 "잔액만"부터 권함. 리뷰들은 거래 1건 단위 숨김도 된다고 하나 공식 문서에선 **미확인**. → **공용 계좌 잔액은 보이되 거래는 가리는** 모델이 이 질문에 가장 가까운 선례. [1차] [Honeydue 도움말](https://support.honeydue.com/en/articles/3179542-will-my-partner-see-my-bank-account-balances-and-transactions), [2차] [Money Crashers](https://www.moneycrashers.com/honeydue-review/)
- **Copilot**: 다른 기기 로그인이나 Magic Link로 공유, 추가 기기는 계정 전체 권한. 공동 계좌는 한 번만 연결하라(중복 거래). 가구 예산은 기능 요청 상태. [1차] [Sharing your account](https://help.copilot.money/en/articles/4523792-sharing-your-account-with-a-partner), [로드맵](https://feedback.copilot.money/feature-requests/p/couplefamily-support-shared-budgets)
- **YNAB Together**: 플랜 단위로 공유 대상 선택, 공유 플랜은 모든 계좌·거래 편집 가능. 개인 것은 별도 플랜으로 분리. [1차] [YNAB Together](https://support.ynab.com/en_us/ynab-together-B1nS78Cki.md), [소개 글](https://www.ynab.com/introducing-ynab-together-for-your-shared-financial-journey/)
- **Rocket Money**: 각자 로그인, 파트너는 연결 계좌 전체의 예산·구독·거래를 보고 관리. 일부 계좌만 보이게 한다는 마케팅 글은 도움말과 불일치. [2차] [Account sharing](https://help.rocketmoney.com/en/articles/4562634-account-sharing)
- **가계부부(국내)**: 8자리 코드로 연결, 전체 실시간 공유가 기본. 자산을 "비밀 자산"으로 두면 나만 봄, 특정 자산 통계 제외, 기록은 주체별로 저장. [1차] [App Store](https://apps.apple.com/app/id6743708760). 너굴부부도 부부 각자 수입·지출 구분 [2차]. "쌀독"이라는 앱은 검색되지 않음(**미확인**).
- **결론**: "공용 카드 잔액에 파트너 개인 거래가 섞인 경우"를 명시적으로 다루는 공개 문서는 **찾지 못했어요**. 실제 선택지는 ① 다 보임(Monarch, Rocket, YNAB 공유 플랜) ② 계좌 단위 "잔액만"(Honeydue) ③ 자산 단위 숨김(가계부부) 세 가지예요.

## 6. 오래된·없는 시세 표시

- **Copilot**: Last Price 약 15분 지연(장중만, 코인은 24/7). 보유 내역은 장 마감 후 하루 1회, 그 사이 평가액은 최신 가격으로 추정. Live Balance Estimate를 켜면 점선으로 표시. 2일 넘게 안 갱신되면 문의하라고 안내. [1차] [Investments tab](https://help.copilot.money/en/articles/5377645-investments-tab-overview), [Live balance estimates](https://help.copilot.money/en/articles/5497913-live-balance-estimates), [Accounts FAQ](https://help.copilot.money/en/articles/10261860-accounts-faq)
- **토스증권**: 2021 출시 때 해외주식 무료 실시간 시세 보도 [2차] [비즈워치](https://news.bizwatch.co.kr/article/market/2021/11/02/0016). 현재 지연 표기 방식은 **미확인**.
- Monarch, 뱅크샐러드, Rocket Money의 "기준 시각/지연" 라벨은 **미확인**.

## 7. 접근성·색 기준

**WCAG 2.2 대비** [1차] [Understanding 1.4.3](https://w3c.github.io/wcag/understanding/contrast-minimum.html), [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- AA: 일반 글자 4.5:1, 큰 글자 3:1. AAA(1.4.6): 7:1 / 4.5:1. 차트 선·아이콘 같은 비텍스트(1.4.11) 3:1.
- 큰 글자 = **18pt 이상, 또는 14pt 굵게**. CSS pt 기준이고 1pt = 1.333px → 약 **24px / 18.5px**. 한중일 글꼴은 "해당 언어의 최소 큰 활자 크기 상당"이라고만 적고 숫자는 없음.
- iOS 매핑(해석, 공식 문서 아님): iOS의 pt는 CSS px와 같은 논리 단위로 취급하는 게 업계 관례라, iOS에선 **약 24pt Regular 또는 약 19pt Bold 이상**을 큰 글자로 보면 안전해요. 시스템 스타일로는 Title 2(22pt) Regular도 큰 글자에 못 미치고, Headline(17pt Semibold)은 일반 글자예요.

**Apple HIG** [1차] [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- iOS 기본 17pt, **최소 11pt**. 얇은 커스텀 글꼴이면 더 크게.
- Dynamic Type 기본(Large): Large Title 34, Title1 28, Title2 22, Title3 20, Headline 17 Semibold, Body 17, Callout 16, Subhead 15, Footnote 13, Caption1 12, Caption2 11.
- 시스템 글꼴은 Dynamic Type 자동 지원, 커스텀 글꼴은 직접 같은 동작 구현해야 함. 확대 200% 이상 지원 권장.

**상승 빨강 / 하락 파랑**
- TDS Mobile 공식 팔레트(라이트): red500 `#f04452`, red400 `#f66570`, blue500 `#3182f6`, blue400 `#4593fc`. 다크 모드 값은 **문서에 없음(미확인)**. [1차] [TDS Mobile Colors](https://tossmini-docs.toss.im/tds-mobile/foundation/colors/)
- 제3자 추정 토스 다크 팔레트: 배경 `#0F1115`/`#17171C`, 파랑 500 `#4795FF`, 에러 빨강 `#FF6B6B`. 비공식이고 상승/하락 전용 값은 아님. [2차] [오빠두 Toss Dark Mode](https://www.oppadu.com/tools/design-systems-site/brand/toss-dark-mode.html)
- 국내 증권 앱의 다크 모드 상승/하락 hex를 공개 문서로 밝힌 곳은 **찾지 못했어요**.

## oat에 주는 시사점

- **월초 속도 비교는 "누적 절대값"이 아니라 "같은 날 기준선 대비"로.** Copilot처럼 기준선(지난달 같은 날 누적 또는 평소 일평균 × 경과일)을 같이 그리면 1일에도 의미가 생겨요. 우리 결정(지난달 같은 날 누적)은 Copilot "Net This Month"와 같은 축이에요.
- **고정비·예정 결제는 속도선에서 빼거나 따로.** Copilot이 월초 월세 스파이크 때문에 정기결제를 차트에서 제외해요. oat는 "이번 달 남은 예정 결제"를 이미 보여주니, 속도선은 변동비만 그리는 옵션을 검토할 만해요.
- **월말 예측 숫자 1개(토스 예상지출)**는 월초에 노이즈가 크므로, 1~5일엔 숫자 대신 "아직 이른 시점" 문구나 기준선만 보이는 것을 고려.
- **카테고리 vs 평소**는 막대 + 속도 색(Copilot)이 도넛(토스·Money Manager)보다 "평소 대비"를 읽기 쉬워요. 도넛은 비중, 막대는 비교라는 역할 분리.
- **공용 지갑 잔액 + 파트너 개인 거래** 문제는 공개 선례가 Honeydue "잔액만" 하나예요. "잔액은 보이고, 내가 못 보는 거래 N건 있음"처럼 개수만 알리는 방식이 가장 가까운 확장이에요(선례 없음, 우리 판단 필요).
- **소유자 라벨은 필터이지 권한이 아님**(Monarch)을 반면교사로: oat는 RLS로 실제 비공개라서 "필터"와 "볼 수 없음"을 UI에서 구분해야 해요.
- **순자산을 추이 차트 선으로만** 두는 결정은 Monarch(순자산 위젯)·뱅크샐러드(리포트 안 추이)와 달리 홈 숫자 위계에서 빠지는 선택이에요. 선례상 무리는 없어요.
- **시세 기준 시각**: Copilot은 "약 15분 지연" + 추정치 점선으로 구분해요. oat도 평가액에 "○일 ○시 기준"과 추정/지연 표시(점선·흐린 색)를 붙이는 게 맞아요.
- **글자 크기**: 금액 큰 숫자는 24pt 이상이면 3:1, 그 밖의 보조 글자(Caption 11~13pt)는 4.5:1 필수. 11pt 미만 금지.
- **상승/하락 색**: 라이트는 TDS red500/blue500을 참고값으로 쓸 수 있으나 다크 값은 공개된 게 없어요. 다크 배경에서 4.5:1(작은 글자) 또는 3:1(큰 숫자·선)을 직접 검증해 정해야 해요.
