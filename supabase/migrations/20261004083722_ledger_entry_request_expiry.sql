-- Kept separate so the new enum value is committed before the write RPC uses it.
alter type public.record_change_request_status add value if not exists 'expired';
