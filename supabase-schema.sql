create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  marketplace text default 'Amazon US',
  tacos_goal numeric,
  coupon_percent numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists client_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  sku_data jsonb not null default '[]',
  import_warnings jsonb not null default '[]',
  data_quality_issues jsonb not null default '[]',
  ad_potential_state jsonb not null default '{}',
  reporting_state jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(client_id)
);

alter table client_workspaces
add column if not exists ad_potential_state jsonb not null default '{}';

alter table client_workspaces
add column if not exists reporting_state jsonb not null default '{}';

create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  assumptions jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(client_id, name)
);

alter table clients enable row level security;
alter table client_workspaces enable row level security;
alter table scenarios enable row level security;

drop policy if exists "Users can manage their own clients" on clients;
create policy "Users can manage their own clients"
on clients
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own workspaces" on client_workspaces;
create policy "Users can manage their own workspaces"
on client_workspaces
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own scenarios" on scenarios;
create policy "Users can manage their own scenarios"
on scenarios
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
