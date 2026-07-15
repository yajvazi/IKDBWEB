create table if not exists public.subreseller_topups (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete restrict,
  ocs_reseller_id bigint not null,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null default 'EUR',
  stripe_mode text not null default 'test' check (stripe_mode in ('live','test')),
  stripe_payment_intent_id text unique,
  payment_status text not null default 'requires_payment' check (payment_status in ('requires_payment','processing','succeeded','failed','canceled','refunded')),
  ocs_status text not null default 'not_started' check (ocs_status in ('not_started','applying','applied','failed','manual_review')),
  ocs_response jsonb,
  last_error text,
  created_by_admin_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  applied_at timestamptz
);

alter table public.subreseller_topups enable row level security;

create index if not exists subreseller_topups_reseller_id_idx on public.subreseller_topups(reseller_id, created_at desc);
create index if not exists subreseller_topups_payment_intent_idx on public.subreseller_topups(stripe_payment_intent_id);
create index if not exists subreseller_topups_status_idx on public.subreseller_topups(payment_status, ocs_status);

insert into public.system_settings (key, value, updated_at)
values (
  'subreseller_topup.settings',
  jsonb_build_object(
    'minimumAmountMinor', 50000,
    'currency', 'EUR',
    'stripeMode', 'test'
  ),
  now()
)
on conflict (key) do nothing;
