// Supabase client — uses VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY.
// Falls back to a no-op stub instead of throwing so missing-env deployments
// surface a diagnostic screen rather than a white / crashed page.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseEnvMissing: boolean =
  !supabaseUrl || !supabaseKey ||
  supabaseUrl.trim() === '' || supabaseKey.trim() === '' ||
  !/^https?:\/\//.test(supabaseUrl);

const supabase = supabaseEnvMissing
  ? (new Proxy({}, {
      get(_t, prop) {
        if (typeof prop === 'symbol' || prop === 'then') return undefined;
        throw new Error(
          `[supabase/client] env not configured (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing). Attempted: .${String(prop)}`
        );
      },
    }) as ReturnType<typeof createClient>)
  : createClient(supabaseUrl as string, supabaseKey as string, {
      auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
    });

export default supabase;
export { supabase };