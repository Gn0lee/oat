---
name: api-work
description: API 엔드포인트, 서버 로직, 백엔드 관련 작업 시 사용. "API 생성", "엔드포인트", "서버", "백엔드", "Route Handler" 등의 요청에 활성화됩니다.
---

# API 작업 가이드

이 작업을 시작하기 전에 반드시 다음 문서를 읽어주세요:

@.claude/docs/API.md
@.claude/docs/CONVENTIONS_BE.md
@.claude/docs/DATABASE.md

## 핵심 규칙

### API 설계 원칙
- RESTful 설계
- Next.js App Router의 Route Handler 사용
- Supabase RLS로 데이터 접근 제어

### 응답 형식
```typescript
// 성공
{ data: T }

// 에러
{ error: { code: string, message: string } }
```

### 파일 위치
- API Routes: `app/api/[resource]/route.ts`
- 서버 유틸: `lib/api/`

### 에러 처리
- 적절한 HTTP 상태 코드 사용
- 에러 메시지는 사용자 친화적으로
