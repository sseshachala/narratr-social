import { z } from 'zod';
import { createBrand, listBrands } from '@/lib/db/brands';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';

const createBrandSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function GET() {
  try {
    const brands = await listBrands();
    return jsonOk({ brands });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = parseOrThrow(createBrandSchema, await req.json());
    const brand = await createBrand(body.name);
    return jsonOk({ brand }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
