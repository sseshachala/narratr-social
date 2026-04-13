import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/http/responses';

export async function POST() {
  try {
    const { data: account, error } = await supabaseAdmin
      .from('provider_accounts')
      .update({ status: 'disconnected', disconnected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('brand_id', env.seedBrandId)
      .eq('provider', 'twitter')
      .eq('status', 'connected')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (account?.id) {
      await supabaseAdmin.from('provider_tokens').delete().eq('provider_account_id', account.id);
    }

    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
