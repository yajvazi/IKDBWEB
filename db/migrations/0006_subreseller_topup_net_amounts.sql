alter table public.subreseller_topups
  add column if not exists stripe_fee_minor integer not null default 0,
  add column if not exists net_amount_minor integer,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_balance_transaction_id text;

update public.subreseller_topups
set net_amount_minor = greatest(amount_minor - stripe_fee_minor, 0)
where net_amount_minor is null;

alter table public.subreseller_topups
  alter column net_amount_minor set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subreseller_topups_net_amount_nonnegative'
  ) then
    alter table public.subreseller_topups
      add constraint subreseller_topups_net_amount_nonnegative check (net_amount_minor >= 0);
  end if;
end $$;

create index if not exists subreseller_topups_charge_idx on public.subreseller_topups(stripe_charge_id);
