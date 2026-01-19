/**
 * Supabase Server Client
 * For server-side operations (RSC, Server Actions, Route Handlers)
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // Server components can't set cookies, ignore
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete({ name, ...options });
                    } catch {
                        // Server components can't remove cookies, ignore
                    }
                },
            },
        }
    );
}

/**
 * Supabase Admin Client (Service Role)
 * For server-side operations that bypass RLS
 */
export function createSupabaseAdminClient() {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                get: () => undefined,
                set: () => undefined,
                remove: () => undefined,
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
