# ENV.md

> 환경변수 설정 가이드

## TL;DR

- **Supabase** - URL, publishable key, secret key 필수
- **환율 API** - ExchangeRate-API 키 (GitHub Actions에서 사용)
- **GitHub Actions** - 종목/환율 동기화용 secrets 설정 필요
- **`.env.local`** - 로컬 개발용 (`.gitignore`에 포함)

---

## 환경변수 목록

### 필수 (Required)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 공개 키 (클라이언트용) | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | Supabase 비밀 키 (서버 전용) | `sb_secret_...` |

> **Note**: 환율/종목 데이터는 GitHub Actions로 동기화되므로 Vercel에서 외부 API 키가 필요 없음

> **Note**: Supabase는 2025년부터 새로운 API 키 시스템으로 전환했습니다.
> 기존 `anon`/`service_role` 키는 legacy이며, 신규 프로젝트는 `publishable`/`secret` 키를 사용합니다.
> 자세한 내용은 [Supabase API Keys 문서](https://supabase.com/docs/guides/api/api-keys) 및
> [마이그레이션 가이드](https://github.com/orgs/supabase/discussions/29260)를 참고하세요.

### 선택 (Optional)

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NEXT_PUBLIC_APP_URL` | 앱 URL | `http://localhost:3000` |
| `LOG_LEVEL` | 로그 레벨 | `info` |

### GitHub Actions Secrets

GitHub Actions에서 종목/환율 동기화에 사용. GitHub Repository > Settings > Secrets에 설정.

| Secret명 | 설명 | 용도 |
|----------|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | DB 접근 |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable 키 | 시스템 테이블 접근 (RLS 미적용) |
| `EXCHANGE_API_KEY` | ExchangeRate-API 키 | 환율 조회 |

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel 배포

Vercel 대시보드 > Settings > Environment Variables에서 설정:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. `SUPABASE_SECRET_KEY`
4. `NEXT_PUBLIC_APP_URL` (배포 도메인)

### GitHub Actions 설정

GitHub Repository > Settings > Secrets and variables > Actions에서 설정:

1. `SUPABASE_URL` - Supabase 프로젝트 URL
2. `SUPABASE_PUBLISHABLE_KEY` - Supabase publishable 키
3. `EXCHANGE_API_KEY` - ExchangeRate-API 키

---

## API 키 발급 가이드

### Supabase

1. [supabase.com](https://supabase.com) 접속
2. 새 프로젝트 생성
3. Settings > API에서 확인:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key (`sb_secret_...`) → `SUPABASE_SECRET_KEY`

> **참고**: 기존 프로젝트는 Settings > API Keys에서 새 키 시스템으로 opt-in 가능합니다.

### ExchangeRate-API

1. [exchangerate-api.com](https://www.exchangerate-api.com) 접속
2. 무료 계정 생성 (프리티어: 일 1회 갱신)
3. API Key 복사 → GitHub Secrets의 `EXCHANGE_API_KEY`

> **Note**: 프리티어는 일 1회 갱신이며, GitHub Actions에서만 사용하므로 충분합니다.

---

## 보안 주의사항

| 변수 | 공개 가능 | 설명 |
|------|----------|------|
| `NEXT_PUBLIC_*` | O | 클라이언트에 노출됨 |
| `SUPABASE_SECRET_KEY` | **X** | 서버에서만 사용 |
| `EXCHANGE_API_KEY` | **X** | GitHub Actions 전용 |

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
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
    SUPABASE_SECRET_KEY: string;

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
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
] as const;

export function validateEnv() {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}
```
