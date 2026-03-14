import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __sb__?: SupabaseClient;
  }
}

function getRequiredEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY") {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }

  return value;
}

const url = getRequiredEnv("VITE_SUPABASE_URL");
const anon = getRequiredEnv("VITE_SUPABASE_ANON_KEY");

let client = window.__sb__;

if (!client) {
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "sb-auth",
    },
    db: { schema: "public" },
  });

  if (import.meta.env.DEV) {
    window.__sb__ = client;
  }
}

export const supabase = client!;
