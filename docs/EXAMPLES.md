# EXAMPLES.md

> 코드 예시 모음. 컨벤션 문서의 패턴을 구체적으로 참고할 때 사용.

---

# Frontend

## 1. Query Key Factory

```typescript
// lib/queries/index.ts
import { createQueryKeyStore } from '@lukemorales/query-key-factory';
import { fetchHoldings } from '@/lib/api/holdings';
import { fetchTransactions } from '@/lib/api/transactions';

export const queries = createQueryKeyStore({
  holdings: {
    all: null,
    list: (householdId: string) => ({
      queryKey: [householdId],
      queryFn: () => fetchHoldings(householdId),
    }),
  },
  transactions: {
    all: null,
    list: (householdId: string) => ({
      queryKey: [householdId],
      queryFn: () => fetchTransactions(householdId),
    }),
  },
  exchange: {
    rate: (from: 'USD' | 'KRW', to: 'USD' | 'KRW') => ({
      queryKey: [from, to],
      queryFn: () => fetchExchangeRate(from, to),
    }),
  },
  stocks: {
    search: (query: string, market?: 'KR' | 'US') => ({
      queryKey: [query, market],
      queryFn: () => searchStocks(query, market),
    }),
  },
});
```

## 2. React Query 훅

```typescript
// hooks/use-holdings.ts
import { useQuery } from '@tanstack/react-query';
import { queries } from '@/lib/queries';

export function useHoldings(householdId: string) {
  return useQuery({
    ...queries.holdings.list(householdId),
    staleTime: 1000 * 60 * 5,
  });
}

// hooks/use-transactions.ts
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queries.transactions.list(variables.householdId).queryKey,
      });
      queryClient.invalidateQueries({ 
        queryKey: queries.holdings.list(variables.householdId).queryKey,
      });
    },
  });
}
```

## 3. API 함수 (레이어 분리)

```typescript
// lib/api/holdings.ts
export async function fetchHoldings(householdId: string): Promise<Holding[]> {
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('household_id', householdId);
    
  if (error) throw error;
  return data;
}
```

## 4. Zod 스키마 + react-hook-form

```typescript
// schemas/transaction-schema.ts
import { z } from 'zod';

export const transactionSchema = z.object({
  ticker: z.string().min(1, '종목 코드를 입력해주세요'),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive('0보다 큰 값을 입력해주세요'),
  price: z.number().min(0, '0 이상의 값을 입력해주세요'),
  transacted_at: z.date(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

// components/transactions/transaction-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function TransactionForm({ onSubmit }) {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'buy', quantity: 0, price: 0 },
  });

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* ... */}</form>;
}
```

## 5. Zustand 스토어

```typescript
// stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  currency: 'KRW' | 'USD';
  setCurrency: (currency: 'KRW' | 'USD') => void;
}

export const useUIStore = create<UIState>((set) => ({
  currency: 'KRW',
  setCurrency: (currency) => set({ currency }),
}));
```

## 6. 에러 바운더리

```typescript
// components/error-fallback.tsx
export function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-lg font-semibold">문제가 발생했습니다</h2>
      <Button onClick={resetErrorBoundary}>다시 시도</Button>
    </div>
  );
}

// app/providers.tsx
import { ErrorBoundary } from 'react-error-boundary';

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {children}
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

## 7. 포맷팅 유틸리티

```typescript
// lib/utils/format-currency.ts
export function formatCurrency(amount: number, currency: 'KRW' | 'USD'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(amount);
}

// lib/utils/format-return.ts
export function formatReturnRate(rate: number): string {
  const sign = rate >= 0 ? '+' : '';
  return `${sign}${rate.toFixed(2)}%`;
}

export function getReturnColor(rate: number): string {
  if (rate > 0) return 'text-red-500';   // 상승
  if (rate < 0) return 'text-blue-500';  // 하락
  return 'text-gray-500';
}
```

## 8. 컴포넌트 구조

```typescript
// components/holdings/holding-list.tsx
'use client';

import { useHoldings } from '@/hooks/use-holdings';
import { HoldingCard } from './holding-card';
import { Skeleton } from '@/components/ui/skeleton';

interface HoldingListProps {
  householdId: string;
}

export function HoldingList({ householdId }: HoldingListProps) {
  const { data: holdings, isLoading } = useHoldings(householdId);
  
  if (isLoading) return <Skeleton />;
  
  return (
    <ul className="space-y-4">
      {holdings?.map((holding) => (
        <HoldingCard 
          key={`${holding.owner_id}-${holding.ticker}`} 
          holding={holding} 
        />
      ))}
    </ul>
  );
}
```

---

# Backend

## 9. API Route 기본 패턴

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/api/auth';
import { APIError } from '@/lib/api/error';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const user = await getAuthUser(supabase);
    
    // 로직
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('household_id', householdId);
      
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
```

## 10. 인증 헬퍼

```typescript
// lib/api/auth.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { APIError } from './error';

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

## 11. APIError 클래스

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

## 12. 요청 검증

```typescript
// app/api/transactions/route.ts
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
      { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다.' } },
      { status: 400 }
    );
  }
  
  const data = result.data;
  // ...
}
```

## 13. 환율 조회 (DB 기반)

환율 데이터는 GitHub Actions로 일 1회 동기화되어 DB에 저장됨.

```typescript
// lib/api/exchange.ts
import { SupabaseClient } from '@supabase/supabase-js';

type Currency = 'USD' | 'KRW';

export async function fetchExchangeRate(
  supabase: SupabaseClient,
  from: Currency,
  to: Currency
): Promise<number> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate, updated_at')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .single();

  if (error || !data) {
    throw new Error('Exchange rate not found');
  }

  return data.rate;
}

// 사용 예시
// const rate = await fetchExchangeRate(supabase, 'USD', 'KRW');
// const krwAmount = usdAmount * rate;
```

```typescript
// hooks/use-exchange-rate.ts
import { useQuery } from '@tanstack/react-query';
import { queries } from '@/lib/queries';

export function useExchangeRate(from: 'USD' | 'KRW', to: 'USD' | 'KRW') {
  return useQuery({
    ...queries.exchange.rate(from, to),
    staleTime: 1000 * 60 * 30, // 30분 (어차피 일 1회 갱신)
  });
}
```

## 14. 종목 검색 (pg_trgm 유사도 검색)

stock_master 테이블에서 초성/한글/영문/티커 검색.

```typescript
// lib/api/stocks.ts
import { SupabaseClient } from '@supabase/supabase-js';

interface StockSearchResult {
  code: string;
  name: string;
  name_en: string | null;
  market: 'KR' | 'US';
  exchange: string | null;
  base_price: number | null;
}

export async function searchStocks(
  supabase: SupabaseClient,
  query: string,
  market?: 'KR' | 'US'
): Promise<StockSearchResult[]> {
  let builder = supabase
    .from('stock_master')
    .select('code, name, name_en, market, exchange, base_price')
    .eq('is_active', true)
    .limit(20);

  if (market) {
    builder = builder.eq('market', market);
  }

  // 초성 검색 (ㅅㅅ → 삼성)
  if (/^[ㄱ-ㅎ]+$/.test(query)) {
    builder = builder.ilike('choseong', `%${query}%`);
  }
  // 일반 검색 (한글명, 영문명, 티커)
  else {
    builder = builder.or(
      `name.ilike.%${query}%,name_en.ilike.%${query}%,code.ilike.%${query}%`
    );
  }

  const { data, error } = await builder;

  if (error) throw error;
  return data ?? [];
}

// 사용 예시
// const results = await searchStocks(supabase, 'ㅅㅅ', 'KR');
// → [{ code: '005930', name: '삼성전자', ... }]
```

```typescript
// hooks/use-stock-search.ts
import { useQuery } from '@tanstack/react-query';
import { queries } from '@/lib/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export function useStockSearch(query: string, market?: 'KR' | 'US') {
  const debouncedQuery = useDebouncedValue(query, 300);

  return useQuery({
    ...queries.stocks.search(debouncedQuery, market),
    enabled: debouncedQuery.length >= 1,
  });
}
```

## 15. 재시도 패턴

```typescript
// lib/utils/retry.ts
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

# Config

## 16. Biome 설정

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  }
}
```