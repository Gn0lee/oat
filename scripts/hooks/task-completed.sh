#!/bin/bash
# TaskCompleted 훅: 개발 태스크 완료 시 품질 게이트
#
# 태스크 제목에 "개발", "구현", "implement"가 포함된 경우에만
# type-check와 lint를 실행하여 품질을 검증합니다.
# 검증 실패 시 exit 2로 태스크 완료를 차단합니다.

SUBJECT="${CLAUDE_TASK_SUBJECT:-}"

# 개발/구현 태스크만 검증
if echo "$SUBJECT" | grep -qiE "(개발|구현|implement|TDD)"; then
  echo "품질 검증 실행 중..." >&2

  # type-check
  if ! pnpm type-check 2>&1; then
    echo "type-check 실패. 타입 에러를 수정한 후 다시 완료해주세요." >&2
    exit 2
  fi

  # lint
  if ! pnpm biome check . 2>&1; then
    echo "lint 실패. biome 에러를 수정한 후 다시 완료해주세요." >&2
    exit 2
  fi

  echo "품질 검증 통과" >&2
fi

exit 0
