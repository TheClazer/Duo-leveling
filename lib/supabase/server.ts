import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// See lib/supabase/client.ts for why we don't pass <Database> here.

type SetCookie = { name: string; value: string; options: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet: SetCookie[]) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — middleware will refresh session.
          }
        },
      },
    },
  );
}

export function createServiceClient() {
  // Bypasses RLS. Use only in trusted server routes (e.g. accept-invite).
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
