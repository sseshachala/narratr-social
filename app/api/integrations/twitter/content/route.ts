import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { fetchAuthoredTweets } from '@/lib/providers/twitter/content';
import { getValidTwitterToken } from '@/lib/providers/twitter/tokens';

export async function GET() {
  try {
    const { data: account, error } = await supabaseAdmin
      .from('provider_accounts')
      .select('*')
      .eq('brand_id', env.seedBrandId)
      .eq('provider', 'twitter')
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!account?.id || !account.provider_user_id) {
      return Response.json({ error: 'No Twitter connection' }, { status: 400 });
    }

    const token = await getValidTwitterToken(account.id);
    const content = await fetchAuthoredTweets(account.provider_user_id, token.access_token, '7d');
    return jsonOk({ content });
  } catch (error) {
    return jsonError(error);
  }
}
