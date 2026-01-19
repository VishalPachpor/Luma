/**
 * Store Provider
 * Wraps the app with client-side providers
 * Updated to use Supabase Auth
 */

'use client';

import { ReactNode } from 'react';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import { UserSettingsProvider } from '@/contexts/UserSettingsContext';
import { SolanaWalletProvider } from '@/contexts/WalletContext';
import { ClientProviders } from '@/components/providers/ClientProviders';
import { ChatFloatingButton } from '@/components/features/chat';

interface ProvidersProps {
    children: ReactNode;
    cookie?: string;
}

export default function Providers({ children, cookie }: ProvidersProps) {
    return (
        <ClientProviders cookie={cookie}>
            <SupabaseAuthProvider>
                <UserSettingsProvider>
                    <SolanaWalletProvider>
                        {children}
                        {/* Global Chat Floating Button */}
                        <ChatFloatingButton />
                    </SolanaWalletProvider>
                </UserSettingsProvider>
            </SupabaseAuthProvider>
        </ClientProviders>
    );
}
