import { supabaseAdmin } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/http/errors';
import type { ProviderAccountRecord, ProviderId, ProviderAccountStatus } from '@/lib/providers/types';

interface UpsertProviderAccountInput {
  id?: string;
  brand_id: string;
  provider: ProviderId;
  provider_user_id: string;
  provider_username?: string | null;
  display_name?: string | null;
  status?: ProviderAccountStatus;
  metadata?: Record<string, unknown> | null;
  disconnected_at?: string | null;
}

export async function createOrUpdateProviderAccount(input: UpsertProviderAccountInput): Promise<ProviderAccountRecord> {
  const payload = {
    ...input,
    provider_username: input.provider_username ?? null,
    display_name: input.display_name ?? null,
    status: input.status ?? 'connected',
    metadata: input.metadata ?? {},
    disconnected_at: input.disconnected_at ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('provider_accounts')
    .upsert(payload, { onConflict: 'brand_id,provider,provider_user_id' })
    .select('*')
    .single();

  if (error) throw new ApiError(500, error.message);
  return data as ProviderAccountRecord;
}

export async function listProviderAccountsByBrand(brandId: string): Promise<ProviderAccountRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('provider_accounts')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(500, error.message);
  return (data || []) as ProviderAccountRecord[];
}

export async function getProviderAccountById(id: string): Promise<ProviderAccountRecord> {
  const { data, error } = await supabaseAdmin.from('provider_accounts').select('*').eq('id', id).single();
  if (error) throw new ApiError(error.code === 'PGRST116' ? 404 : 500, error.message);
  return data as ProviderAccountRecord;
}

export async function updateProviderAccount(
  id: string,
  patch: Partial<Pick<ProviderAccountRecord, 'display_name' | 'status' | 'metadata'>>,
): Promise<ProviderAccountRecord> {
  const { data, error } = await supabaseAdmin
    .from('provider_accounts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new ApiError(error.code === 'PGRST116' ? 404 : 500, error.message);
  return data as ProviderAccountRecord;
}

export async function disconnectProviderAccount(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('provider_accounts')
    .update({ status: 'disconnected', disconnected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new ApiError(500, error.message);
}
