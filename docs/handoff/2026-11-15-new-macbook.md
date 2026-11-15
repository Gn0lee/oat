# 새 맥북 인계: 전면 개편 지도 작업

작성일: 2026-11-15. 다음 세션부터 새 맥북에서 [oat 전면 개편 지도](https://github.com/Gn0lee/oat/issues/507)를 이어서 진행해요. 결정 내용은 GitHub 이슈와 이 브랜치의 문서에 모두 있어요. 이 문서에는 **이전 맥북에만 있던 것**만 모았어요.

## 1. 결정은 어디에 있나

새로 쓰지 않고 아래를 읽으면 돼요.

- 지도: [oat 전면 개편 지도](https://github.com/Gn0lee/oat/issues/507). Notes, Decisions so far, Not yet specified가 여기 있어요
- 용어: `GLOSSARY.md` (이 브랜치)
- ADR: `docs/adr/0004` ~ `0009` (0001~0003은 기존 앱 것이라 개편의 기준이 아니에요)
- 리서치: `docs/research/`
- 티켓별 결정은 각 티켓의 마지막 "## 결정" 코멘트에 있어요

남은 티켓(2026-11-15 기준, 모두 지도 하위):

| 티켓 | 라벨 |
|---|---|
| [통계: 실제로 매달 확인하고 싶은 질문 목록](https://github.com/Gn0lee/oat/issues/509) | wayfinder:grilling |
| [브랜드: 서비스명 유지/변경과 색상 방향](https://github.com/Gn0lee/oat/issues/510) | wayfinder:grilling |
| [앱 스택 PoC: 가계부 입력 화면 직접 써보기](https://github.com/Gn0lee/oat/issues/521) | wayfinder:prototype |
| [서버 아키텍처: 레포 구조·프레임워크·API 방식·권한 모델](https://github.com/Gn0lee/oat/issues/522) | wayfinder:grilling |

지도의 Not yet specified(물리 DB 스키마, 입력 UX, MCP, 이관, 알림, 출시 준비, 빌려준 돈)는 아직 티켓이 없어요.

## 2. 이전 맥북 메모리에만 있던 내용

Claude Code 자동 메모리(`~/.claude/projects/<프로젝트 경로>/memory/`)는 기기마다 따로 있어요. 새 맥북에서는 비어 있으니 아래 내용을 기준으로 삼아요. 필요하면 메모리로 다시 저장해요.

### 개편 작업 규칙

- **서비스 전면 개편(2026-11-11 결정)**: 새 레포에서 초석부터 다시 설계해요. 기존 CLAUDE.md, `.claude/docs/*`, 기존 코드 구조는 기준이 아니에요("이전 CLAUDE.md는 잊어도 됨"). 기존 코드와 DB는 현재 불편 파악과 데이터 이관에만 참고해요. 이전 미해결 이슈와 디자인 지도(#498)는 모두 닫았어요. 디자인 지도의 Monarch/Ember 결정은 브랜드 티켓의 입력 자료예요. 예전에 정한 "MCP 미사용·삭제"는 뒤집었어요(MCP는 CRUD만 제공)
- **설계 브랜치**: 문서는 `overhaul/design`에 모으고 main에는 합치지 않아요. 티켓 세션은 `origin/overhaul/design`에서 `Gn0lee/wayfinder-<번호>-<이름>` 브랜치와 워크트리를 따요. 끝나면 최신 `origin/overhaul/design`을 merge한 뒤 `git push origin HEAD:overhaul/design`으로 PR 없이 올려요. `overhaul/design`을 워크트리에 직접 체크아웃해두지 않아요(다른 워크트리를 막아요). 이렇게 정한 이유는 두 가지예요. 브랜치를 쌓으면 세션마다 앞 브랜치를 merge해야 했고, main에 올리면 기존 앱의 GLOSSARY·ADR과 섞이고 Vercel 배포가 돌기 때문이에요
- **티켓 마무리 순서**(지금까지의 관례): ① GLOSSARY·ADR 커밋 → merge → push ② 티켓에 "## 결정" 코멘트(결정 요약 + 표 + 넘긴 것) ③ 지도 Decisions so far에 한 줄 추가(코멘트 링크) ④ 티켓 닫기. 다른 티켓으로 넘길 요구사항은 그 티켓에 코멘트로 남겨요
- **매 세션** `grilling`과 `domain-modeling` 스킬을 호출해요(지도 Notes)

### 사용자 선호

- **UI는 토스·현대카드처럼 미니멀하게**: 큰 숫자, 단순한 행, 칩·아이콘 위주의 가벼운 조작을 써요. 설명 박스, 중첩 카드, 중복 안내는 넣지 않아요. 세부 UI는 이 기준으로 직접 정하고 객관식으로 잘게 묻지 않아요. 기능 범위가 바뀌는 결정만 확인받아요
- **단순 작업은 낮은 모델에게 맡겨요**: 조율할 때 리뷰 반영, 스크린샷, 문서 수정, 링크 코멘트 같은 일은 sonnet/haiku 워커에게 시키고 결과를 점검해서 피드백을 줘요. 구현 워커는 `/implement` 스킬로 시작해요(커밋까지만 하므로 PR 단계는 브리프에 따로 적어요). Orca로 띄울 때는 `orca worktree create`(agent 없이) → `orca terminal create --command 'claude --model sonnet'` → `terminal wait --for tui-idle` → `terminal send` 순서예요. 설계 판단이 필요한 일은 상위 모델이 맡아요
- **설계 질문은 grilling 형식으로**: 번호 붙인 질문과 추천안을 제시해요. 사용자는 추천안을 받아들이더라도 "좀 더 고민해보자"며 개념을 깊게 묻는 편이에요. 그럴 때는 다음 질문으로 넘어가지 말고 구조부터 설명해요(예: 지갑 축과 장부 축)

### 기존 앱(운영 중인 oat) 관련

개편과는 무관하지만, 기존 앱을 손볼 일이 생기면 참고해요.

- [#428](https://github.com/Gn0lee/oat/issues/428) iPhone PWA 입력 드로어 수정은 써보니 불편해서 #439로 일부러 되돌렸어요. 운영 빌드에 그 동작이 없는 게 의도예요. 되살리자고 제안하지 않아요
- 장부 아이콘(#457 본문의 "이미 정한 것")은 2026-10-06에 폐기했어요
- 묶음 배포는 하위 티켓 PR을 통합 브랜치로 모은 뒤 마지막 티켓에서 한꺼번에 main에 머지해요(#458 방식)

## 3. 새 맥북에 설치할 것

### 스킬

사용자 스킬은 `~/.agents/skills`에 설치되어 있고, `~/.claude/skills`에서 심볼릭 링크로 연결돼요(skills CLI 방식). 출처는 이래요.

| 출처 | 쓰는 스킬 |
|---|---|
| `mattpocock/skills` (38개) | wayfinder, grilling, domain-modeling, research, prototype, handoff, implement, to-tickets, triage, code-review, tdd 등 |
| `stablyai/orca` | orca-cli |
| `Leonxlnx/taste-skill` (13개) | design-taste-frontend 등 UI 취향 스킬 |
| `vercel-labs/skills` | find-skills |

이전 맥북의 `~/.agents/.skill-lock.json`을 옮기거나, `npx skills add <출처>`로 다시 설치해요. 이전 세션에서는 `wayfinder`가 모델이 부를 수 있는 스킬 목록에 나타나지 않았어요. `/wayfinder`로 직접 호출해도 반응하지 않으면 그 스킬의 frontmatter를 확인해요.

### Claude Code 플러그인

`~/.claude/settings.json`의 `enabledPlugins`: superpowers, feature-dev, code-simplifier, skill-creator, commit-commands, typescript-lsp, security-guidance, chrome-devtools-mcp, frontend-design(이상 `claude-plugins-official`), humanize-korean(`im-not-ai` 마켓플레이스). 설정 파일을 그대로 옮기는 게 가장 간단해요. `extraKnownMarketplaces`도 그 안에 있어요.

### 도구와 인증

- `gh` CLI 로그인. 이슈 트래커는 `Gn0lee/oat`이에요
- Orca(워크트리를 `~/orca/workspaces/oat/<브랜치 이름>`에 만들어요)
- 기존 앱 레포의 `.env.local`(값은 이 문서에 적지 않아요. 이전 맥북에서 직접 옮겨요). 개편 설계 작업에는 필요 없고, 기존 앱을 실행할 때만 필요해요

## 4. 다음 세션 시작 프롬프트 예시

```
/wayfinder https://github.com/Gn0lee/oat/issues/507 지도에서 '<티켓 제목>'(<티켓 URL>) 티켓을 진행해줘.
이 워크트리는 overhaul/design에서 땄어. 끝나면 최신 origin/overhaul/design을 merge하고
git push origin HEAD:overhaul/design으로 올려줘. 시작 전에 docs/handoff/2026-11-15-new-macbook.md,
GLOSSARY.md, docs/adr/0004~0009, 관련 리서치와 앞선 결정 티켓의 결정 코멘트를 읽어줘.
```

## 추천 스킬

- `grilling`, `domain-modeling`: 매 세션(지도 규칙)
- `wayfinder`: 지도와 티켓 진행
- `research`: 사실 조사가 필요한 티켓
- `prototype`: 앱 스택 PoC 티켓
- `orca-cli`: 워크트리와 워커 조율
