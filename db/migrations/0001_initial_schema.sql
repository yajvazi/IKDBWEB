-- InternetKudo Admin Platform initial PostgreSQL schema.
-- Money values use integer minor-unit columns for Stripe-facing amounts and numeric decimal snapshots where upstream costs are fractional.

create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_roles (
  id bigserial primary key,
  name text not null unique check (name in ('super_admin','operations','finance','support','analyst','developer','read_only'))
);

create table if not exists admin_users (
  id uuid primary key references profiles(id),
  mfa_enabled boolean not null default false,
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists admin_user_roles (
  admin_user_id uuid not null references admin_users(id),
  role_id bigint not null references admin_roles(id),
  primary key (admin_user_id, role_id)
);

create table if not exists countries (
  code char(2) primary key,
  name text not null,
  region text,
  active boolean not null default true
);

create table if not exists operators (
  id uuid primary key,
  country_code char(2) references countries(code),
  name text not null,
  tadig text
);

create table if not exists plans (
  id uuid primary key,
  display_name text not null,
  country_code char(2) references countries(code),
  location_zone text,
  data_allowance_bytes bigint not null,
  validity_days integer not null,
  active boolean not null default true,
  featured boolean not null default false,
  popular boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists plan_prices (
  id uuid primary key,
  plan_id uuid not null references plans(id),
  currency char(3) not null,
  retail_price_minor integer not null,
  reseller_cost numeric(18,8) not null,
  stripe_product_id text,
  stripe_price_id text,
  effective_at timestamptz not null default now()
);

create table if not exists package_mappings (
  id uuid primary key,
  plan_id uuid not null references plans(id),
  ocs_package_template_id bigint not null,
  last_synced_at timestamptz,
  unique(plan_id, ocs_package_template_id)
);

create table if not exists package_sync_runs (
  id uuid primary key,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null,
  added_count integer not null default 0,
  updated_count integer not null default 0,
  removed_count integer not null default 0,
  error_count integer not null default 0,
  triggered_by text not null,
  summary jsonb not null default '{}'::jsonb
);

create table if not exists customers (
  id uuid primary key references profiles(id),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key,
  order_number text not null unique,
  customer_id uuid not null references customers(id),
  currency char(3) not null,
  subtotal_minor integer not null,
  discount_minor integer not null default 0,
  tax_minor integer not null default 0,
  total_minor integer not null,
  reseller_cost numeric(18,8) not null default 0,
  stripe_fee_minor integer not null default 0,
  gross_profit_minor integer not null default 0,
  payment_status text not null,
  provisioning_status text not null,
  order_status text not null,
  customer_ip_hash text,
  device_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key,
  order_id uuid not null references orders(id),
  plan_id uuid not null references plans(id),
  quantity integer not null,
  sale_price_minor integer not null,
  reseller_cost_snapshot numeric(18,8) not null,
  gross_profit_minor integer not null
);

create table if not exists payments (
  id uuid primary key,
  order_id uuid references orders(id),
  stripe_customer_id text,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  payment_method_type text,
  amount_minor integer not null,
  currency char(3) not null,
  status text not null,
  stripe_fee_minor integer,
  created_at timestamptz not null default now()
);

create table if not exists refunds (
  id uuid primary key,
  payment_id uuid not null references payments(id),
  stripe_refund_id text unique,
  amount_minor integer not null,
  status text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processing_status text not null,
  attempt_count integer not null default 0,
  related_order_id uuid references orders(id),
  related_payment_id uuid references payments(id),
  last_error text,
  received_at timestamptz not null default now()
);

create table if not exists esims (
  id uuid primary key,
  customer_id uuid references customers(id),
  order_item_id uuid references order_items(id),
  ocs_esim_id bigint,
  ocs_subscriber_id bigint,
  imsi_encrypted text,
  iccid_encrypted text,
  msisdn_encrypted text,
  activation_code_encrypted text,
  qr_payload_encrypted text,
  package_template_id bigint,
  allocated_data_bytes bigint not null default 0,
  used_data_bytes bigint not null default 0,
  activated_at timestamptz,
  expires_at timestamptz,
  status text not null,
  last_synced_at timestamptz
);

create table if not exists esim_packages (
  id uuid primary key,
  esim_id uuid not null references esims(id),
  upstream_package_id bigint not null,
  package_template_id bigint,
  allocated_data_bytes bigint not null,
  used_data_bytes bigint not null,
  active boolean not null,
  assigned_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz
);

create table if not exists esim_usage_snapshots (
  id uuid primary key,
  esim_id uuid not null references esims(id),
  allocated_data_bytes bigint not null,
  used_data_bytes bigint not null,
  remaining_data_bytes bigint not null,
  captured_at timestamptz not null default now()
);

create table if not exists provisioning_jobs (
  id uuid primary key,
  order_id uuid not null references orders(id),
  status text not null,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists ocs_proxy_logs (
  id uuid primary key,
  request_id text not null unique,
  internal_endpoint text not null,
  upstream_command text,
  method text not null,
  request_redacted jsonb,
  response_redacted jsonb,
  ocs_status_code integer,
  http_status integer,
  duration_ms integer,
  retry_count integer not null default 0,
  environment text not null,
  created_at timestamptz not null default now()
);

create table if not exists api_request_logs (
  id uuid primary key,
  route text not null,
  request_id text not null,
  user_id uuid,
  ip_hash text,
  status integer not null,
  duration_ms integer not null,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key,
  customer_id uuid references customers(id),
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key,
  referrer_customer_id uuid references customers(id),
  referred_customer_id uuid references customers(id),
  referral_code text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists points_transactions (
  id uuid primary key,
  customer_id uuid not null references customers(id),
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists support_tickets (
  id uuid primary key,
  customer_id uuid references customers(id),
  subject text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key,
  administrator_id uuid references admin_users(id),
  action text not null,
  resource text not null,
  resource_id text,
  before_values jsonb,
  after_values jsonb,
  reason text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
