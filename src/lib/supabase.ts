import { createClient } from '@supabase/supabase-js';
// import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // throw new Error('Missing Supabase environment variables');
    // Don't throw to avoid breaking build, but warn
    console.warn('Missing Supabase environment variables');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);

// Helper for server-side usage (requiring service role)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const getServiceSupabase = () => {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase URL and Service Role Key are required for server-side operations');
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};
