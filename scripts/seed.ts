import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

async function main() {
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const brandId = env.seedBrandId;
  const now = new Date().toISOString();

  const { error: brandError } = await supabase.from('brands').upsert(
    {
      id: brandId,
      name: 'Narratr Test Brand',
      updated_at: now,
    },
    { onConflict: 'id' },
  );

  if (brandError) throw brandError;

  const { error: accountError } = await supabase.from('provider_accounts').upsert(
    {
      brand_id: brandId,
      provider: 'twitter',
      provider_user_id: 'demo-twitter-account',
      provider_username: 'narratr_demo',
      display_name: 'Narratr Demo',
      status: 'disconnected',
      metadata: { seeded: true },
      updated_at: now,
    },
    { onConflict: 'brand_id,provider,provider_user_id' },
  );

  if (accountError) throw accountError;
  console.log(`Seeded brand ${brandId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
