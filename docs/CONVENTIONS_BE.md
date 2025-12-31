# CONVENTIONS_BE.md

> 백엔드/API 컨벤션. 공통 사항은 CONVENTIONS.md 참조.

## TL;DR

- **Supabase 직접 호출** - 단순 CRUD (RLS가 권한 처리)
- **API Route 경유** - 외부 API, 복잡한 로직, 캐싱 필요 시
- **에러 표준화** - `{ error: { code, message } }` 형식
- **인증 체크** - 모든 API Route에서 세션 확인
- **환경 변수** - 민감 정보는 서버 전용 변수로

---

## 1. Supabase vs API Route

### 선택 기준

| 상황 | 선택 |
|------|------|
| 단순 CRUD | Supabase Client 직접 호출 |
| 외부 API 연동 | API Route |
| 복잡한 집계/계산 | API Route |
| 캐싱/rate limiting | API Route |
| 민감한 로직 | API Route |

### Supabase 직접 호출

RLS가 권한을 처리하므로 프론트에서 직접 호출 가능:

```typescript
// 프론트엔드에서 직접
const { data } = await supabase
  .from('holdings')
  .select('*')
  .eq('household_id', householdId);
```

---

## 2. API Route 구조

### 파일 구조

```
app/api/
├── invitations/
│   ├── route.ts              # POST: 생성
│   └── [code]/
│       ├── route.ts          # GET: 조회
│       └── accept/
│           └── route.ts      # POST: 수락
├── stocks/
│   ├── search/
│   │   └── route.ts          # GET: 검색
│   └── prices/
│       └── route.ts          # GET/POST: 현재가
├── exchange/
│   └── route.ts              # GET: 환율
└── dashboard/
    └── summary/
        └── route.ts          # GET: 요약
```

### 기본 패턴

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // 인증 체크
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }
    
    // 로직
    const result = await doSomething();
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
```

---

## 3. 인증 & 권한

### 인증 헬퍼

```typescript
// lib/api/auth.ts
export async function getAuthUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new APIError('UNAUTHORIZED', '로그인이 필요합니다.', 401);
  }
  
  return user;
}

export async function checkHouseholdAccess(
  supabase: SupabaseClient, 
  userId: string, 
  householdId: string
) {
  const { data } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .single();
    
  if (!data) {
    throw new APIError('FORBIDDEN', '접근 권한이 없습니다.', 403);
  }
  
  return data.role;
}
```

### 사용

```typescript
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const user = await getAuthUser(supabase);
  await checkHouseholdAccess(supabase, user.id, householdId);
  // ...
}
```

---

## 4. 에러 처리

### APIError 클래스

```typescript
// lib/api/error.ts
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}
```

### 에러 코드 네이밍

`DOMAIN_ERROR_TYPE` 형식:

| 코드 | 설명 |
|------|------|
| AUTH_UNAUTHORIZED | 인증 필요 |
| AUTH_FORBIDDEN | 권한 없음 |
| INVITATION_NOT_FOUND | 초대 코드 없음 |
| INVITATION_EXPIRED | 초대 코드 만료 |
| EXTERNAL_API_ERROR | 외부 API 실패 |
| RATE_LIMIT_EXCEEDED | 요청 한도 초과 |

### 에러 응답 형식

```typescript
// 성공
{ data: { ... } }
// 또는
{ items: [...], count: 10 }

// 실패
{ error: { code: 'ERROR_CODE', message: '사용자 친화적 메시지' } }
```

---

## 5. 외부 API 연동

### 환율 API Provider 패턴

API 교체가 용이하도록 Provider 인터페이스로 추상화:

```typescript
// lib/exchange/types.ts
export interface ExchangeRateResult {
  rate: number;
  nextUpdateTime: number; // Unix timestamp (ms)
}

export interface ExchangeRateProvider {
  fetchRate(from: string, to: string): Promise<ExchangeRateResult>;
}
```

```typescript
// lib/exchange/providers/exchangerate-api.ts
export class ExchangeRateAPIProvider implements ExchangeRateProvider {
  async fetchRate(from: string, to: string): Promise<ExchangeRateResult> {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/pair/${from}/${to}`
    );
    const data = await res.json();

    return {
      rate: data.conversion_rate,
      nextUpdateTime: data.time_next_update_unix * 1000,
    };
  }
}
```

### 캐싱 (API 응답 기반)

API가 알려주는 `time_next_update_utc` 기반으로 캐싱 (프리티어는 일 1회 갱신):

```typescript
// lib/exchange/cache.ts
import { ExchangeRateProvider, ExchangeRateResult } from './types';

let cachedRate: { value: number; nextUpdateTime: number } | null = null;

export function createExchangeRateService(provider: ExchangeRateProvider) {
  return async function getExchangeRate(from: string, to: string): Promise<number> {
    const now = Date.now();

    // 다음 업데이트 시간 전이면 캐시 반환
    if (cachedRate && now < cachedRate.nextUpdateTime) {
      return cachedRate.value;
    }

    const result = await provider.fetchRate(from, to);
    cachedRate = {
      value: result.rate,
      nextUpdateTime: result.nextUpdateTime,
    };
    return cachedRate.value;
  };
}
```

```typescript
// lib/exchange/index.ts
import { ExchangeRateAPIProvider } from './providers/exchangerate-api';
import { createExchangeRateService } from './cache';

const provider = new ExchangeRateAPIProvider();
export const getExchangeRate = createExchangeRateService(provider);
```

### 재시도 (Exponential Backoff)

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Rate Limiting 대응

```typescript
// 요청 전 체크
if (isRateLimited()) {
  throw new APIError('RATE_LIMIT_EXCEEDED', '잠시 후 다시 시도해주세요.', 429);
}
```

---

## 6. 환경 변수

### 네이밍

| 접두사 | 용도 |
|--------|------|
| `NEXT_PUBLIC_` | 클라이언트 노출 가능 |
| 없음 | 서버 전용 |

### 예시

```env
# 서버 전용 (민감)
SUPABASE_SERVICE_ROLE_KEY=...
EXCHANGE_API_KEY=...

# 클라이언트 허용
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 7. 유효성 검사

### zod로 요청 검증

```typescript
import { z } from 'zod';

const createTransactionSchema = z.object({
  ticker: z.string().min(1),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  price: z.number().min(0),
  transacted_at: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = createTransactionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.message } },
      { status: 400 }
    );
  }
  
  const data = result.data;
  // ...
}
```

---

## 8. 테스트

### API Route 테스트

```typescript
// app/api/example/route.test.ts
import { GET } from './route';
import { NextRequest } from 'next/server';

describe('GET /api/example', () => {
  it('returns data for authenticated user', async () => {
    const request = new NextRequest('http://localhost/api/example');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
  });
});
```

---

> 코드 예시: **EXAMPLES.md** 참조