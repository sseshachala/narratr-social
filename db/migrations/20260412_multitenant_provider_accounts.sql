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

insert into brands (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Default Brand')
on conflict (id) do nothing;

insert into provider_accounts (
  brand_id,
  provider,
  provider_user_id,
  provider_username,
  display_name,
  status,
  metadata,
  disconnected_at,
  created_at,
  updated_at
)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  provider,
  coalesce(provider_user_id, id::text),
  provider_user_name,
  provider_user_name,
  status,
  jsonb_build_object(
    'migrated_from', 'integration_accounts',
    'raw_profile', coalesce(raw_profile, '{}'::jsonb),
    'raw_token_payload', coalesce(raw_token_payload, '{}'::jsonb)
  ),
  disconnected_at,
  coalesce(created_at, now()),
  coalesce(updated_at, now())
from integration_accounts
where provider = 'twitter'
on conflict (brand_id, provider, provider_user_id) do nothing;

insert into provider_tokens (
  provider_account_id,
  access_token,
  refresh_token,
  expires_at,
  scope,
  token_type,
  created_at,
  updated_at
)
select
  pa.id,
  ia.access_token,
  ia.refresh_token,
  ia.token_expires_at,
  case
    when jsonb_typeof(ia.raw_token_payload -> 'scope') = 'string' then string_to_array(ia.raw_token_payload ->> 'scope', ' ')
    else '{}'::text[]
  end,
  ia.raw_token_payload ->> 'token_type',
  coalesce(ia.created_at, now()),
  coalesce(ia.updated_at, now())
from integration_accounts ia
join provider_accounts pa
  on pa.brand_id = '11111111-1111-1111-1111-111111111111'::uuid
 and pa.provider = ia.provider
 and pa.provider_user_id = coalesce(ia.provider_user_id, ia.id::text)
where ia.provider = 'twitter'
  and ia.access_token is not null
on conflict (provider_account_id) do update set
  access_token = excluded.access_token,
  refresh_token = excluded.refresh_token,
  expires_at = excluded.expires_at,
  scope = excluded.scope,
  token_type = excluded.token_type,
  updated_at = now();
