import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses Row Level Security — never import this file
// from a client component, and never forward its results directly to the client.
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must only be called on the server");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
