-- 시스템 설정 테이블 (key-value 저장소)
-- KIS 토큰 등 서버 측 설정값 저장용

create table public.system_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now() not null
);

-- RLS 비활성화 (서버 전용 테이블)
-- service_role 또는 서버 컴포넌트에서만 접근

comment on table public.system_config is '시스템 설정 key-value 저장소 (서버 전용)';
comment on column public.system_config.key is '설정 키 (예: kis_token)';
comment on column public.system_config.value is '설정 값 (JSON)';
comment on column public.system_config.updated_at is '마지막 업데이트 시각';
