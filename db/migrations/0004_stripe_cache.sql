create table if not exists public.stripe_sync_state (
  resource text primary key,
  last_created integer,
  last_id text,
  last_synced_at timestamptz,
  sync_count integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_payment_intents_cache (
  id text primary key,
  amount integer not null default 0,
  amount_received integer not null default 0,
  currency text not null default 'eur',
  status text not null,
  customer_id text,
  receipt_email text,
  description text,
  latest_charge_id text,
  metadata jsonb not null default '{}'::jsonb,
  raw jsonb not null,
  livemode boolean not null default true,
  created integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_charges_cache (
  id text primary key,
  amount integer not null default 0,
  amount_refunded integer not null default 0,
  currency text not null default 'eur',
  status text,
  paid boolean not null default false,
  refunded boolean not null default false,
  payment_intent_id text,
  customer_id text,
  balance_transaction_id text,
  payment_method_type text,
  raw jsonb not null,
  livemode boolean not null default true,
  created integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_customers_cache (
  id text primary key,
  email text,
  name text,
  phone text,
  delinquent boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  raw jsonb not null,
  livemode boolean not null default true,
  created integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  livemode boolean not null default true,
  available jsonb not null default '[]'::jsonb,
  pending jsonb not null default '[]'::jsonb,
  instant_available jsonb,
  raw jsonb not null,
  captured_at timestamptz not null default now()
);

alter table public.stripe_sync_state enable row level security;
alter table public.stripe_payment_intents_cache enable row level security;
alter table public.stripe_charges_cache enable row level security;
alter table public.stripe_customers_cache enable row level security;
alter table public.stripe_balance_snapshots enable row level security;

create index if not exists stripe_payment_intents_cache_created_idx on public.stripe_payment_intents_cache(created desc, id desc);
create index if not exists stripe_payment_intents_cache_status_idx on public.stripe_payment_intents_cache(status);
create index if not exists stripe_payment_intents_cache_customer_idx on public.stripe_payment_intents_cache(customer_id);
create index if not exists stripe_charges_cache_created_idx on public.stripe_charges_cache(created desc, id desc);
create index if not exists stripe_charges_cache_payment_intent_idx on public.stripe_charges_cache(payment_intent_id);
create index if not exists stripe_customers_cache_created_idx on public.stripe_customers_cache(created desc, id desc);
create index if not exists stripe_customers_cache_email_idx on public.stripe_customers_cache(lower(email));
create index if not exists stripe_balance_snapshots_captured_idx on public.stripe_balance_snapshots(captured_at desc);
