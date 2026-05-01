import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client during SSR/prerender — never actually used
    // because all callers are inside useEffect (client-only)
    return createBrowserClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }

  return createBrowserClient<Database>(url, key);
}

/**
 * Returns an untyped Supabase client for use in mutations (insert/update/delete).
 * The placeholder database.ts types cause "never" inference on mutations.
 * Replace with createClient() once real types are generated via:
 *   npx supabase gen types typescript --local > src/types/database.ts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMutationClient(): any {
  return createClient();
}

