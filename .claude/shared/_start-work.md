# 작업 시작하기 (공통)

> 이 문서는 next-task, resume-task에서 공통으로 참조하는 작업 시작 프로세스입니다.

## 입력

- `이슈 번호`: 작업할 GitHub 이슈 번호

## 프로세스

### 1. 이슈 상세 조회

```bash
gh issue view [이슈 번호]
```

- 조회 실패 시 → "이슈를 찾을 수 없습니다. 이슈 번호를 확인해주세요." 출력 후 종료

### 2. Skill 활성화

이슈 라벨에 따라 적절한 skill 활성화:

| 라벨 | Skill | 참조 문서 |
|------|-------|----------|
| `backend`, `database` | db-work | DATABASE.md |
| `frontend`, `ui` | ui-work | DESIGN.md, CONVENTIONS_FE.md |
| `api` | api-work | API.md, CONVENTIONS_BE.md |
| 그 외 | feature-work | PRD.md, CONVENTIONS.md |

### 3. Plan 모드로 작업 계획 수립

Plan 모드에 진입하여 작업 계획을 수립합니다:

1. **이슈 분석**: 요구사항, 수용 기준(AC) 파악
2. **코드베이스 탐색**: 관련 파일, 기존 패턴 확인
3. **구현 계획 작성**: 단계별 작업 목록 작성
4. **사용자 승인 요청**: 계획 검토 후 승인 받기

### 4. 작업 시작

사용자 승인 후 계획에 따라 구현을 시작합니다.
