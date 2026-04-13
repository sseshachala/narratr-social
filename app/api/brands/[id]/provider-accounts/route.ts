import { z } from 'zod';
import { getBrandById } from '@/lib/db/brands';
import { listProviderAccountsByBrand } from '@/lib/db/provider-accounts';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    await getBrandById(params.id);
    const accounts = await listProviderAccountsByBrand(params.id);
    return jsonOk({ provider_accounts: accounts });
  } catch (error) {
    return jsonError(error);
  }
}
