drop extension if exists "pg_net";

drop extension if exists "pg_trgm";

create extension if not exists "pg_trgm" with schema "public";

drop policy "Users can delete own accounts" on "public"."accounts";

drop policy "Users can insert household accounts" on "public"."accounts";

drop policy "Users can update own accounts" on "public"."accounts";

drop policy "Users can view household accounts" on "public"."accounts";

drop policy "Household members can create invitations" on "public"."invitations";

drop policy "Household members can delete invitations" on "public"."invitations";

drop policy "Household members can update invitations" on "public"."invitations";

drop policy "Users can view invitations by email or household" on "public"."invitations";

drop policy "Anyone can view stock_prices" on "public"."stock_prices";

drop policy "No direct access to system_config" on "public"."system_config";

revoke delete on table "public"."accounts" from "anon";

revoke insert on table "public"."accounts" from "anon";

revoke references on table "public"."accounts" from "anon";

revoke select on table "public"."accounts" from "anon";

revoke trigger on table "public"."accounts" from "anon";

revoke truncate on table "public"."accounts" from "anon";

revoke update on table "public"."accounts" from "anon";

revoke delete on table "public"."accounts" from "authenticated";

revoke insert on table "public"."accounts" from "authenticated";

revoke references on table "public"."accounts" from "authenticated";

revoke select on table "public"."accounts" from "authenticated";

revoke trigger on table "public"."accounts" from "authenticated";

revoke truncate on table "public"."accounts" from "authenticated";

revoke update on table "public"."accounts" from "authenticated";

revoke delete on table "public"."accounts" from "service_role";

revoke insert on table "public"."accounts" from "service_role";

revoke references on table "public"."accounts" from "service_role";

revoke select on table "public"."accounts" from "service_role";

revoke trigger on table "public"."accounts" from "service_role";

revoke truncate on table "public"."accounts" from "service_role";

revoke update on table "public"."accounts" from "service_role";

alter table "public"."accounts" drop constraint "accounts_household_id_fkey";

alter table "public"."accounts" drop constraint "accounts_household_id_owner_id_name_key";

alter table "public"."accounts" drop constraint "accounts_owner_id_fkey";

alter table "public"."invitations" drop constraint "invitations_household_email_unique";

alter table "public"."transactions" drop constraint "transactions_account_id_fkey";

drop view if exists "public"."holdings";

alter table "public"."accounts" drop constraint "accounts_pkey";

drop index if exists "public"."accounts_household_id_idx";

drop index if exists "public"."accounts_household_id_owner_id_name_key";

drop index if exists "public"."accounts_owner_id_idx";

drop index if exists "public"."accounts_pkey";

drop index if exists "public"."invitations_created_by_idx";

drop index if exists "public"."invitations_email_idx";

drop index if exists "public"."invitations_household_email_unique";

drop index if exists "public"."invitations_status_idx";

drop index if exists "public"."transactions_account_id_idx";

drop index if exists "public"."stock_master_choseong_idx";

drop index if exists "public"."stock_master_name_en_idx";

drop index if exists "public"."stock_master_name_idx";

drop table "public"."accounts";

alter table "public"."invitations" drop column "email";

alter table "public"."invitations" drop column "status";

alter table "public"."invitations" add column "code" text not null;

alter table "public"."invitations" add column "used_at" timestamp with time zone;

alter table "public"."invitations" add column "used_by" uuid;

alter table "public"."stock_prices" disable row level security;

alter table "public"."system_config" disable row level security;

alter table "public"."transactions" drop column "account_id";

drop type "public"."account_type";

drop type "public"."invitation_status";

CREATE INDEX invitations_code_idx ON public.invitations USING btree (code);

CREATE UNIQUE INDEX invitations_code_key ON public.invitations USING btree (code);

CREATE INDEX stock_master_choseong_idx ON public.stock_master USING gin (choseong public.gin_trgm_ops);

CREATE INDEX stock_master_name_en_idx ON public.stock_master USING gin (name_en public.gin_trgm_ops);

CREATE INDEX stock_master_name_idx ON public.stock_master USING gin (name public.gin_trgm_ops);

alter table "public"."invitations" add constraint "invitations_code_key" UNIQUE using index "invitations_code_key";

alter table "public"."invitations" add constraint "invitations_used_by_fkey" FOREIGN KEY (used_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."invitations" validate constraint "invitations_used_by_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  new_household_id uuid;
begin
  -- 1. Create profile
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));

  -- 2. Create household with default name
  insert into public.households (name)
  values ('우리집')
  returning id into new_household_id;

  -- 3. Add user as household owner
  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  return new;
end;
$function$
;

create or replace view "public"."holdings" as  SELECT t.household_id,
    t.owner_id,
    t.ticker,
    s.name,
    s.asset_type,
    s.market,
    s.currency,
    s.risk_level,
    sum(
        CASE
            WHEN (t.type = 'buy'::public.transaction_type) THEN t.quantity
            ELSE (- t.quantity)
        END) AS quantity,
        CASE
            WHEN (sum(
            CASE
                WHEN (t.type = 'buy'::public.transaction_type) THEN t.quantity
                ELSE (0)::numeric
            END) > (0)::numeric) THEN (sum(
            CASE
                WHEN (t.type = 'buy'::public.transaction_type) THEN (t.quantity * t.price)
                ELSE (0)::numeric
            END) / sum(
            CASE
                WHEN (t.type = 'buy'::public.transaction_type) THEN t.quantity
                ELSE (0)::numeric
            END))
            ELSE (0)::numeric
        END AS avg_price,
    sum(
        CASE
            WHEN (t.type = 'buy'::public.transaction_type) THEN (t.quantity * t.price)
            ELSE (0)::numeric
        END) AS total_invested,
    min(t.transacted_at) AS first_transaction_at,
    max(t.transacted_at) AS last_transaction_at
   FROM (public.transactions t
     JOIN public.household_stock_settings s ON (((t.household_id = s.household_id) AND (t.ticker = s.ticker))))
  GROUP BY t.household_id, t.owner_id, t.ticker, s.name, s.asset_type, s.market, s.currency, s.risk_level
 HAVING (sum(
        CASE
            WHEN (t.type = 'buy'::public.transaction_type) THEN t.quantity
            ELSE (- t.quantity)
        END) > (0)::numeric);



  create policy "Anyone can view invitations"
  on "public"."invitations"
  as permissive
  for select
  to public
using (true);



