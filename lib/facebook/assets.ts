import { facebookGraph } from '@/lib/facebook/graph';

export async function fetchFacebookProfile(token: string) {
  return facebookGraph<{ id: string; name: string }>('/me', token, { fields: 'id,name' });
}

export async function fetchFacebookPages(token: string) {
  return facebookGraph<{
    data: Array<{
      id: string;
      name: string;
      access_token?: string;
      instagram_business_account?: { id: string; username?: string; name?: string };
    }>;
  }>('/me/accounts', token, {
    fields: 'id,name,access_token,instagram_business_account{id,username,name}',
  });
}
