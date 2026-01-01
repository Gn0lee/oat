---
description: GitHub 이슈를 조회하고 다음 작업을 선택하여 브랜치를 생성합니다
allowed-tools: Bash(gh:*), Bash(git:*)
---

# 다음 작업 시작하기

## 1단계: 현재 열린 이슈 목록 조회

!`gh issue list --state open --limit 10`

## 2단계: 이슈 분석 및 추천

위 이슈 목록을 분석하여 다음 기준으로 작업할 이슈를 추천해주세요:

### 추천 기준
1. **의존성**: 다른 이슈에 의존하지 않는 독립적인 이슈 우선
2. **라벨**: `priority: high` > `priority: medium` > 라벨 없음
3. **크기**: 작은 단위의 작업 우선 (빠른 완료 가능)
4. **연관성**: 최근 작업과 연관된 이슈 (컨텍스트 활용)

### 사용자에게 추천
- 2-3개의 이슈를 추천하고 각각의 이유를 설명
- 사용자가 선택하도록 질문

## 3단계: 선택된 이슈로 작업 시작

사용자가 이슈를 선택하면:

1. **이슈 상세 조회**: `gh issue view [번호]`
2. **브랜치 생성**: `git checkout -b feature/[이슈번호]-[slug]`
3. **관련 문서 확인**: 이슈 라벨에 따라 적절한 skill 활성화
   - `backend`, `database` → db-work skill
   - `frontend`, `ui` → ui-work skill
   - `api` → api-work skill
   - 그 외 → feature-work skill

## 4단계: 작업 완료 후

1. 변경사항 커밋
2. PR 생성: `gh pr create`
3. 이슈 자동 종료: 커밋 메시지에 `Closes #[번호]` 포함
