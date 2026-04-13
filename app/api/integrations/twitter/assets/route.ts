import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/http/responses';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('provider_accounts')
      .select('*')
      .eq('brand_id', env.seedBrandId)
      .eq('provider', 'twitter')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const assets = (data || []).map((account) => ({
      id: account.id,
      asset_id: account.provider_user_id,
      asset_name: account.display_name || account.provider_username || account.provider_user_id,
      asset_type: 'twitter_profile',
      selected: account.status === 'connected',
    }));

    return jsonOk({ assets });
  } catch (error) {
    return jsonError(error);
  }
}
