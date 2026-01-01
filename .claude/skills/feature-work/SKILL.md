---
name: feature-work
description: 새로운 기능 구현, 요구사항 분석 관련 작업 시 사용. "기능 구현", "기능 추가", "요구사항", "사용자 플로우", "MVP" 등의 요청에 활성화됩니다.
---

# 기능 구현 가이드

이 작업을 시작하기 전에 반드시 다음 문서를 읽어주세요:

@.claude/docs/PRD.md
@.claude/docs/CONVENTIONS.md
@.claude/docs/EXAMPLES.md

## 핵심 규칙

### 프로젝트 개요
- **oat**: 가족 자산 통합 관리 서비스
- 가족 구성원의 투자 자산을 한 대시보드에서 조회
- transactions 기반 구조 → holdings View로 현재 보유량 집계

### MVP 기능
1. 회원가입/로그인 (Supabase Auth)
2. 부부 연결 (초대 코드)
3. 거래 등록 (매수/매도)
4. 보유 현황 조회
5. 대시보드 (총자산, 수익률, 비중 차트)

### 구현 원칙
- 단순함 유지: 필요한 것만 구현
- 컨벤션 준수: CONVENTIONS.md 참고
- 예시 참고: EXAMPLES.md의 코드 패턴 활용
