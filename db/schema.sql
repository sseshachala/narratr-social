create extension if not exists pgcrypto;

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_accounts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  provider_username text,
  display_name text,
  status text not null default 'connected',
  metadata jsonb not null default '{}'::jsonb,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, provider, provider_user_id)
);

create index if not exists provider_accounts_brand_id_idx on provider_accounts(brand_id);
create index if not exists provider_accounts_provider_idx on provider_accounts(provider);

create table if not exists provider_tokens (
  id uuid primary key default gen_random_uuid(),
  provider_account_id uuid not null references provider_accounts(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text[] default '{}',
  token_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_account_id)
);

create index if not exists provider_tokens_provider_account_id_idx on provider_tokens(provider_account_id);

-- Legacy tables retained for backward compatibility with the current Facebook flow.
create table if not exists integration_accounts (
  id uuid primary key default gen_random_uuid(),
  app_user_id text not null,
  provider text not null,
  provider_user_id text,
  provider_user_name text,
  access_token text,
  long_lived_token text,
  refresh_token text,
  token_expires_at timestamptz,
  status text not null default 'connected',
  raw_profile jsonb,
  raw_token_payload jsonb,
  connected_at timestamptz default now(),
  disconnected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (app_user_id, provider)
);

create table if not exists integration_assets (
  id uuid primary key default gen_random_uuid(),
  integration_account_id uuid not null references integration_accounts(id) on delete cascade,
  app_user_id text not null,
  provider text not null,
  asset_id text not null,
  asset_name text not null,
  asset_type text not null,
  access_token text,
  selected boolean not null default false,
  raw_payload jsonb,
  ig_business_account_id text,
  ig_business_account_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (integration_account_id, asset_id)
);
