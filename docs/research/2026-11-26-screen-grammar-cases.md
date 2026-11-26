# 화면 문법 사례·원칙 조사: 카드와 평면, 홈의 주인공

- 날짜: 2026-11-26
- 티켓: [주요 화면 시안: 홈·분석·자산·투자·입력 퍼널·나만 보기](https://github.com/Gn0lee/oat/issues/538)
- 결과 문서: [화면 문법](../design/screen-grammar.md)
- 시안: [2026-11-26-screen-mockups-poc/mockups](2026-11-26-screen-mockups-poc/mockups/)
- 한계: 앱별 실제 화면 구성(토스·카카오뱅크·뱅크샐러드·Monarch 등)을 글로 확인한 출처는 찾지 못했다. Mobbin 커넥터는 인증이 없어 쓰지 못했다. "추정"으로 표시한 것은 실기기 캡처로 확인할 거리다.

## 1. 토스 TDS 실제 값 (npm `@toss/tds-react-native@2.0.5` 소스)

문서 페이지에는 숫자가 없어 공개 패키지 소스에서 뽑았다.

- **Border** ([문서](https://tossmini-docs.toss.im/tds-react-native/components/border/)): 세 종류. 항목 사이는 `full`(화면 폭 hairline) 또는 `padding24`(왼쪽 24 들여쓴 hairline, 오른쪽 끝까지). "구간을 나눈다면 `height16`" — 높이 16 면, 색 `greyBackground`(라이트 `#f2f4f6`, 다크 `#101013`). 선 색 `greyOpacity300` `rgba(0,29,58,0.18)`.
- **List**: 줄 구분 기본값 `rowSeparator: "indented"`(= `padding24` 선).
- **ListRow**: 좌우 24, 위아래 기본 24(8/16/32), 눌림 radius 12.
- **ListHeader** ([문서](https://tossmini-docs.toss.im/tds-react-native/components/list-header/)): 위 24, 아래 8, 좌우 24.
- **Top**: 좌우 24. 토스 화면 문법은 모든 요소가 같은 24 시작선이다.
- TDS Mobile(웹) 문서: ListRow `horizontalPadding` small 20 / medium 24, `verticalPadding` 8/12/16/24. Bottom CTA 아래 여백 `max(safe-area, 20px)`. 색 팔레트 `orange500 #fe9800`, `yellow500 #ffc342`, `greyOpacity700/800`(가림막 후보, 용도 명시 없음). [Colors](https://tossmini-docs.toss.im/tds-mobile/foundation/colors/), [ListRow](https://tossmini-docs.toss.im/tds-mobile/components/ListRow/list-row-overview/)

## 2. 카드를 언제 쓰나

- Material M1: 같은 종류가 반복되면 카드가 아니라 목록. 줄마다 카드를 씌우면 훑어보기를 방해한다. [M1 Cards](https://m1.material.io/components/cards.html)
- NN/g: 카드는 성격이 서로 다른 항목에 맞고, 비슷한 항목은 세로 목록이 낫다. 카드는 훑어보기 어렵고 공간을 더 쓴다. [Cards Component](https://www.nngroup.com/articles/cards-component/)
- 카드 안 카드 금지: Trimble Modus, Persona, ServiceTitan Anvil. Polaris는 안쪽 면 radius를 바깥보다 크게 하지 말라. [Modus](https://modus.trimble.com/components/mobile/cards), [Persona](https://design.withpersona.com/components/card), [Anvil](https://anvil.servicetitan.com/docs/web/components/card/design), [Polaris](https://polaris.shopify.com/design/layout/spacial-organization)
- 카드 남용(Dave Rupert): 모바일에서 여백이 두 번 들어가 폭을 먹고, 모든 것이 테두리를 원하게 되고, 카드가 "작은 웹페이지"가 된다. 카드는 미리보기로. [Pitfalls of Card UIs](https://daverupert.com/2018/04/pitfalls-of-card-uis/)
- 반론: 문제는 카드가 아니라 위계. [Elezea](https://elezea.com/2015/02/ui-card-issues/)

## 3. 주인공 하나와 바탕

- **공통 영역**(NN/g): 같은 경계 안이면 한 묶음으로 보이고, 근접보다 강하다. 장식용 상자는 어수선하고 여백만으로도 묶을 수 있다. [Common Region](https://www.nngroup.com/articles/common-region/)
- **시각 위계**(NN/g): 모든 것을 대비시키면 아무것도 눈에 띄지 않는다. 큰 요소는 2개 이하. [Visual Hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)
- **고립 효과**: 비슷한 것들 사이의 다른 하나가 기억에 남는다. 고른 요소가 많아야 효과가 난다. [Laws of UX](https://lawsofux.com/von-restorff-effect/)
- **Apple HIG 배경색**: system과 grouped 두 묶음. Primary는 화면 전체, Secondary는 화면 안에서 내용을 묶을 때. 회색 grouped 바탕 위 흰 묶음은 Apple의 정석 구조다. 다크에서는 base가 어둡고 elevated가 밝다. [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- **Material 3 면 단계**: surface container lowest → highest로 강조가 커지고, high는 강조가 높은 컴포넌트용. [Tone-based surface color](https://material.io/blog/tone-based-surface-color-m3)
- **Apple Liquid Glass**: 강조가 정말 필요한 요소에만 색을 쓴다.
- **대시보드**(Stephen Few, 2차 자료): 가장 중요한 것을 가장 크게, 가장 눈에 띄는 자리에. 핵심 아닌 정보는 줄인다. [Fairfax County 요약](https://www.fairfaxcounty.gov/euclid/help/en/dashboards/10.9.1/reference/author-effective-dashboards.htm)

## 4. 금융 앱

- 토스 홈 개편(2021): 계좌를 그룹으로 나누고 소비·리포트를 홈으로. 레이아웃 수치 없음. [토스피드](https://toss.im/tossfeed/article/new-home)
- 토스 "하나만 추천": 카드 여러 장보다 1등 한 장의 전환이 높았다(변수 통제 한계를 글이 밝힘). [toss.tech](https://toss.tech/article/recommend-just-one)
- Monzo 홈: "단순함은 없애는 게 아니라 복잡함에 질서를 주는 것". 초기 시안은 압도적이라는 반응. [Monzo](https://monzo.com/blog/how-we-built-the-new-home-screen)
- Revolut 7.0: 홍보 카드가 거래보다 앞에 오자 반발. [커뮤니티](https://community.revolut.com/t/ui-overhaul/147896?page=8)
- Copilot: 대시보드는 요약 카드와 진행 막대, 거래는 날짜별 목록. [리뷰](https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/)
- 추정(출처 없음): 토스 홈은 회색 바탕 위 흰 카드, 상세·내역은 흰 바탕 + 16 띠.

## 5. 사용자 캡처로 본 국내 앱 (2026-11-26)

캡처 폭 920px을 화면 폭 393pt로 나눠(약 2.34배) 잰 값이다.

| | 토스 홈 | 카카오뱅크 홈 | 현대카드 홈 | 토스 통장 화면 |
|---|---|---|---|---|
| 바탕 | 연한 회색 | 거의 흰색 | 연한 회색 | 상단 바는 회색, 내용은 흰 면 |
| 구분 | 흰 카드 연달아 6장+ | 흰 카드 연달아 4장+ | 큰 흰 카드 연달아 | 높이 약 16 회색 띠, 띠 아래 작은 회색 섹션 제목("추천") |
| 카드 바깥 / 안 / 사이 / 모서리 | 약 12 / 20 / 10 / 18 | 약 16 / 17 / 9 / 19 | 약 20 / 24 / 24 / 17 | — |
| 주인공 표시 | 없음(같은 무게) | 통장 카드만 노란 색조 | 다음 명세서 금액을 아래 고정 판으로 | — |
| 상자 없는 내용 | 없음 | 맨 위 홍보 문구 | 홍보 문구 | — |

- 토스 금액 줄 "+이자 134원"이 파랑이다(ADR 0033과 같은 문법).
- 토스 "10일 지남"은 빨강 글자 + 연한 빨강 띠다. oat는 기한 지남에 주황 `warning`을 쓴다(화면 문법 7.1).
- 카드 안 행동은 회색 알약(`송금`)·연파랑 알약(`보기`)이고 큰 주 버튼은 없다.
- 토스 통장 화면의 섹션 안 얇은 선("더 보기" 위)은 양쪽을 띄운다.
- 결론: 홈에 카드를 연달아 쓰는 것은 국내 금융앱의 표준이고, 분산을 막는 것은 카드 수가 아니라 위계(주인공 하나만 다르게, 한 줄 정보는 상자 없이)다.

## 6. TDS 색 패키지 (`@toss/tds-colors`)

- 가림막: `lightThemeBackgroundDimmed` `rgba(0,0,0,0.2)`, `darkThemeBackgroundDimmed` `rgba(0,0,0,0.56)` → oat `scrim`.
- 줄 누름 류: `greyOpacity100` `rgba(2,32,71,0.05)`, 다크 `whiteOpacity100` `rgba(217,217,255,0.11)` → oat `pressed`(우리 `text` 색으로 5% / 11%).
- 회색: `grey100` `#f2f4f6`(=`greyBackground`), `grey200` `#e5e8eb`(라이트 hairline), `grey400` `#b0b8c1`, `grey900` `#191f28`. 다크 띠 `#101013`, 다크 바탕 `#17171c`, 층 `#202027`·`#2c2c35`.
- 주황: `orange50` `#fff3e0`(→ `warning-soft`), `orange500` `#fe9800`. 다크 `darkThemeOrange50` `#3d2500`, `700` `#ffa861`(→ 다크 `warning`). 라이트 `warning` 글자는 대비 때문에 TDS보다 진한 `#A85400`.
