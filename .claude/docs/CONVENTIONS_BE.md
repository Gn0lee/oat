# CONVENTIONS_BE.md

> 백엔드/API 컨벤션. 공통 사항은 CONVENTIONS.md 참조.

## TL;DR

- **Supabase 직접 호출** - 단순 CRUD (RLS가 권한 처리)
- **API Route 경유** - 복잡한 집계/계산, 대시보드 요약
- **GitHub Actions** - 종목 마스터/환율 일 1회 동기화
- **에러 표준화** - `{ error: { code, message } }` 형식
- **인증 체크** - 모든 API Route에서 세션 확인
- **환경 변수** - 민감 정보는 서버 전용 변수로

---

## 1. Supabase vs API Route

### 선택 기준

| 상황 | 선택 |
|------|------|
| 단순 CRUD | Supabase Client 직접 호출 |
| 종목 검색 | Supabase (stock_master 테이블) |
| 환율 조회 | Supabase (exchange_rates 테이블) |
| 복잡한 집계/계산 | API Route |
| 대시보드 요약 | API Route |
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
└── dashboard/
    └── summary/
        └── route.ts          # GET: 요약
```

> **Note**: 종목 검색/환율 조회는 API Route 없이 Supabase 직접 호출

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

## 5. GitHub Actions 데이터 동기화

### 개요

Vercel 서버리스 함수의 cold start 특성상 전역 변수 캐싱이 불안정하므로, 외부 API 데이터는 GitHub Actions로 주기적으로 DB에 동기화.

| 데이터 | 소스 | 동기화 주기 | 테이블 |
|--------|------|-------------|--------|
| 종목 마스터 | KIS 마스터파일 | 매일 08:00 KST | stock_master |
| 환율 | ExchangeRate-API | 매일 08:00 KST | exchange_rates |

### 워크플로우 구조

```yaml
# .github/workflows/sync-data.yml
name: Sync Stock & Exchange Data

on:
  schedule:
    - cron: '0 23 * * *'  # UTC 23:00 = KST 08:00
  workflow_dispatch:       # 수동 실행 가능

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Sync stock master
        run: pnpm run sync:stocks
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}

      - name: Sync exchange rates
        run: pnpm run sync:exchange
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
          EXCHANGE_API_KEY: ${{ secrets.EXCHANGE_API_KEY }}
```

### 동기화 스크립트 패턴

```typescript
// scripts/sync-exchange.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
);

async function syncExchangeRates() {
  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/pair/USD/KRW`
  );
  const data = await res.json();

  await supabase
    .from('exchange_rates')
    .upsert({
      from_currency: 'USD',
      to_currency: 'KRW',
      rate: data.conversion_rate,
      updated_at: new Date().toISOString(),
    });

  console.log(`Exchange rate synced: 1 USD = ${data.conversion_rate} KRW`);
}

syncExchangeRates();
```

### 앱에서 조회

```typescript
// lib/api/exchange.ts
export async function getExchangeRate(
  supabase: SupabaseClient,
  from: 'USD' | 'KRW',
  to: 'USD' | 'KRW'
): Promise<number> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .single();

  if (error || !data) {
    throw new Error('Exchange rate not found');
  }

  return data.rate;
}
```

### 재시도 (GitHub Actions 레벨)

```yaml
- name: Sync with retry
  uses: nick-fields/retry@v2
  with:
    timeout_minutes: 5
    max_attempts: 3
    command: pnpm run sync:stocks
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
SUPABASE_SECRET_KEY=...
EXCHANGE_API_KEY=...

# 클라이언트 허용
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
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