# 디자인 정본은 DESIGN.md이고, 디자인 스킬은 그것을 읽기만 한다

디자인 토큰의 정본은 Google Labs **DESIGN.md 형식**의 파일 하나다. 맨 위 YAML이 값(색은 `light`·`dark` 묶음)이고, 아래 글이 쓰는 규칙이다. 지금은 `docs/design/DESIGN.md`에 두고, 새 레포가 생기면 루트 `DESIGN.md`로 옮긴다. 결정의 이유는 `docs/adr/`에 둔다. 앱 코드의 토큰(`tokens.json`, RN 테마)은 이 파일에서 뽑는다(`npx @google/design.md export --format dtcg`).

디자인 스킬(체계: UI UX Pro Max, 다듬기: Impeccable, 세부: jakubkrehel/skills)은 결정을 자기 파일에 담지 않고 이 정본을 읽기만 한다. 새 레포의 CLAUDE.md에 "역할 → 스킬@커밋" 표를 두고, 더 나은 스킬이 나오면 그 줄과 설치만 바꾼다. 스킬마다 맥락 파일이 달라서(UI UX Pro Max는 `design-system/<프로젝트>/MASTER.md`, Impeccable은 `PRODUCT.md`·`DESIGN.md`, jakubkrehel은 코드의 토큰) 정본을 스킬 형식에 두면 바꿀 때마다 값을 손으로 옮겨야 한다.

UI UX Pro Max의 디자인 시스템 생성기는 레포를 읽지 않고 검색어를 스킬 안 CSV에 키워드로 맞춘다. oat에 돌리면 파랑 주색·Caveat 손글씨 글꼴·도넛 차트를 내놓아 이미 정한 브랜드와 부딪혔다. 그래서 생성기 결과는 쓰지 않고, 규칙 DB(React Native·접근성·차트)와 출시 전 점검표만 점검에 쓴다.

## Considered Options

- **UI UX Pro Max의 MASTER.md를 정본으로**: 그 스킬만 읽는 형식이라, 스킬을 바꾸면 변환해야 한다.
- **DTCG `tokens.json`만**: 표준이지만 쓰는 규칙을 담을 곳이 없어 에이전트가 맥락을 놓친다. DESIGN.md에서 뽑는 산출물로 둔다.

## Consequences

- `export --format dtcg`(0.4.0)는 `fontFeature`(금액의 `tnum`)를 빼고, 줄 높이를 단위 없는 숫자(배수로 읽힘)로 낸다. 투명도가 있는 색(`scrim`·`pressed`, 8자리 hex)은 `components`에 알파가 없고 `hex`에만 남는다. 앱 테마는 이 둘을 DESIGN.md YAML에서 직접 읽거나 내보낸 뒤 고친다.
- DESIGN.md 형식은 아직 alpha(`@google/design.md` 0.4.0)다. pt 단위가 없어 px로 적고 iOS pt와 1:1로 읽는다. 형식이 바뀌면 린터 결과를 보고 따라간다.
- 스킬 설치(`.claude/skills`, 커밋 고정)와 CLAUDE.md 역할 표는 새 레포를 만들 때 한다. 이 지도의 설계 브랜치에는 스킬을 넣지 않는다.
- 간격·모서리·컴포넌트 토큰은 다음 티켓 "주요 화면 시안"에서 같은 파일에 더한다. → 더했다(ADR 0035·0036, [화면 문법](../design/screen-grammar.md)).
