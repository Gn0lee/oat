# 디자인 토큰 PoC: 대비·색각·큰 숫자 폭 계산과 시안, 디자인 스킬 조사

- 날짜: 2026-11-25
- 티켓: [디자인 토큰: 라이트·다크 색·숫자 색 대비·묶음 색·타이포](https://github.com/Gn0lee/oat/issues/537)
- 결과 문서: [DESIGN.md](../design/DESIGN.md), ADR 0033·0034
- 코드: `2026-11-25-design-tokens-poc/` (Node 26, 의존성 없음. `hero-width.py`만 fontTools 필요)

## 무엇을 직접 해 보고 무엇을 조사로 대신했나

| 항목 | 방식 | 결과 |
|---|---|---|
| 글자·면 대비 | PoC `dark-base.mjs`·`pine-dark.mjs`·`neutrals.mjs`·`amount-colors.mjs`·`private-ledger.mjs`, 최종 `check-tokens.mjs` | 30쌍 모두 기준 통과 |
| 다크 바탕·Pine 다크·회색 글자·개인 장부 색 | 시안 `mockups/03`~`05`, `08` | DESIGN.md Colors |
| 자산 추이 묶음 색 | PoC `groups.mjs`·`groups-v2.mjs`·`groups-search.mjs`·`groups-v3.mjs`(OKLCH 생성, 적·녹색약 시뮬레이션), 시안 `mockups/07a`~`07c` | 회색 안 버림, 카테고리 색 + 눌러서 강조 |
| 큰 숫자 넘침 | PoC `hero-width.py`(Pretendard Bold 실제 글자 폭, tnum 적용) | 상한 44pt + 하한 0.7배 |
| 글꼴 | 조사(Pretendard 릴리스·라이선스·OpenType 기능), 시안 `mockups/01`·`02` | Pretendard 3굵기, 금액만 tnum |
| 타이포 스케일 | 조사(토스 TDS Typography 공식 문서) | TDS 숫자에 맞춤 |
| 앱 차트 색 사례 | 조사(YNAB·Copilot·Kubera·Monarch·뱅크샐러드 공개 자료, Datawrapper·Atlassian·Carbon·Highcharts 지침), 사용자 캡처(토스 소비 화면) | 아래 3절 |
| 디자인 스킬 | 저장소 받아서 실행(UI UX Pro Max 8db3633, Impeccable 9e460a8, jakubkrehel/skills 672ae44), DESIGN.md 명세 | ADR 0034 |
| 실기기 동작 | 구현으로 넘김 | `adjustsFontSizeToFit`·`dynamicTypeRamp`(Fabric)·U+200B 줄바꿈, Pine 작은 면적 |

## 1. 대비 (`check-tokens.mjs`)

DESIGN.md를 `npx @google/design.md@0.4.0 export --format dtcg`로 `tokens.dtcg.json`에 뽑고, 글자·면 쌍을 WCAG 2.x로 잰다. 미달이 있으면 종료 코드 1이다. 2026-11-25 실행에서 라이트·다크 각 15줄 모두 통과했다. 낮은 값:

- 라이트 `amount-down`·`amount-income` on `surface-alt` 4.60, `amount-up-display` on `surface-alt` 3.16(큰 글자 전용), `border-strong` on `background` 3.07
- 다크 `text-sub` on `surface-alt` 4.88, `primary` 면/`surface` 3.14

DESIGN.md 린터(`npx @google/design.md@0.4.0 lint`)는 오류·경고 0이다(간격·모서리·컴포넌트는 의도적으로 뺐다는 정보 4건).

## 2. 자산 추이 묶음 색

- 회색 5단계(`groups.mjs`): 이웃 대비 1.57~1.73, 가장 가까운 두 색 OKLab 거리 0.129. 사용자 확인에서 구분이 안 되고 빗금이 어색했다.
- 한 색(보라) 단계(`groups-v2.mjs`): 0.120으로 나아지지 않는다. 밝기만 다른 단계는 색을 바꿔도 같은 문제다.
- 저채도 카테고리(`groups-v2.mjs`): 정상 0.138이지만 녹색약 0.097, 톤이 가라앉았다.
- 무작위 탐색(`groups-search.mjs`): 최소 거리는 0.166까지 오르지만 하늘색·형광 청록이 나와 파랑과 헷갈려 버렸다. 손으로 고르는 편이 낫다는 참고로만 남긴다.
- 최종(`groups-v3.mjs`): 처음 고른 청록·분홍이 적색약에서 0.034로 겹쳐 밝기를 벌렸다. 자산 묶음끼리 0.10 이상, 가장 가까운 쌍은 라이트 적색약의 투자↔갚아야 할 돈 0.059(0 위·아래라 섞이지 않음).

## 3. 차트 색 사례 조사

- YNAB 순자산 리포트: 자산 한 색·부채 한 색 막대 + 순자산 선. 묶음별로 나누지 않는다. 색이 파랑·빨강이라는 것은 리뷰 글(2차). [YNAB 도움말](https://support.ynab.com/en_us/net-worth-BkwQO5WA5.md)
- Copilot: 적록색약을 고려해 차트 색을 바꿨다(값 미확인). [Copilot](https://www.copilot.money/dispatch/accessible-charting)
- 토스(사용자 캡처, 소비 화면): 비율 막대는 상위 3개만 색(초록·노랑·파랑) + "그 외" 회색. 들어온 돈은 파랑 `+`, 지출은 검정 `−`. 토스 주식 화면은 상승 빨강·하락 파랑이라 두 문법을 쓴다.
- Monarch·Kubera·Empower·Rocket Money·뱅크샐러드: 공개 자료로 차트 색을 확인하지 못했다. 화면 갤러리(Mobbin)는 커넥터 인증이 없어 쓰지 못했다.
- Datawrapper: 관련 카테고리를 한 색 단계로 칠하면 구분이 약하고 눈이 합계로 간다. 회색은 덜 중요한 데이터에 쓴다. [글](https://www.datawrapper.de/blog/10-ways-to-use-fewer-colors-in-your-data-visualizations)
- Highcharts·IRE: 패턴(빗금)은 은은하게, 기본보다 사용자가 켜는 옵션으로. [Highcharts](https://highcharts.com/docs/accessibility/patterns-and-contrast)
- IBM Carbon: 카테고리 색은 정해진 순서로 써서 이웃 대비를 크게 한다. [Carbon](https://carbondesignsystem.com/data-visualization/color-palettes/)

## 4. 큰 숫자 폭 (`hero-width.py`)

Pretendard Bold, tnum, 자간 −0.5pt. SE 2세대 카드 안 폭 311pt(375 − 화면 여백 16×2 − 카드 여백 16×2). iOS `largeTitle`·`body` 크기 곡선으로 키웠다.

- 기본 크기(32pt): `−12,345,678,900원` 298pt까지 그대로 들어간다.
- 하한을 "목록 금액 ÷ 큰 숫자"로 계산하는 초안은 접근성 3(0.82)부터 두 줄이 생기고 사례를 찾지 못했다.
- 상한 44pt + 고정 하한 0.7(택함): 44pt에서 −123억이 413pt → 0.75배로 들어가 두 줄이 생기지 않는다.

## 5. 글꼴·타이포

- Pretendard v1.3.9(2023-11-05 릴리스, OFL 1.1). static OTF Regular 1.57MB·SemiBold 1.58MB·Bold 1.58MB. GSUB에 `tnum` 있음. 기본 숫자는 비례폭(Bold `1` 960, `0` 1352, UPM 2048).
- 토스 TDS Typography(공식): 30/40, 26/35, 22/31, 20/29, 17/25.5, 15/22.5, 13/19.5, 11/16.5. iOS 더 큰 텍스트에서 Typography 1(30)은 최대 42, sub Typography 13(11)은 최대 31. [TDS](https://tossmini-docs.toss.im/tds-mobile/foundation/typography/)

## 6. 디자인 스킬

- **UI UX Pro Max**: `scripts/search.py`는 스킬 안 CSV만 읽는다(`core.py`, `design_system.py`). "personal finance tracker"로 돌리면 주색 `#1E40AF`, 강조 초록, Caveat/Quicksand, 파이·도넛 차트를 낸다. `--persist`는 `design-system/<slug>/MASTER.md`·`pages/`·`tokens.json`을 쓴다. 3.7MB, Python 3 표준 라이브러리.
- **Impeccable**: `PRODUCT.md`(init)와 `DESIGN.md`(document, Google Labs 형식)를 읽는다. `## Platform`에 `ios`를 두면 HIG 기준으로 바뀐다. 새 디자인을 시작할 때 impeccable.style 카탈로그를 받아 온다(텔레메트리는 끌 수 있다).
- **jakubkrehel/skills**: better-colors·better-typography·better-accessibility 등. 별도 맥락 파일 없이 코드의 토큰을 읽는다. `npx skills add jakubkrehel/skills`.
- **DESIGN.md 형식**(google-labs-code/design.md, alpha): YAML 토큰 + 산문, `light`/`dark` 묶음, `lint`(대비 검사 포함)·`diff`·`export`(dtcg, Tailwind).
