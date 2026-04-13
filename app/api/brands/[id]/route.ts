import { z } from 'zod';
import { getBrandById } from '@/lib/db/brands';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const brand = await getBrandById(params.id);
    return jsonOk({ brand });
  } catch (error) {
    return jsonError(error);
  }
}
