-- pg_trgm 확장 (유사도 검색용)
create extension if not exists pg_trgm;

-- stock_master (종목 마스터)
-- KIS 마스터파일 기반 종목 정보. 매일 08:00 KST에 GitHub Actions로 동기화.

create table public.stock_master (
  id uuid primary key default gen_random_uuid(),

  -- 기본 정보
  code text not null,                      -- 종목코드 (005930, AAPL)
  name text not null,                      -- 종목명 (한글)
  name_en text,                            -- 종목명 (영문, US용)
  choseong text,                           -- 초성 (ㅅㅅㅈㅈ, KR만)

  -- 시장 정보
  market market_type not null,             -- KR, US
  exchange text,                           -- KOSPI, KOSDAQ, NYSE, NASDAQ, AMEX

  -- 분류 정보 (KR)
  sector text,                             -- 업종 대분류
  market_cap_size text,                    -- 대형/중형/소형

  -- 시세 정보 (일 1회 동기화)
  base_price numeric(18, 4),               -- 기준가 (전일 종가)

  -- 거래 상태
  is_active boolean default true,          -- 상장 여부
  is_suspended boolean default false,      -- 거래정지 (KR)

  -- 메타
  synced_at timestamptz default now(),     -- 마지막 동기화

  unique(market, code)
);

-- 검색용 인덱스
create index stock_master_market_code_idx on public.stock_master(market, code);
create index stock_master_market_active_idx on public.stock_master(market, is_active)
  where is_active = true;
create index stock_master_choseong_idx on public.stock_master
  using gin(choseong gin_trgm_ops);
create index stock_master_name_idx on public.stock_master
  using gin(name gin_trgm_ops);
create index stock_master_name_en_idx on public.stock_master
  using gin(name_en gin_trgm_ops);
