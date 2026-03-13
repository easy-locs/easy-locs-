/**
 * get-turn-credentials — Returns TURN/STUN server config securely.
 * Credentials are stored as secrets, never exposed in frontend code.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT — only authenticated users can get TURN credentials
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const turnUsername = Deno.env.get('TURN_USERNAME') || '';
    const turnCredential = Deno.env.get('TURN_CREDENTIAL') || '';

    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // Only add TURN servers if credentials are configured
    if (turnUsername && turnCredential) {
      iceServers.push(
        { urls: 'turn:a.relay.metered.ca:80', username: turnUsername, credential: turnCredential } as any,
        { urls: 'turn:a.relay.metered.ca:80?transport=tcp', username: turnUsername, credential: turnCredential } as any,
        { urls: 'turn:a.relay.metered.ca:443', username: turnUsername, credential: turnCredential } as any,
        { urls: 'turns:a.relay.metered.ca:443?transport=tcp', username: turnUsername, credential: turnCredential } as any,
      );
    }

    return new Response(JSON.stringify({ iceServers }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300' },
    });
  } catch (err) {
    console.error('[get-turn-credentials] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
