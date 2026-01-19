// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast if envs are missing
if (!url) throw new Error("Missing env: VITE_SUPABASE_URL");
if (!anon) throw new Error("Missing env: VITE_SUPABASE_ANON_KEY");

// HMR-safe singleton (prevents multiple clients in dev)
let client: ReturnType<typeof createClient> | undefined = (globalThis as any).__sb__;
if (!client) {
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // keep true if you use OAuth redirects
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "sb-auth", // stable key
    },
    db: { schema: "public" },
  });
  if (import.meta.env.DEV) (globalThis as any).__sb__ = client;
}

export const supabase = client!;