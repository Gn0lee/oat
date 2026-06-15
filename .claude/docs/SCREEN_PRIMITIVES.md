# SCREEN_PRIMITIVES.md

> #384 공통 화면 primitive 기준. 후속 UI 개선 이슈(#385~#394)는 화면별 재설계 전에 이 문법을 먼저 검토합니다.

## 목적

Screen primitive는 oat 앱 화면의 섹션, 목록, 행, metric, 상태, 금액 표시 문법을 맞추기 위한 얇은 공통 컴포넌트입니다. 도메인 로직이나 데이터 계산을 소유하지 않고, 각 화면이 같은 스캔 패턴과 affordance를 공유하도록 돕습니다.

위치:

```txt
components/layout/screen/
```

## Primitive

| Primitive | 역할 | 사용 기준 |
|-----------|------|-----------|
| `ScreenSection` | 화면 안의 의미 있는 섹션 간격 | 섹션 자체를 카드로 감싸지 않을 때 |
| `SectionHeader` | 섹션 제목, 설명, 우측 액션 | 목록/metric 묶음 위의 짧은 heading |
| `GroupedList` | row 묶음 surface | 설정, 허브 진입점, 관리 목록 |
| `EntryRow` | 대표 텍스트, 보조 정보, trailing 값/상태, disclosure/action | 반복 목록 row와 top-level 진입점 |
| `MetricBlock` | 단일 강조 지표 | 총액, 월 지출, 수익률처럼 강조해야 하는 값 |
| `MetricStrip` | 관련 metric의 얇은 반응형 배치 | 수입/지출/남은 금액처럼 비교가 필요한 묶음 |
| `ScreenState` | empty/error/full-area loading 상태 | 데이터가 없거나 화면 전체를 불러오지 못한 경우 |
| `AmountText` | 금액/수익률 텍스트 안정 표시 | row, metric, summary 안의 기본 금액 typography |

## 사용 원칙

- `components/ui`의 일반 atom이 아니라 oat 앱 화면 문법입니다. 도메인 컴포넌트는 이 primitive를 조합하되, 금융/가구 규칙은 자기 영역에 둡니다.
- `GroupedList`는 조용한 row surface입니다. `bg-white`, divider, 얕은 ring, 작은 radius는 허용하지만 기본 shadow나 큰 card 스타일은 쓰지 않습니다.
- `EntryRow`는 typed props를 기본으로 사용합니다. title, description, icon, trailing, disclosure/action을 표준화하고, 도메인별 우측 값은 `trailing` slot으로 넣습니다.
- Hub 화면의 `EntryRow`는 navigation-first입니다. 같은 화면 상단에 이미 보이는 요약 숫자를 반복하지 말고, description 중심으로 다음 행동을 설명합니다.
- 비활성 row의 `준비 중` 같은 상태 표시는 요약 데이터가 아니라 affordance이므로 trailing에 둘 수 있습니다.
- `MetricStrip`은 layout만 담당합니다. 어떤 metric을 보여줄지, 어떤 값을 계산할지는 후속 화면 이슈에서 결정합니다.
- `ScreenState`는 전체 영역의 empty/error/loading에 사용합니다. 실제 목록의 loading skeleton row는 각 리스트에서 별도로 구성합니다.
- `AmountText`가 기본 금액 표시 primitive입니다. `AmountWithPopover`는 deprecated이며, 전체 금액 disclosure가 꼭 필요한 legacy 화면에서만 유지합니다.

## Amount Tone

금액 색상 prop은 색 이름이나 `positive`/`negative`보다 의미를 드러내는 이름을 사용합니다.

| Tone | 의미 | 기본 색상 |
|------|------|-----------|
| `income` | 가계부 수입 | 빨강 |
| `expense` | 가계부 지출 | 파랑 |
| `increase` | 수익률/시장 상승 | 빨강 |
| `decrease` | 수익률/시장 하락 | 파랑 |
| `neutral` | 방향성이 없는 금액 | 진한 회색 |
| `muted` | 보조/비활성 금액 | 연한 회색 |

한국식 금융 색상 기준으로 상승/수입은 빨강, 하락/지출은 파랑을 사용합니다.

## 후속 이슈 적용 기준

- #385 허브 화면은 기존 카드형 링크를 `ScreenSection` + `GroupedList` + `EntryRow` 중심으로 전환합니다. `/home`은 `가계부`, `자산`만 핵심 진입점으로 두고, `/ledger`, `/assets`, `/settings`는 핵심 행동과 관리 행동을 섹션으로 분리합니다.
- #386, #389 분석 화면은 metric이 실제 비교 단위일 때만 `MetricBlock`/`MetricStrip`을 사용합니다. 차트나 분석 패널 전체를 metric primitive로 대체하지 않습니다.
- #388 금액/긴 텍스트 정책은 `AmountText`를 기본값으로 삼고, popover나 축약 표시 임계값은 별도 정책으로 결정합니다.
- #391, #390 관리/설정 목록은 `GroupedList`와 `EntryRow`를 우선 검토합니다.
- #392 캘린더와 상세 화면은 기존 구조를 유지하되 row overflow와 금액 표시를 `EntryRow`/`AmountText` 기준에 맞춥니다.

## 예시

```tsx
<ScreenSection>
  <SectionHeader title="기능" />
  <GroupedList>
    <EntryRow
      href="/ledger/records"
      icon={CalendarDays}
      title="기록 조회"
      description="달력에서 수입/지출 내역 확인"
    />
    <EntryRow
      title="이번 달 지출"
      description="공용 기준"
      trailing={<AmountText amount={1850000} tone="expense" />}
    />
  </GroupedList>
</ScreenSection>
```

```tsx
<MetricStrip columns={{ base: 2, md: 3 }}>
  <MetricBlock
    label="수입"
    value={<AmountText amount={3200000} tone="income" />}
  />
  <MetricBlock
    label="지출"
    value={<AmountText amount={1850000} tone="expense" />}
  />
  <MetricBlock
    label="남은 금액"
    value={<AmountText amount={1350000} />}
    emphasis
  />
</MetricStrip>
```
