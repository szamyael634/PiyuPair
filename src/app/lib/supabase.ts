import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey, anonJwt } from '/utils/supabase/info';

export const supabase = createClient(
  supabaseUrl,
  publicAnonKey
);

export const API_URL = `${supabaseUrl}/functions/v1/make-server-824d015e`;

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token || anonJwt;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': publicAnonKey,
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();
  
  if (!response.ok) {
    console.error(`API Error at ${endpoint}:`, data);
    if (typeof data === 'object' && data !== null) {
      const message = (data as any).error || (data as any).message || (data as any).code;
      throw new Error(message || `API request failed (${response.status})`);
    }
    throw new Error(`API request failed (${response.status})`);
  }

  return data;
}
