-- 시스템 락 테이블 (범용 Mutex)
-- 동시성 제어가 필요한 경우 (예: 배치 작업, 선착순, 중복 방지 등) 사용
-- key(PK)가 존재하면 락이 걸린 상태, expires_at으로 데드락 방지

create table public.system_locks (
  key text primary key,
  expires_at timestamptz not null
);

-- RLS 활성화 (서버사이드에서만 접근하므로 정책은 최소화하거나 비워둠)
alter table public.system_locks enable row level security;

-- 코멘트
comment on table public.system_locks is '범용 시스템 락 테이블 (Mutex)';
comment on column public.system_locks.key is '락 식별 키 (예: kis_token, batch:daily_job)';
comment on column public.system_locks.expires_at is '락 만료 시간 (이 시간이 지나면 다른 프로세스가 획득 가능)';
