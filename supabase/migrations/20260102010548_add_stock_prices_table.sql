-- stock_prices 테이블 추가 및 stock_master 스키마 정리
-- KIS 마스터파일에 가격 정보가 없어 별도 테이블로 분리

-- 1. stock_master에서 base_price 컬럼 제거
alter table public.stock_master drop column if exists base_price;

-- 2. stock_prices 테이블 생성 (가격 캐싱용)
create table public.stock_prices (
  market market_type not null,           -- KR, US
  code text not null,                    -- 종목코드
  price numeric(18, 4) not null,         -- 현재가
  change_rate numeric(8, 4),             -- 등락률 (%)
  fetched_at timestamptz not null,       -- 조회 시각

  primary key (market, code)
);

-- 인덱스: 캐시 만료 확인용
create index stock_prices_fetched_at_idx on public.stock_prices(fetched_at);

-- 코멘트
comment on table public.stock_prices is '주식 가격 캐시 테이블 (KIS API 조회 결과)';
comment on column public.stock_prices.market is '시장 구분 (KR, US)';
comment on column public.stock_prices.code is '종목코드';
comment on column public.stock_prices.price is '현재가';
comment on column public.stock_prices.change_rate is '등락률 (%)';
comment on column public.stock_prices.fetched_at is 'KIS API 조회 시각 (캐시 버킷 판단용)';
