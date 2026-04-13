import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/http/responses';

export async function GET() {
  try {
    const { data: account, error } = await supabaseAdmin
      .from('provider_accounts')
      .select('*')
      .eq('brand_id', env.seedBrandId)
      .eq('provider', 'twitter')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return jsonOk({ connected: !!account && account.status === 'connected', account });
  } catch (error) {
    return jsonError(error);
  }
}
