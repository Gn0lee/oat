# ENV.md

> 환경변수 설정 가이드

## TL;DR

- **Supabase** - URL, anon key, service role key 필수
- **환율 API** - ExchangeRate-API 키 (월 1,500회 무료)
- **주가 API** - RapidAPI Yahoo Finance 키
- **`.env.local`** - 로컬 개발용 (`.gitignore`에 포함)

---

## 환경변수 목록

### 필수 (Required)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 (클라이언트용) | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (서버 전용) | `eyJhbG...` |
| `EXCHANGERATE_API_KEY` | 환율 API 키 | `abc123...` |
| `RAPIDAPI_KEY` | RapidAPI 키 (Yahoo Finance) | `xyz789...` |

### 선택 (Optional)

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NEXT_PUBLIC_APP_URL` | 앱 URL | `http://localhost:3000` |
| `LOG_LEVEL` | 로그 레벨 | `info` |

---

## 환경별 설정

### 로컬 개발

```bash
# .env.local 파일 생성
cp .env.example .env.local
```

`.env.local` 파일에 실제 값 입력:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# APIs
EXCHANGERATE_API_KEY=your-exchangerate-api-key
RAPIDAPI_KEY=your-rapidapi-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel 배포

Vercel 대시보드 > Settings > Environment Variables에서 설정:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `EXCHANGERATE_API_KEY`
5. `RAPIDAPI_KEY`
6. `NEXT_PUBLIC_APP_URL` (배포 도메인)

---

## API 키 발급 가이드

### Supabase

1. [supabase.com](https://supabase.com) 접속
2. 새 프로젝트 생성
3. Settings > API에서 확인:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY`

### ExchangeRate-API

1. [exchangerate-api.com](https://www.exchangerate-api.com) 접속
2. 무료 계정 생성 (월 1,500회 제한)
3. API Key 복사 → `EXCHANGERATE_API_KEY`

### RapidAPI (Yahoo Finance)

1. [rapidapi.com](https://rapidapi.com) 접속
2. 계정 생성 및 로그인
3. [Yahoo Finance API](https://rapidapi.com/apidojo/api/yahoo-finance1) 구독
4. Dashboard에서 API Key 복사 → `RAPIDAPI_KEY`

---

## 보안 주의사항

| 변수 | 공개 가능 | 설명 |
|------|----------|------|
| `NEXT_PUBLIC_*` | O | 클라이언트에 노출됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | **X** | RLS 우회 가능, 서버에서만 사용 |
| `EXCHANGERATE_API_KEY` | **X** | API 호출 제한 관리 |
| `RAPIDAPI_KEY` | **X** | 과금 연동됨 |

**절대 커밋하지 말 것:**
- `.env.local`
- `.env.production.local`
- 실제 API 키가 포함된 모든 파일

---

## TypeScript 타입 (env.d.ts)

```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // APIs
    EXCHANGERATE_API_KEY: string;
    RAPIDAPI_KEY: string;

    // App
    NEXT_PUBLIC_APP_URL?: string;
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  }
}
```

---

## 환경변수 검증

앱 시작 시 필수 환경변수 확인:

```typescript
// lib/env.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EXCHANGERATE_API_KEY',
  'RAPIDAPI_KEY',
] as const;

export function validateEnv() {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}
```
