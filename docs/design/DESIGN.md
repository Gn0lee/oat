---
version: alpha
name: oat
description: 가족 가계부·자산 앱 oat의 디자인 토큰. 라이트·다크 쌍, 숫자가 주인공, Pine은 행동에만.
omitted:
  - section: spacing
    reason: "간격·여백은 다음 티켓 '주요 화면 시안'에서 정한다"
  - section: rounded
    reason: "모서리 반경은 다음 티켓 '주요 화면 시안'에서 정한다"
  - section: components
    reason: "컴포넌트 토큰은 다음 티켓 '주요 화면 시안'에서 정한다. 그때 함께 정할 색·글자: 주의색([지연] 배지·기한 지남), 시트·토스트 뒤 가림막, 줄 누름, 비활성 버튼 면, 버튼 라벨·탭 바 라벨·키패드 글자"
colors:
  primary: "#14573F"
  light:
    primary: "#14573F"
    on-primary: "#FFFFFF"
    primary-pressed: "#0E4431"
    primary-text: "#14573F"
    primary-soft: "#E6F0EB"
    background: "#F4F5F3"
    surface: "#FFFFFF"
    surface-alt: "#EFECEA"
    text: "#191F28"
    text-sub: "#5B6470"
    text-disabled: "#B0B8C1"
    divider: "#E5E8E6"
    border-strong: "#868E8A"
    danger: "#C81E2D"
    amount-income: "#1B64DA"
    amount-up: "#C81E2D"
    amount-up-display: "#F04452"
    amount-down: "#1B64DA"
    amount-down-display: "#3182F6"
    ledger-private: "#8E3B7E"
    ledger-private-soft: "#F7E8F3"
    chart-group-cash: "#EDB345"
    chart-group-saving: "#7A59C3"
    chart-group-invest: "#008B96"
    chart-group-point: "#ECB7DF"
    chart-group-lent: "#B66B31"
    chart-group-debt: "#8E9592"
    chart-dim: "#E5E8E6"
    chart-neutral: "#868E8A"
    chart-line: "#191F28"
    chart-reference: "#5B6470"
    chart-axis: "#868E8A"
  dark:
    primary: "#1F7A55"
    on-primary: "#FFFFFF"
    primary-pressed: "#186446"
    primary-text: "#5CC59A"
    primary-soft: "#1A2E25"
    background: "#121413"
    surface: "#1C1F1E"
    surface-alt: "#242826"
    text: "#E8EAE9"
    text-sub: "#8E9592"
    text-disabled: "#565C59"
    divider: "#2C302E"
    border-strong: "#767D7A"
    danger: "#FF6B6B"
    amount-income: "#4795FF"
    amount-up: "#FF6B6B"
    amount-up-display: "#FF6B6B"
    amount-down: "#4795FF"
    amount-down-display: "#4795FF"
    ledger-private: "#E7A3D8"
    ledger-private-soft: "#3A2335"
    chart-group-cash: "#F7C15F"
    chart-group-saving: "#886ACF"
    chart-group-invest: "#3FBFCC"
    chart-group-point: "#F8D0EE"
    chart-group-lent: "#D78951"
    chart-group-debt: "#6E7572"
    chart-dim: "#2C302E"
    chart-neutral: "#767D7A"
    chart-line: "#E8EAE9"
    chart-reference: "#8E9592"
    chart-axis: "#767D7A"
typography:
  amount-hero:
    fontFamily: Pretendard
    fontSize: 32px
    fontWeight: 700
    lineHeight: 42px
    letterSpacing: -0.5px
    fontFeature: '"tnum"'
  title-1:
    fontFamily: Pretendard
    fontSize: 26px
    fontWeight: 700
    lineHeight: 35px
  title-2:
    fontFamily: Pretendard
    fontSize: 22px
    fontWeight: 700
    lineHeight: 31px
  title-3:
    fontFamily: Pretendard
    fontSize: 20px
    fontWeight: 600
    lineHeight: 29px
  body:
    fontFamily: Pretendard
    fontSize: 17px
    fontWeight: 400
    lineHeight: 25.5px
  amount:
    fontFamily: Pretendard
    fontSize: 17px
    fontWeight: 600
    lineHeight: 25.5px
    fontFeature: '"tnum"'
  body-sm:
    fontFamily: Pretendard
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22.5px
  footnote:
    fontFamily: Pretendard
    fontSize: 13px
    fontWeight: 400
    lineHeight: 19.5px
  amount-sm:
    fontFamily: Pretendard
    fontSize: 13px
    fontWeight: 600
    lineHeight: 19.5px
    fontFeature: '"tnum"'
  caption:
    fontFamily: Pretendard
    fontSize: 11px
    fontWeight: 400
    lineHeight: 16.5px
---

# oat 디자인 토큰

- 결정일: 2026-11-25
- 티켓: [디자인 토큰: 라이트·다크 색·숫자 색 대비·묶음 색·타이포](https://github.com/Gn0lee/oat/issues/537)
- 관련 ADR: 0033(숫자 색은 가계부와 투자가 다른 문법), 0034(디자인 정본은 DESIGN.md, 스킬은 읽기만), 0021(Pine), 0016(묶음)
- 전제: [브랜드](brand.md), [통계 화면 구성](stats-screens.md), [모바일 입력 UX 원칙](mobile-input.md), [빌려준 돈](personal-loans.md)
- PoC: [디자인 토큰 PoC](../research/2026-11-25-design-tokens-poc.md) (대비·색각·폭 계산 스크립트)
- 리뷰: 다른 모델(Fable)의 독립 리뷰를 반영했다(숫자 색을 기록 종류로 가름, 가구원 줄 무색, 투자 화면의 배당, 다크 묶음 색 밝기, 카테고리 막대 대비, 큰 숫자 규칙 초안 표시와 구현 주의, 부호 범위, 위험 색, 개인 장부 칩 문구와 본인 화면 한정, DTCG 내보내기 손실, 다음 티켓 토큰 목록).
- 형식: [Google Labs DESIGN.md](https://github.com/google-labs-code/design.md) (alpha). 맨 위 YAML이 정본 값이고, 아래 글은 쓰는 규칙이다. `npx @google/design.md lint`로 검사하고 `export --format dtcg`로 `tokens.json`을 만든다.
- 새 레포가 생기면 이 파일을 레포 루트 `DESIGN.md`로 옮긴다(디자인 스킬이 루트에서 찾는다).

## Overview

oat는 가족이 함께 쓰는 가계부·자산 앱이다. iOS 앱이 먼저이고 React Native(Expo)로 만든다. 화면의 주인공은 숫자다. 색은 적게 쓰고, 쓴 색마다 뜻이 하나다.

- **Pine은 행동에만**: 주 버튼, 선택된 탭, 링크, 포커스, 진행률. 금액·차트·큰 면적에는 쓰지 않는다.
- **빨강·파랑은 숫자와 위험에만**: 위험(`danger`, 삭제·입력 오류)은 늘 아이콘이나 문장과 함께 쓴다. 수입 기록의 금액만 파랑이고, 시세로 생긴 증감만 상승 빨강·하락 파랑이다. 나머지는 기본 글자색에 부호다(ADR 0033).
- **회색 글자도 읽힌다**: 정보가 담긴 글자는 어느 면에서도 4.5:1 이상이다. 위계는 크기·굵기로 만든다.
- **라이트·다크 쌍**: 모든 색 토큰은 `light`·`dark`에 같은 이름으로 있다. 다크 값이 라이트와 같아도 이름을 둔다.
- 맨 위 `colors.primary`는 모드와 상관없는 브랜드 Pine이다. 화면은 `light`·`dark` 묶음의 토큰을 쓴다.
- 크기 단위 `px`는 iOS pt(RN의 숫자 크기)와 1:1이다. DESIGN.md 형식이 pt를 받지 않아 px로 적는다.

## Colors

대비 기준: 작은 글자 4.5:1, 큰 글자(24pt 이상, 굵게 19pt 이상)·UI 경계·차트 표시 3:1(WCAG 2.x). 아래 숫자는 PoC 스크립트로 잰 값이다.

### 바탕과 글자

| 토큰 | 라이트 | 다크 | 규칙 |
|---|---|---|---|
| `background` | `#F4F5F3` | `#121413` | 화면 바탕. 다크도 라이트처럼 초록빛이 아주 살짝 도는 회색 |
| `surface` | `#FFFFFF` | `#1C1F1E` | 카드·시트·row 묶음. 다크는 바탕보다 밝게 해서 떠 있음을 보인다 |
| `surface-alt` | `#EFECEA` | `#242826` | 섹션 차이(Linen) |
| `text` | `#191F28` | `#E8EAE9` | 본문. 모든 면에서 12 이상 |
| `text-sub` | `#5B6470` | `#8E9592` | 보조 글자(날짜·가맹점·설명). 라이트 5.10~6.00, 다크 4.88~6.05 |
| `text-disabled` | `#B0B8C1` | `#565C59` | 누를 수 없는 요소에만. 정보 글자에 쓰지 않는다 |
| `divider` | `#E5E8E6` | `#2C302E` | 장식 구분선. 대비 기준 없음 |
| `border-strong` | `#868E8A` | `#767D7A` | 선이 경계를 알려 주는 곳(입력칸). 라이트 3.07~3.36, 다크 3.54~4.39. 라이트 `surface-alt` 위에서는 2.86이라 그 면에는 테두리 입력칸을 두지 않는다 |

회색 글자는 두 단계뿐이다. 날짜를 더 연하게 하는 셋째 단계(흔한 `#8B95A1`, 2.78)는 두지 않는다.

### Pine

| 토큰 | 라이트 | 다크 | 규칙 |
|---|---|---|---|
| `primary` | `#14573F` | `#1F7A55` | 면에 칠하는 색(주 버튼, 선택 세그먼트 면). 다크 버튼 면/카드 3.14. 다크 `surface-alt` 위에서는 2.82라 그 면에는 주 버튼을 두지 않는다 |
| `on-primary` | `#FFFFFF` | `#FFFFFF` | 버튼 라벨. 라이트 8.52, 다크 5.29. 두 모드 모두 흰 라벨 |
| `primary-pressed` | `#0E4431` | `#186446` | 누른 상태 |
| `primary-text` | `#14573F` | `#5CC59A` | 글자·선·진행률·포커스에 칠하는 색. 다크 bg 8.73 |
| `primary-soft` | `#E6F0EB` | `#1A2E25` | 선택 배경·배지. 위의 `primary-text` 라이트 7.31, 다크 6.78 |

다크에서 Pine은 넓은 면은 차분하게, 작은 글자만 밝게 올린다. 하나의 밝은 Pine(`#4CB98A`)을 면과 글자에 같이 쓰면 화면 아래 넓은 버튼이 민트색으로 빛나서 택하지 않았다.

### 숫자 색 (ADR 0033)

| 토큰 | 라이트 | 다크 | 쓰는 곳 |
|---|---|---|---|
| `amount-income` | `#1B64DA` | `#4795FF` | **수입 기록**의 금액(+). 지출(−)은 `text` |
| `amount-up` | `#C81E2D` | `#FF6B6B` | 시세로 생긴 상승, 작은 숫자(기본) |
| `amount-up-display` | `#F04452` | `#FF6B6B` | 상승, 24pt 이상(굵게 19pt 이상) |
| `amount-down` | `#1B64DA` | `#4795FF` | 시세로 생긴 하락, 작은 숫자(기본) |
| `amount-down-display` | `#3182F6` | `#4795FF` | 하락, 24pt 이상 |

- 대비: 라이트 `amount-up` 4.85~5.71, `amount-down` 4.60~5.41. `-display` 둘은 3.16~3.71이라 큰 글자에만 쓴다. 다크는 4.98~6.67로 작은 글자에도 충분해 값이 하나다.
- 기본 이름(`amount-up`)이 어디서나 안전한 쪽이다. 잘못 골라도 대비가 깨지지 않는다.
- `amount-income`은 `amount-down`과 값이 같아도 따로 둔다. 뜻이 다르고 나중에 갈라질 수 있다.
- **두 문법은 기록 종류로 가른다**(돈의 방향이 아니다).

  | 숫자 | 색 |
  |---|---|
  | 수입 기록의 금액(월급, 배당, 선물 받은 돈, 혜택 수입 등) | `amount-income` 파랑 |
  | 시세로 생긴 증감: 평가 손익, 종목 등락, 실현손익 | 상승 `amount-up` 빨강, 하락 `amount-down` 파랑 |
  | 지출 | 기본 글자색 + − |
  | 환불·정산·원 기록을 가리키는 혜택(지출을 줄임, 수입이 아님) | 기본 글자색 + + |
  | 이체, 빌려준 돈 돌려받음, 카드대금, 잔액 맞춤 | 기본 글자색 + 부호 |
  | "평소 이맘때보다 12만 원 덜" 같은 차이 | 기본 글자색 + 부호·문장 |
  | 순자산·묶음 증감(월별 자산 추이) | 기본 글자색 + 부호. 시세보다 월급·지출로 바뀌는 숫자라 평가 문법을 쓰지 않는다 |
  | 다른 가구원의 "○○의 개인 기록" 합계 줄, 숨긴 지갑의 주인 이름 줄 | 기본 글자색. 가구원 줄에는 색을 넣지 않는다 |

- **투자 화면 안에서는 평가 문법만 쓴다.** 투자 화면의 배당 금액은 기본 글자색 + 부호다(하락 파랑과 겹치지 않게). 같은 배당이 기록 목록에서는 수입이라 파랑이다.
- 홈처럼 섞이는 화면은 카드마다 자기 문법을 따른다.
- 색이 든 금액과 증감·흐름 줄(기록 목록의 지출·수입, 평소 대비 차이, 평가 손익)에는 늘 +/− 부호를 붙인다(색에만 의존하지 않음). 잔액·평가액·"이번 달 쓴 돈" 같은 합계에는 부호를 붙이지 않는다(음수 잔액만 −).

### 위험

| 토큰 | 라이트 | 다크 | 규칙 |
|---|---|---|---|
| `danger` | `#C81E2D` | `#FF6B6B` | 삭제 같은 되돌리기 어려운 행동과 입력 오류. 늘 아이콘 또는 문장과 함께 쓴다. 값은 `amount-up`과 같지만 이름을 나눈다 |

### 개인 장부

| 토큰 | 라이트 | 다크 | 규칙 |
|---|---|---|---|
| `ledger-private` | `#8E3B7E` | `#E7A3D8` | 자물쇠와 장부 이름 글자. 카드 위 6.82 / 8.41 |
| `ledger-private-soft` | `#F7E8F3` | `#3A2335` | 장부 칩 바탕. 칩 위 글자 5.78 / 7.22 |

- 자두색이다. Pine·빨강·파랑과 떨어져 있고 경고처럼 읽히지 않는다. 포인트·상품권 차트 색(연분홍)과 색상각이 같지만(336° / 335°) 밝기가 크게 다르고, 연분홍은 자산 추이 차트에만, 자두는 글자·칩에만 쓴다. 보라는 모으는 돈 차트 색과 겹치고 브랜드에서 버린 인디고 계열이라 택하지 않았다.
- **칩 문구는 "🔒 장부 이름"**이다. 처음 만들어지는 개인 장부의 기본 이름은 "내 장부"이고, 장부를 더 만들면 그 이름을 쓴다("🔒 용돈"). 입력 메뉴의 "🔒 내 지출"은 행동 이름이라 그대로 둔다.
- 늘 자물쇠와 함께 쓴다. 공용 장부는 색이 없는 기본 상태다.
- **본인 화면에만 쓴다.** 내 개인 장부 기록과 내 "나만 보기" 지갑에 같은 표시를 쓴다. 다른 가구원 화면의 "○○의 개인 기록" 합계 줄과 숨긴 지갑의 주인 이름 줄에는 색도 자물쇠도 쓰지 않는다([숨긴 지갑과 공용 장부 기록](hidden-wallets.md)).

### 차트

**자산 추이(A2)만 묶음 색을 쓴다.** 페이스 선과 카테고리 막대는 무채색이다.

| 토큰 | 라이트 | 다크 | 쓰는 곳 |
|---|---|---|---|
| `chart-group-cash` | `#EDB345` | `#F7C15F` | 쓸 수 있는 돈(노랑) |
| `chart-group-saving` | `#7A59C3` | `#886ACF` | 모으는 돈(보라) |
| `chart-group-invest` | `#008B96` | `#3FBFCC` | 투자(청록) |
| `chart-group-point` | `#ECB7DF` | `#F8D0EE` | 포인트·상품권(연분홍) |
| `chart-group-lent` | `#B66B31` | `#D78951` | 빌려준 돈(갈색) |
| `chart-group-debt` | `#8E9592` | `#6E7572` | 갚아야 할 돈(회색, 0 아래) |
| `chart-dim` | `#E5E8E6` | `#2C302E` | 칩으로 한 묶음을 고르면 나머지 묶음 |
| `chart-neutral` | `#868E8A` | `#767D7A` | 카테고리 막대. 카드 위 3.36 / 3.94 |
| `chart-line` | `#191F28` | `#E8EAE9` | 순자산 선, 페이스의 이번 달 실선 |
| `chart-reference` | `#5B6470` | `#8E9592` | 평소 이맘때 점선·눈금 |
| `chart-axis` | `#868E8A` | `#767D7A` | 0 기준선·축 |

- 묶음 색은 빨강(0~45°)·Pine 초록(125~185°)·파랑(230~285°) 색상각을 피했다(OKLCH).
- 색은 위치가 아니라 묶음에 붙는다. 어느 달에 묶음이 비어도 다른 색은 그대로다.
- 쌓은 조각 사이에 카드색 1.2px 틈을 둔다. 빗금은 쓰지 않는다.
- 범례 칩을 누르면 그 묶음만 색이 남고 나머지는 `chart-dim`이 된다. 다시 누르면 전체 보기다.
- 순자산 선은 2px `chart-line`에 카드색 테두리(halo)를 두른다.
- 색각: 라이트·다크 모두 정상·적색약·녹색약 시야(Machado 2009)에서 자산 묶음끼리 가장 가까운 두 색의 OKLab 거리가 0.10 이상이다(가장 낮은 값은 다크 적색약의 투자↔포인트·상품권 0.103). 갚아야 할 돈과의 쌍은 예외로, 라이트 적색약의 투자↔갚아야 할 돈이 0.059다. 0 위·아래로 위치가 갈려 섞이지 않는다.
- 약점: 묶음 색은 "차트 표시 3:1" 기준의 예외다. 노랑·연분홍은 흰 카드와 1.7~1.9라 얇은 조각이 흐리다. 누르면 나오는 금액과 묶음별 잔액 목록(A1)으로 보완한다. 무채색 차트 토큰(`chart-neutral`·`chart-line`·`chart-reference`·`chart-axis`)은 3:1 이상이다.

## Typography

글꼴은 **Pretendard** Regular(400)·SemiBold(600)·Bold(700) 세 굵기를 앱에 넣는다(OFL 1.1, v1.3.9, 약 4.7MB). iOS와 나중의 Android가 같은 모양이다.

| 토큰 | 크기/줄 | 굵기 | iOS 글자 스타일(`dynamicTypeRamp`) | 쓰는 곳 |
|---|---|---|---|---|
| `amount-hero` | 32/42 | Bold, 숫자 폭 고정, 자간 −0.5 | `largeTitle` | 홈 맨 위 숫자, 입력 금액, 자산 탭 묶음 금액 |
| `title-1` | 26/35 | Bold | `title1` | 퍼널 질문("얼마 썼어요?") |
| `title-2` | 22/31 | Bold | `title2` | 화면 제목 |
| `title-3` | 20/29 | SemiBold | `title3` | 카드·섹션 제목 |
| `body` | 17/25.5 | Regular | `body` | 목록 이름, 본문 |
| `amount` | 17/25.5 | SemiBold, 숫자 폭 고정 | `body` | 목록 금액 |
| `body-sm` | 15/22.5 | Regular | `subheadline` | 보조 줄 |
| `footnote` | 13/19.5 | Regular | `footnote` | 설명 |
| `amount-sm` | 13/19.5 | SemiBold, 숫자 폭 고정 | `footnote` | 작은 금액. 색이 든 금액의 하한 |
| `caption` | 11/16.5 | Regular | `caption2` | 날짜·차트 축만. 금액에 쓰지 않는다 |

- 크기와 1.5배 줄 간격은 토스 TDS(본문 17/25.5, 15, 13, 11)에 맞췄다. 한글은 받침 때문에 줄 간격이 넉넉해야 한다.
- **숫자 폭 고정**(`tnum`, RN `fontVariant: ['tabular-nums']`)은 `amount` 계열에만 켠다. 목록에서 자릿수가 세로로 맞고, 입력 중 글자가 흔들리지 않는다. 문장 속 숫자(날짜·개수)는 끈다. Pretendard 기본 숫자는 폭이 들쭉날쭉하다(Bold `1` 960, `0` 1352 / 2048).
- **더 큰 텍스트**: 각 토큰을 위 iOS 글자 스타일 곡선에 묶어 키운다. 큰 글자는 덜, 작은 글자는 더 커진다.
- 구현 메모: RN에서 `fontFamily: Pretendard` + `fontWeight`만으로는 Android가 굵기를 못 고를 수 있다. 굵기별 글꼴 이름(`Pretendard-Regular`·`-SemiBold`·`-Bold`)으로 매핑한다(Android 이식 때 확인).

### 큰 숫자 넘침

**초안이다.** 실기기(200% 글자, AX 크기)와 App Store "더 큰 텍스트" 라벨 기준을 확인한 뒤 확정한다. 확인은 정식 출시 조건 목록에 넣는다.

- `amount-hero`는 **최대 44pt**까지 커진다(`maxFontSizeMultiplier` ≈ 1.375, TDS 큰 제목 상한 140%와 비슷).
- 넘치면 **0.7배까지** 폭에 맞게 줄인다(`adjustsFontSizeToFit`, `minimumFontScale: 0.7`).
- 그래도 넘치면 쉼표 자리에서 두 줄로 내린다. 쉼표 뒤에 폭 없는 공백(U+200B)을 넣고 "원"은 앞 숫자에 붙인다.
- 구현 주의: RN `adjustsFontSizeToFit`은 `numberOfLines={1}`이면 줄인 뒤 자르고, `2`면 줄바꿈을 먼저 할 수 있다. "먼저 줄이고, 그래도 넘치면 두 줄" 순서는 속성만으로 안 나올 수 있어서, 글자 폭을 재서(`onTextLayout`) 한 줄·두 줄을 고르는 구현이 필요할 수 있다. 실기기에서 확인한다.
- 줄여 쓰지 않는다("1,284만" 금지, 금액이 바뀐다).
- SE 2세대 카드 안 폭 311pt에서 잰 결과: 기본 크기에서는 −123억(`−12,345,678,900원`, 298pt)까지 그대로 들어간다. 44pt 상한에서도 0.75배면 들어가서 두 줄은 거의 생기지 않는다.
- 접근성 큰 크기에서는 목록 금액(최대 53)이 큰 숫자(44)보다 커질 수 있다. 위계가 좁혀지는 것을 받아들인다(TDS와 같음).

## Do's and Don'ts

- Do: 색이 든 금액과 증감·흐름 줄에는 늘 +/− 부호를 붙인다. 합계·잔액에는 붙이지 않는다(음수만 −).
- Do: 가계부는 수입만 `amount-income`으로 칠하고, 투자·평가만 `amount-up`·`amount-down`을 쓴다.
- Do: 색 토큰은 이름으로만 부른다. 라이트·다크 값은 테마가 고른다.
- Don't: Pine을 금액·차트·큰 면적 배경에 쓰지 않는다.
- Don't: 정보가 담긴 글자에 `text-disabled`를 쓰거나 숫자를 흐리게 하지 않는다.
- Don't: `-display` 숫자 색을 24pt 미만(굵게 19pt 미만)에 쓰지 않는다.
- Don't: 묶음 색을 자산 추이 밖(목록 점, 배지 등)에 쓸지는 다음 티켓 시안에서 정하기 전까지 쓰지 않는다.
- Don't: 빗금으로 계열을 나누지 않는다.
