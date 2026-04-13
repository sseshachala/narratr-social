# Social Integrations App

A Next.js App Router project for multi-tenant social publishing and analytics.

## Stack

- Next.js App Router
- TypeScript
- Supabase / PostgreSQL
- Provider modules for Twitter/X now, with structure ready for other providers later

## What changed

This repository now supports:

- multi-tenant brands
- many provider accounts per brand
- normalized token storage per provider account
- Twitter/X OAuth 2.0 with PKCE
- automatic token refresh
- authored tweet fetch for 7d and 30d windows
- mentions/replies fetch for 7d and 30d windows
- selected-tweet analytics for likes, reposts, and impressions

Legacy `integration_accounts` and `integration_assets` tables are retained so the existing Facebook flow can continue to work while the app is migrated fully to the new provider-account model.

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase and X credentials
3. Run `db/migrations/20260412_multitenant_provider_accounts.sql` in the Supabase SQL editor
4. Install and start:

```bash
npm install
npm run seed
npm run start:dev
```

## Required X configuration

Set these environment variables:

- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- `TWITTER_REDIRECT_URI=http://localhost:3000/api/integrations/twitter/callback`

OAuth scopes used:

- `tweet.read`
- `tweet.write`
- `users.read`
- `offline.access`

## API overview

### Brands

- `POST /api/brands`
- `GET /api/brands`
- `GET /api/brands/:id`

### Provider accounts

- `POST /api/brands/:id/provider-accounts/twitter/connect`
- `GET /api/brands/:id/provider-accounts`
- `GET /api/provider-accounts/:id`
- `PATCH /api/provider-accounts/:id`
- `DELETE /api/provider-accounts/:id`

### Twitter/X

- `POST /api/provider-accounts/:id/twitter/post`
- `GET /api/provider-accounts/:id/twitter/content?range=7d|30d`
- `GET /api/provider-accounts/:id/twitter/messages?range=7d|30d`
- `GET /api/provider-accounts/:id/twitter/analytics?tweetId=<tweet-id>`

## Example connection flow

1. Create a brand with `POST /api/brands`
2. Call `POST /api/brands/:id/provider-accounts/twitter/connect`
3. Redirect the browser to the returned `authorization_url`
4. Complete OAuth on X
5. X redirects back to `/api/integrations/twitter/callback`
6. The callback creates or updates the provider account and token rows for the brand

## Notes for future providers

The provider layer is organized under `lib/providers/*` so Facebook, Instagram, and Google Business Profile can follow the same pattern:

- OAuth module
- token manager
- API client
- content fetcher
- messages fetcher
- analytics fetcher
