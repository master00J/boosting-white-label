import { createClient, type SupabaseClient } from "@supabase/supabase-js";

try { require("dotenv").config(); } catch { /* not available in production — env vars set by host */ }

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  _client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: {
      params: { eventsPerSecond: 10 },
      heartbeatIntervalMs: 15_000,
      reconnectAfterMs: (tries: number) => Math.min(tries * 2_000, 30_000),
    },
  });

  return _client;
}

// Lazy proxy — Supabase is only initialised when first used, not at import time.
// This allows deploy-commands.ts to run without SUPABASE_* env vars.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getClient()[prop as keyof SupabaseClient];
  },
});
