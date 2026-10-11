# 새 DESIGN.md 스펙 초안 — 반응용 러프 (Monarch 베이스 + Wise 어휘 차용)

> 상태: 러프 프로토타입. 완성 아님. 반응 수집용.
> 베이스: [레퍼런스 1개 최종 확정 (oat에 이식할 DESIGN.md 선정)](https://github.com/Gn0lee/oat/issues/500)에서 확정한 Monarch 베이스 + 파일럿 대조 기준.
> 전제: [핀테크 후보 4종의 DESIGN.md 수집·비교 (Copilot·Monarch·Wealthsimple·Wise)](https://github.com/Gn0lee/oat/issues/499)의 비교표, [AI티 판정: 컬러·카드·여백 무엇을 버리고 유지할지](https://github.com/Gn0lee/oat/issues/501)의 Resolution을 그대로 따른다.
> 소속: [디자인 체계 재구축 지도 (refero 기반, AI티 제거 + 마이그레이션 포함)](https://github.com/Gn0lee/oat/issues/498)의 child. 본 티켓 자체는 [새 DESIGN.md 스펙 초안 (토큰·타입·컴포넌트 원칙)](https://github.com/Gn0lee/oat/issues/502)이다.
> 기존 원칙: `.claude/docs/DESIGN.md`, `.claude/docs/CONVENTIONS_FE.md`, `.claude/docs/SCREEN_PRIMITIVES.md` 유지 전제 위의 개정안이다.

## 0. 이 초안이 바꾸는 것 4줄 요약

1. Primary를 indigo-600 일색에서 Monarch Ember 계열로 교체. 중립 그레이 + KRW 적/청 오버레이는 유지.
2. 카드 허용을 2종으로 축소 (요약 지표, Dialog/Drawer 확인 영역). 잔존 radius 12px. 반복 목록의 카드 감쌈 금지.
3. 섹션 간격 64px 상한. 구분 수단 (제목, divider, 배경 차이)은 유지.
4. Wise Feature Row + Segmented Tab을 밀도형 리스트 어휘로 차용. Lime 격리, Wise Alarm Red 폐기 후 oat 적/청 재정의.

## 1. 컬러 토큰 (초안)

### 1.1 교체 / 유지 매트릭스

| 토큰 | 결정 | 값 (초안) | 비고 |
|------|------|-----------|------|
| primary (신규) | 교체 | Ember `FF692D` 계열 | Monarch Ember. indigo-600 (`4F46E5`) 삭제 + 신규 화면 사용 금지 |
| primary-strong (hover/active) | 신규 | `E4571F` (초안, 대비 조정 예정) | 버튼 클릭 시 살짝 어두워짐 유지 |
| primary-soft (옅은 배경) | 신규 | `FFF0E8` 또는 `FEEADF` (초안) | 기존 indigo-50 (`EEF2FF`) 대체. 선택 상태, 배지 배경 |
| surface-alt | 신규 | Linen `EFECEA` 계열 | Monarch Linen. 섹션 배경 차이에만 사용, 사진 의존 없음 |
| neutral 텍스트/보더/배경 | 유지 | gray-900 `191F28`, gray-700 `4E5968`, gray-500 `8B95A1`, gray-300 `D1D6DB`, gray-100 `F2F4F6`, white `FFFFFF` | 기존 DESIGN.md 3.2 그대로 |
| KRW 상승/수입/increase | 유지 (오버레이) | `F04452` | 어떤 후보에도 없던 oat 시맨틱. 차트 카테고리 색으로는 사용 금지 (아래 5장 참조) |
| KRW 하락/지출/decrease | 유지 (오버레이) | `3182F6` | 동상 |
| warning / success | 유지 | `FF9F00` / `03B26C` | 동상 |
| Wise Lime (`9FE870`) | 격리 (버린다) | 사용 금지 | 리스트 어휘만 차용, 브랜드 색 차용 아님 |
| Wise Forest Ink (`163300`) | 미차용 | — | 베이스는 Monarch이므로 텍스트는 gray-900 유지 |
| Wise Alarm Red | 폐기 | — | oat 적/청으로 재정의 후 사용 |

### 1.2 CSS 변수 매핑 초안 (shadcn/Tailwind)

방향: CSS 변수 우선, tailwind config 확장 없음. 다크 토큰은 2단계로 미룬다 (기존 DESIGN.md 3.4 유지).

```css
:root {
  /* Brand — Monarch Ember (indigo 대체) */
  --brand: #FF692D;
  --brand-strong: #E4571F;   /* hover/active 초안 */
  --brand-soft: #FFF0E8;     /* 옅은 배경 초안 */

  /* Surface alt — Monarch Linen */
  --surface-alt: #EFECEA;

  /* Neutral — 유지 */
  --gray-900: #191F28;
  --gray-700: #4E5968;
  --gray-500: #8B95A1;
  --gray-300: #D1D6DB;
  --gray-100: #F2F4F6;

  /* Semantic — KRW 오버레이 유지 */
  --positive: #F04452;
  --negative: #3182F6;
  --warning: #FF9F00;
  --success: #03B26C;
}
```

shadcn 매핑 초안:

- `--primary` → `var(--brand)`, `--primary-foreground` → white 유지.
- 기존 `bg-primary text-white` 호출부는 토큰 교체만으로 Ember로 전환되도록 한다. 개별 화면에서 indigo hex 하드코딩 잔존분은 파일럿 단계에서 전수 제거.
- 차트 토큰 (`--chart-1` …)은 5장에서 별도 정의. `--positive/--negative`를 차트 팔레트에 직접 넣지 않는다.

열린 질문:

- Q-color-1: Ember 본색 `FF692D` 위 white 텍스트 대비가 AA 4.5 미달이면 버튼 텍스트를 gray-900으로 뒤집을지, Ember를 더 진하게 내릴지. 파일럿 전 대비 측정 필요.
- Q-color-2: `brand-soft`와 `surface-alt`의 용도 겹침 정리 필요 (선택 배경 vs 섹션 배경 차이).
- Q-color-3: success `03B26C`와 차트 초록의 중복 허용 여부.

## 2. 타입 스케일 + Pretendard 페어링 (초안)

### 2.1 페어링 규칙 (Monarch 서체 수용 조정 반영)

- Monarch ABC Oracle / Copernicus는見出 한정 대체 → oat는 전면 Pretendard. 세리프 도입 없음, 사진 의존 타이포 없음.
- 한글/영문/숫자 모두 Pretendard 단일 패밀리:

```css
font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
```

- 숫자 안정 표시: 금액·수익률에는 `tabular-nums` 필수 (`AmountText` primitive 내부에서 보장).
- Weight 용도 고정: Hero 숫자 700, row trailing 금액 600, 본문 400/500, 레이블 500.

### 2.2 스케일 초안 (기존 DESIGN.md 4.2 개정)

| 용도 | 크기 | Weight | 행간 (초안) | 예시 |
|------|------|--------|-------------|------|
| Hero 숫자 (총 자산) | 32–40px (`text-3xl`–`text-4xl`) | 700 | 1.15–1.2, 자간 -0.01em | 125,430,000원 |
| 중간 숫자 (개별 금액, delta) | 20–24px (`text-xl`–`text-2xl`) | 600–700 | 1.25 | +12.5% |
| 섹션 제목 | 18–20px (`text-lg`–`text-xl`) | 600–700 | 1.3 | 자산 목록 |
| Row 제목 | 15–16px (`text-base` 근처) | 500–600 | 1.4 | 종목명, 가계부 제목 |
| 본문/설명 | 14–16px (`text-sm`–`text-base`) | 400–500 | 1.5 | 설명, 안내 |
| 캡션/레이블 | 12–13px (`text-xs`) | 500 | 1.4 | 총 자산, 수익률 |

유지되는 금액 정책 (DESIGN.md 4.4, SCREEN_PRIMITIVES Amount Tone 그대로):

- KRW 기본 `10,000원`, 좁은 row는 `41만원`·`1억원` 축약 + `title`/스크린리더 전체 금액.
- USD `$123.45` 유지. 포맷터는 부호를 소유하지 않음. 부호는 화면 도메인 정책 (절대값 무부호, 조밀 주식 목록 무부호, 가계부 cash-flow `+`/`-`, delta 명시).
- `원` 중심, 활성 입력 필드 장식 `₩` prefix 금지, 라벨 `금액 (원)` + 하단 미리보기 유지.

열린 질문:

- Q-type-1: Hero 40px 상한 유지 vs 모바일 32px 고정. 좁은 지표 그리드 (`min-w-0`, wrapping, `text-base` + `sm:text-lg`) 규칙은 유지.
- Q-type-2: 영문 대문자 레이블 자간 조정 필요 여부 (Monarch는 자간 넓음, oat는 미정).

## 3. 반경 / 간격 (초안)

### 3.1 반경

| 대상 | 값 | 비고 |
|------|-----|------|
| 잔존 카드 2종 (요약 지표, Dialog/Drawer 확인 영역) | 12px | Monarch식. 기존 `rounded-xl` (20px 환산 기준 0.625rem 체계 포함) 남발 금지 |
| GroupedList row 묶음 surface | 10–12px, 얕은 ring + divider, shadow 없음 | SCREEN_PRIMITIVES `GroupedList` 규칙 유지 |
| 입력 필드 | 12px (초안) | 기존 `rounded-xl` → 12px 수렴. 포커스 ring은 Ember |
| 버튼 | 아래 4.1 참조 (CTA 12px vs 칩 pill 이원화 초안) | Monarch pill 수용 조정 지점 |
| 차트 컨테이너 | 반경 없음 (섹션 직접 배치) | 차트를 카드로 감싸지 않음 |

### 3.2 간격 — 섹션 64px 상한 + Wise 밀도

- 섹션 간격: Monarch 섹션 64px를 상한으로. `ScreenSection` 간격을 `space-y-8`–`space-y-16` 범위에서 관리하고 64px 초과 금지.
- 섹션 내·row 내 밀도: Wise식 8–12px gap 차용. 반복 row padding은 정보량 우선으로 조밀하게.
- 구분 수단 유지: 제목 + divider + 배경 차이 (`white` vs `gray-100` vs Linen `surface-alt`)로 구분. 카드 테두리로 구분하지 않음.
- PageContainer 폭 정책 유지 (`default max-w-5xl`, `medium max-w-3xl`, `narrow max-w-xl`). PC 2컬럼은 두 흐름이 있을 때만.

열린 질문:

- Q-space-1: 모바일 섹션 상한을 64px와 별도로 40–48px로 둘지 (Monarch 64px는 PC 기준인지 확인 필요).
- Q-space-2: Linen 배경 섹션과 gray-100 배경 섹션의 교대 규칙 필요 여부.

## 4. 컴포넌트 원칙 (초안 — 버튼·입력·리스트 row·차트)

### 4.1 버튼

```tsx
// Primary CTA — Ember 전환 초안
<Button className="w-full bg-brand text-white rounded-[12px] py-3">
  자산 추가하기
</Button>

// Secondary
<Button variant="outline" className="rounded-[12px]">
  취소
</Button>
```

원칙 초안:

- Primary = Ember fill + white 텍스트 (대비 미달 시 Q-color-1에서 뒤집음). hover/active는 `brand-strong`. 포커스 ring Ember.
- Secondary/Outline = gray-300 보더 + gray-900 텍스트. Ghost = 텍스트만.
- CTA (저장/추가/확인) 12px 유지. pill은 필터 칩·Segmented Tab thumb 같은 작은 선택 요소에만 허용 — 큰 CTA를 pill로 만들지 않음. 이것이 [AI티 판정](https://github.com/Gn0lee/oat/issues/501) 이후 Monarch pill 수용 조정의 잠정 해석이다. 반응 필요.
- 기존 `bg-primary` 호출은 토큰 교체로 일괄 전환. indigo hex 하드코딩은 금지 목록에 추가.
- 터치 44px 최소 유지. 저장/취소 action은 task footer에 모으고 safe-area 고려 (CONVENTIONS_FE 입력/제출 Task Surface 유지).

### 4.2 입력 필드

```tsx
<div className="space-y-2">
  <label className="text-sm text-gray-700">종목명</label>
  <Input
    className="rounded-[12px] border-gray-300 focus:border-brand focus:ring-brand"
    placeholder="종목을 검색하세요"
  />
</div>
```

원칙 초안:

- radius 12px, 보더 gray-300, 포커스 Ember. 에러는 인라인 빨강 메시지 (기존 6.1 유지).
- 금액 라벨 `금액 (원)` + 하단 `10,000원` 미리보기 유지. 장식 prefix 금지.
- 선택 입력은 plain Select보다 combobox + mobile picker drawer 우선. 모바일 input flow는 full-screen drawer/task screen, Dialog 강제 fullscreen 금지 (CONVENTIONS_FE 유지).
- 돈 위치 UX 유지: `어디에서/어디로`, `타인에게 보낸 돈은 이체가 아니라 지출로 기록해주세요.`, 이체 아이콘 `ArrowLeftRight`.

### 4.3 리스트 row — Wise Feature Row 차용 (Monarch 베이스 위)

표준 row 구조 (Wise Feature Row 해석):

```tsx
<GroupedList>
  <EntryRow
    href="/assets/stock/holdings"
    icon={CalendarDays}
    title="기록 조회"
    description="달력에서 수입/지출 내역 확인"
    trailing={<AmountText amount={1850000} tone="expense" />}
  />
</GroupedList>
```

원칙 초안:

- 반복 데이터는 row 기본. `대표 텍스트 + 보조 2–4개 + 금액/상태 + affordance` 구조 유지.
- 반복 목록을 카드로 감싸는 것 금지 (문장 확정). 허용 2종 외 카드 신설 금지: 큰 진입점·빈 상태·안내는 row/섹션으로.
- 밀도: row 최소 터치 44–56px, 내부 gap 8–12px, 제목 2줄 clamp + 메타 1줄 truncate + `min-w-0`, trailing `w-[7.5rem] max-w-[40vw] text-right` 유지.
- 정렬/필터는 테이블 헤더 클릭이 아니라 상단 control (아래 Segmented Tab).
- Hub `EntryRow`는 navigation-first: 상단 요약 숫자 반복 금지, description 중심.

Segmented Tab 차용 초안:

- 보유 현황/거래 내역, 분석 관점 전환 같은 상단 control에 Segmented Tab 사용. 기존 상단 탭 문법과 충돌 시 Segmented 우선 (후속 파일럿에서 확정).
- Segmented thumb pill 허용 (4.1 예외). 비선택 세그먼트는 중립 그레이, 선택은 white 표면 + 진한 텍스트. Lime 사용 금지.
- PC 넓은 화면은 컬럼 추가보다 그룹핑·비교·선택-상세에 사용.

### 4.4 차트 — 시맨틱 충돌 해소 초안

| 차트 | 용도 (유지) |
|------|-------------|
| 도넛 | 비중 (자산군별, 소유자별, 종목별) |
| 프로그레스 바 | 단순 비율 비교 |
| 라인/바 | 추이, 월별 수입/지출, 일별 지출 |

팔레트 초안 (KRW 적/청과 분리):

```tsx
// 카테고리 팔레트 — positive/negative를 넣지 않는다 (초안)
const CHART_COLORS = [
  '#FF692D', // brand Ember (첫 조각)
  '#03B26C', // 초록 유지
  '#FF9F00', // 주황 유지 — Ember와 동시 사용 시 순서 조정 필요 (Q-chart-1)
  '#8B95A1', // 회색
  '#4E5968', // 진한 회색 (추가 초안)
];
```

원칙 초안:

- `F04452`/`3182F6`은 카테고리(비중) 색으로 사용 금지. 상승/하락·수입/지출 delta·텍스트에만 사용. 이것이 Q-chart 충돌 해소의 핵심 문장이다.
- 도넛 조각 클릭은 1차 상호작용 제외, row 클릭으로 커버. Drawer 상단 요약 카드 반복 금지, 본문 원본 목록 중심, 기본 20건 + `전체 기록 보기` 이동 (기존 6.4 유지).
- 차트 컨테이너를 카드로 감싸지 않음. 섹션 제목 + 차트 + row 목록을 한 흐름으로.
- `role="img"` + `aria-label` 대체 설명 유지.

열린 질문:

- Q-chart-1: Ember `FF692D`와 주황 `FF9F00`의 변별이 약하면 둘 중 하나를 틸/블루그레이로 교체할지.
- Q-chart-2: 라인 차트 상승/하락 구간 색을 적/청으로 칠할지, 중립 단일 색 + 끝점 delta 텍스트로 처리할지.

## 5. DESIGN.md 개정 매핑 (초안 — 기존 장절 기준)

| 기존 장절 | 개정 방향 |
|-----------|-----------|
| TL;DR 컬러행 | `인디고 블루 기반` → `Ember 기반 + KRW 적/청 오버레이`로 교체 |
| 3.1 추천 계열 | 블루/인디고 우선 서술 삭제, Ember + 중립 그레이 절제 서술로 교체 |
| 3.2 컬러 구조 | 위 1.2 CSS 변수로 교체. indigo 주석 삭제 |
| 3.3 사용 규칙 | 주요 액션 `primary` → `brand Ember`로 교체. 수익 색 유지 행 그대로 |
| 3.4 다크모드 | 유지 (2단계). Ember 다크 토큰은 미정으로 명시 |
| 4.2–4.4 | 위 2장 스케일 + 행간/자간 초안 반영. 금액/부호 정책 유지 |
| 5.1 카드 | 허용 2종 축소 문장으로 교체. `큰 진입점·빈 상태·안내` 허용 항목 삭제, 금지 목록에 추가 |
| 5.2 버튼 | 위 4.1로 교체 |
| 5.3 입력 | 위 4.2로 교체 (12px + Ember 포커스) |
| 5.4 차트 | 위 4.4 팔레트 + 시맨틱 분리 문장으로 교체 |
| 5.5 컬렉션 | `밀도형 row + 상단 segmented control` 문장 추가. Wise 차용 명시 |
| 6.4 드릴다운 | 유지 (row 우선, 도넛 조각 제외) |

## 6. 파일럿 적용 메모 (다음 단계용, 본 초안 범위 밖)

- 후보: 파일럿 화면 1곳 (지도에서 결정). 본 초안의 토큰 교체만으로 깨지지 않는지 대비 측정이 선행되어야 한다.
- 선행 확인: white-on-Ember 대비, `bg-primary` 잔존 호출 전수조사 ([AI티 판정](https://github.com/Gn0lee/oat/issues/501)의 Q2 팩트: GroupedList 15파일+ vs 금지형 잔존 4건 패턴 참조), indigo 하드코딩 제거.
- 비범위: shadcn/Tailwind 매핑 최종 방식, Pretendard 숫자 커닝 최종값, 차트 최종 팔레트, 카드 경계 최종 문장화, 전체 전개 순서는 후속 티켓에서 결정.

## 7. 반응 요청 (이 초안에서 받고 싶은 것)

1. Ember `FF692D` + white 조합의 CTA 허용 여부 (Q-color-1).
2. 큰 CTA 12px vs 칩 pill 이원화 해석 동의 여부.
3. 섹션 64px 상한을 모바일에도 그대로 둘지.
4. 차트에서 적/청 격리 문장에 동의하는지, 라인 차트 구간 색은 어떻게 할지 (Q-chart-2).
