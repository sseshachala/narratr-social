import { supabaseAdmin } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/http/errors';
import type { ProviderTokenRecord } from '@/lib/providers/types';

interface UpsertProviderTokenInput {
  provider_account_id: string;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  scope?: string[] | null;
  token_type?: string | null;
}

export async function upsertProviderToken(input: UpsertProviderTokenInput): Promise<ProviderTokenRecord> {
  const { data, error } = await supabaseAdmin
    .from('provider_tokens')
    .upsert(
      {
        provider_account_id: input.provider_account_id,
        access_token: input.access_token,
        refresh_token: input.refresh_token ?? null,
        expires_at: input.expires_at ?? null,
        scope: input.scope ?? null,
        token_type: input.token_type ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider_account_id' },
    )
    .select('*')
    .single();

  if (error) throw new ApiError(500, error.message);
  return data as ProviderTokenRecord;
}

export async function getProviderTokenByAccountId(providerAccountId: string): Promise<ProviderTokenRecord> {
  const { data, error } = await supabaseAdmin
    .from('provider_tokens')
    .select('*')
    .eq('provider_account_id', providerAccountId)
    .single();

  if (error) throw new ApiError(error.code === 'PGRST116' ? 404 : 500, error.message);
  return data as ProviderTokenRecord;
}

export async function clearProviderToken(providerAccountId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('provider_tokens').delete().eq('provider_account_id', providerAccountId);
  if (error) throw new ApiError(500, error.message);
}
