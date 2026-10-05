-- Kept separate so the new enum value is committed before the reclassify RPCs and policies use it.
alter type public.record_change_request_type add value if not exists 'reclassify';
