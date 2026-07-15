create table if not exists public.reseller_admin_access_policies (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  admin_email text not null,
  label text,
  allowed_dashboard_pages text[] not null default '{}',
  allowed_api_groups text[] not null default '{}',
  can_view_costs boolean not null default false,
  can_issue_refunds boolean not null default false,
  can_reveal_esim_secrets boolean not null default false,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reseller_id, admin_email)
);

alter table public.reseller_admin_access_policies enable row level security;

create index if not exists reseller_admin_access_policies_email_idx on public.reseller_admin_access_policies(lower(admin_email));
create index if not exists reseller_admin_access_policies_reseller_idx on public.reseller_admin_access_policies(reseller_id, active);
