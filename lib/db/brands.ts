import { supabaseAdmin } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/http/errors';
import type { BrandRecord } from '@/lib/providers/types';

export async function createBrand(name: string): Promise<BrandRecord> {
  const payload = { name: name.trim() };
  const { data, error } = await supabaseAdmin.from('brands').insert(payload).select('*').single();
  if (error) throw new ApiError(500, error.message);
  return data as BrandRecord;
}

export async function listBrands(): Promise<BrandRecord[]> {
  const { data, error } = await supabaseAdmin.from('brands').select('*').order('created_at', { ascending: false });
  if (error) throw new ApiError(500, error.message);
  return (data || []) as BrandRecord[];
}

export async function getBrandById(id: string): Promise<BrandRecord> {
  const { data, error } = await supabaseAdmin.from('brands').select('*').eq('id', id).single();
  if (error) throw new ApiError(error.code === 'PGRST116' ? 404 : 500, error.message);
  return data as BrandRecord;
}
