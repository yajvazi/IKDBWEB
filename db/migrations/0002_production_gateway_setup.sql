create extension if not exists pgcrypto;

drop policy if exists "Allow all access for anon" on public.admin_packages;
drop policy if exists "Allow all operations" on public.admin_packages;
drop policy if exists "Allow public read access" on public.admin_packages;
drop policy if exists categories_delete on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_select on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists "Allow public read" on public.category_mappings;
drop policy if exists "Allow public update" on public.category_mappings;
drop policy if exists "Allow public write" on public.category_mappings;

revoke all on table public.admin_packages from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.category_mappings from anon, authenticated;

create table if not exists public.resellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ocs_reseller_id bigint not null unique,
  default_ocs_account_id bigint,
  stripe_profile_id text not null default 'internetkudo-platform',
  stripe_account_id text,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reseller_accounts (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  ocs_account_id bigint not null,
  name text,
  balance numeric(14,2),
  currency text not null default 'EUR',
  active boolean not null default true,
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reseller_id, ocs_account_id)
);

create table if not exists public.reseller_api_profiles (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  name text not null,
  ocs_reseller_id bigint not null,
  ocs_account_id bigint,
  stripe_profile_id text not null default 'internetkudo-platform',
  enabled boolean not null default true,
  rate_limit_per_minute integer not null default 120,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reseller_id, name)
);

create table if not exists public.reseller_balance_transactions (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  account_id uuid references public.reseller_accounts(id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  direction text not null check (direction in ('credit','debit','sync','adjustment')),
  source text not null,
  external_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percent','amount')),
  discount_value integer not null,
  currency text,
  max_redemptions integer,
  redeemed_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  discount_minor integer not null default 0,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  unique(promo_code_id, customer_id, order_id)
);

create table if not exists public.credit_balances (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  balance_minor integer not null default 0,
  currency text not null default 'EUR',
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  amount_minor integer not null,
  currency text not null default 'EUR',
  reason text not null,
  source text not null default 'api',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  amount_minor integer not null,
  currency text not null default 'EUR',
  status text not null check (status in ('reserved','captured','released','expired')) default 'reserved',
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_api_keys (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid references public.resellers(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  prefix text not null,
  scopes text[] not null default array['mobile:read','mobile:write'],
  active boolean not null default true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  esim_id uuid references public.esims(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  used_data_bytes bigint not null default 0,
  remaining_data_bytes bigint not null default 0,
  source text not null default 'ocs',
  raw_payload jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

alter table public.resellers enable row level security;
alter table public.reseller_accounts enable row level security;
alter table public.reseller_api_profiles enable row level security;
alter table public.reseller_balance_transactions enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_code_redemptions enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.mobile_api_keys enable row level security;
alter table public.usage_records enable row level security;

create index if not exists reseller_accounts_reseller_id_idx on public.reseller_accounts(reseller_id);
create index if not exists reseller_api_profiles_reseller_id_idx on public.reseller_api_profiles(reseller_id);
create index if not exists reseller_balance_transactions_reseller_id_idx on public.reseller_balance_transactions(reseller_id, created_at desc);
create index if not exists promo_code_redemptions_customer_id_idx on public.promo_code_redemptions(customer_id, created_at desc);
create index if not exists credit_ledger_customer_id_idx on public.credit_ledger(customer_id, created_at desc);
create index if not exists credit_reservations_customer_id_idx on public.credit_reservations(customer_id, status);
create index if not exists mobile_api_keys_reseller_id_idx on public.mobile_api_keys(reseller_id);
create index if not exists usage_records_esim_id_idx on public.usage_records(esim_id, captured_at desc);

with upsert_reseller as (
  insert into public.resellers (name, ocs_reseller_id, default_ocs_account_id, stripe_profile_id, active, config)
  values ('InternetKudo', 567, 3926, 'internetkudo-platform', true, jsonb_build_object('environment','production','gateway','admin.internetkudo.com'))
  on conflict (ocs_reseller_id) do update set
    name = excluded.name,
    default_ocs_account_id = excluded.default_ocs_account_id,
    stripe_profile_id = excluded.stripe_profile_id,
    active = true,
    updated_at = now()
  returning id
)
insert into public.reseller_api_profiles (reseller_id, name, ocs_reseller_id, ocs_account_id, stripe_profile_id, enabled, config)
select id, 'default', 567, 3926, 'internetkudo-platform', true, jsonb_build_object('source','initial-production-setup')
from upsert_reseller
on conflict (reseller_id, name) do update set
  ocs_reseller_id = excluded.ocs_reseller_id,
  ocs_account_id = excluded.ocs_account_id,
  stripe_profile_id = excluded.stripe_profile_id,
  enabled = true,
  updated_at = now();

insert into public.system_settings (key, value, updated_at)
values
  ('gateway.public_base_url', '"https://admin.internetkudo.com"'::jsonb, now()),
  ('gateway.mock_mode', 'false'::jsonb, now()),
  ('ocs.default_reseller_id', '567'::jsonb, now()),
  ('ocs.default_account_id', '3926'::jsonb, now()),
  ('stripe.profile.internetkudo-platform', jsonb_build_object('mode','live','webhook_url','https://admin.internetkudo.com/api/webhooks/stripe'), now())
on conflict (key) do update set value = excluded.value, updated_at = now();

alter table public.profiles alter column id set default gen_random_uuid();
alter table public.admin_users alter column id set default gen_random_uuid();
alter table public.operators alter column id set default gen_random_uuid();
alter table public.plans alter column id set default gen_random_uuid();
alter table public.plan_prices alter column id set default gen_random_uuid();
alter table public.package_mappings alter column id set default gen_random_uuid();
alter table public.package_sync_runs alter column id set default gen_random_uuid();
alter table public.customers alter column id set default gen_random_uuid();
alter table public.orders alter column id set default gen_random_uuid();
alter table public.order_items alter column id set default gen_random_uuid();
alter table public.payments alter column id set default gen_random_uuid();
alter table public.refunds alter column id set default gen_random_uuid();
alter table public.esims alter column id set default gen_random_uuid();
alter table public.esim_packages alter column id set default gen_random_uuid();
alter table public.esim_usage_snapshots alter column id set default gen_random_uuid();
alter table public.provisioning_jobs alter column id set default gen_random_uuid();
alter table public.ocs_proxy_logs alter column id set default gen_random_uuid();
alter table public.api_request_logs alter column id set default gen_random_uuid();
alter table public.notifications alter column id set default gen_random_uuid();
alter table public.referrals alter column id set default gen_random_uuid();
alter table public.points_transactions alter column id set default gen_random_uuid();
alter table public.support_tickets alter column id set default gen_random_uuid();
alter table public.audit_logs alter column id set default gen_random_uuid();

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists marketing_opt_in boolean not null default false;
alter table public.profiles add column if not exists preferred_currency char(3) not null default 'EUR';
alter table public.profiles add column if not exists password_hash text;
alter table public.profiles add column if not exists last_login_at timestamptz;

alter table public.support_tickets add column if not exists message text;
alter table public.support_tickets add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.support_tickets add column if not exists updated_at timestamptz not null default now();

alter table public.notifications add column if not exists type text not null default 'system';
alter table public.notifications add column if not exists deep_link text;

alter table public.esims add column if not exists user_sim_name text;
alter table public.esims add column if not exists smdp_server text;
alter table public.esims add column if not exists subs_package_id bigint;

create index if not exists profiles_email_idx on public.profiles(lower(email));
create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists esims_customer_synced_idx on public.esims(customer_id, last_synced_at desc);
create index if not exists notifications_customer_created_idx on public.notifications(customer_id, created_at desc);
create index if not exists support_tickets_customer_created_idx on public.support_tickets(customer_id, created_at desc);
create index if not exists esim_usage_snapshots_esim_captured_idx on public.esim_usage_snapshots(esim_id, captured_at desc);
