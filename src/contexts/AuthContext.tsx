/**
 * Auth Context Compatibility Layer
 * Re-exports Supabase Auth for backwards compatibility
 * 
 * All imports from @/contexts/AuthContext now use Supabase Auth.
 * This wrapper maps the Supabase user to a Firebase-compatible shape (with displayName, photoURL).
 */

'use client';

import {
    SupabaseAuthProvider as AuthProvider,
    useAuth as useSupabaseAuth,
} from './SupabaseAuthContext';

// Compatible User type that matches what the app expects (Firebase-like)
export type User = {
    uid: string;
    email: string | null | undefined;
    displayName: string | null | undefined;
    photoURL: string | null | undefined;
    phoneNumber?: string | null | undefined;
    providerData?: { providerId: string; uid?: string; email?: string | null; }[];
    getIdToken: () => Promise<string>;
};

// Re-export AuthProvider
export { AuthProvider };

// Wrapped useAuth hook that returns a compatible user object
export function useAuth() {
    const { user: supabaseUser, session, ...rest } = useSupabaseAuth();

    const providerData = supabaseUser?.identities?.map(id => ({
        providerId: id.provider,
        uid: id.id,
        email: id.identity_data?.email as string | undefined
    })) || [];

    const user: User | null = supabaseUser ? {
        uid: supabaseUser.id,
        email: supabaseUser.email,
        displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        photoURL: supabaseUser.user_metadata?.avatar_url,
        phoneNumber: supabaseUser.phone,
        providerData,
        getIdToken: async () => session?.access_token || '',
    } : null;

    return {
        user,
        session,
        ...rest,
    };
}

export function useAuthUser() {
    const { user, loading } = useAuth();
    return { user, loading };
}
