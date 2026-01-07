---
description: 현재 브랜치의 이슈를 조회하고 작업을 이어갑니다
allowed-tools: Bash(gh:*), Bash(git:*)
---

# 작업 이어가기

> worktree로 생성된 디렉토리에서 새 Claude 세션을 시작할 때 사용합니다.

## 1단계: 현재 브랜치 확인

```bash
git branch --show-current
```

## 2단계: 브랜치 유형 판별

| 브랜치 패턴 | 동작 |
|------------|------|
| `main`, `master` | "작업 중인 이슈가 없습니다. `/next-task`로 새 작업을 시작하세요." 출력 후 종료 |
| `feature/[번호]-...` | 이슈 번호 추출 후 3단계 진행 |
| `fix/[번호]-...` | 이슈 번호 추출 후 3단계 진행 |
| `hotfix/[번호]-...` | 이슈 번호 추출 후 3단계 진행 |
| 그 외 | "브랜치명에서 이슈 번호를 찾을 수 없습니다." 출력 후 종료 |

### 이슈 번호 추출 규칙

브랜치명에서 `/` 뒤의 첫 번째 숫자를 이슈 번호로 추출:
- `feature/42-add-login` → `42`
- `fix/123-bug-fix` → `123`

## 3단계: PR 확인 및 생성

### 3-1. 해당 브랜치의 PR 존재 확인

```bash
gh pr list --head [현재브랜치명] --state open --json number,url
```

### 3-2. PR 상태에 따른 분기

| 상태 | 동작 |
|------|------|
| PR 있음 | PR 정보 표시 후 4단계로 진행 |
| PR 없음 + 로컬 커밋 있음 | 원격에 push 후 Draft PR 생성, 4단계로 진행 |
| PR 없음 + 로컬 커밋 없음 | PR 없이 4단계로 진행 |

### 로컬 커밋 확인 방법

```bash
# main 브랜치 대비 새 커밋이 있는지 확인
git log origin/main..HEAD --oneline
```

### Draft PR 생성 (커밋이 있을 때)

```bash
# 원격에 push
git push -u origin [현재브랜치명]

# Draft PR 생성
gh pr create --draft --title "[WIP] #[이슈번호] 이슈제목" --body "Closes #[이슈번호]"
```

## 4단계: 작업 시작

`.claude/shared/_start-work.md` 프로세스를 따릅니다:

1. 이슈 상세 조회 (실패 시 종료)
2. 이슈 라벨에 따라 skill 활성화
3. Plan 모드로 작업 계획 수립
4. 사용자 승인 후 작업 시작
