#!/bin/sh
# 사용: ./run.sh <cutover YYYY-MM-DD>  (컨테이너 mig527-legacy, mig527-new가 떠 있어야 함)
set -e
cd "$(dirname "$0")"
CUT=${1:-2026-11-17}
LEGACY=${LEGACY:-mig527-legacy}  # 원본 컨테이너(합성: mig527-legacy, 운영 복원: mig527-prod)
N="docker exec -i mig527-new psql -U postgres -q -v ON_ERROR_STOP=1"
$N -c "drop schema if exists app cascade"
$N < new-schema.sql
# 외부 테이블이 쓰는 기존 enum 타입을 새 DB의 public에 똑같이 만든다
docker exec "$LEGACY" psql -U postgres -At -c "select format('drop type if exists public.%I cascade; create type public.%I as enum (%s);', t.typname, t.typname, string_agg(quote_literal(e.enumlabel), ',' order by e.enumsortorder)) from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typnamespace = 'public'::regnamespace group by t.typname" | $N
$N -v legacy_host="$LEGACY" -v legacy_port=5432 -v legacy_password=postgres < setup-fdw.sql
$N < fx-seed.sql
for hh in $(docker exec mig527-new psql -U postgres -At -c "select id from legacy.households order by created_at"); do
  $N -v hh="$hh" -v cutover="$CUT" < migrate-household.sql || echo "MIGRATION_FAILED household=$hh"
done
