import { z } from 'zod';
import { clearProviderToken } from '@/lib/db/provider-tokens';
import { disconnectProviderAccount, getProviderAccountById, updateProviderAccount } from '@/lib/db/provider-accounts';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';

const paramsSchema = z.object({ id: z.string().uuid() });
const patchSchema = z.object({
  display_name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['connected', 'disconnected', 'error']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const provider_account = await getProviderAccountById(params.id);
    return jsonOk({ provider_account });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const body = parseOrThrow(patchSchema, await req.json());
    const provider_account = await updateProviderAccount(params.id, body);
    return jsonOk({ provider_account });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    await disconnectProviderAccount(params.id);
    await clearProviderToken(params.id);
    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
