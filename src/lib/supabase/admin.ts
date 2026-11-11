import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Bypasses row level security. Only for creating and switching off staff accounts,
 * always after checking the caller is allowed (see requirePermission).
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.secretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
