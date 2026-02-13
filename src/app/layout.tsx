/**
 * Root Layout
 * Next.js App Router root layout with metadata and global styles
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'sonner';
import Navbar from '@/components/components/layout/Navbar';
import CommandPalette from '@/components/features/CommandPalette';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'Pulse - Premium Events',
    description: 'Discover and host premium events worldwide. Explore interactive globe discovery, browse by category, and join the community.',
    keywords: ['events', 'discover', 'community', 'calendar', 'hosting'],
    authors: [{ name: 'Pulse Team' }],
    openGraph: {
        title: 'Pulse - Premium Events',
        description: 'Discover and host premium events worldwide.',
        type: 'website',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#131517',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Pass cookie string to client for hydration
    const cookie = (await headers()).get('cookie') ?? '';

    return (
        <html lang="en" className={inter.variable} style={{ colorScheme: 'dark' }} suppressHydrationWarning>
            <body className="min-h-screen bg-bg-primary text-white" suppressHydrationWarning>
                {/* App Content */}
                <Providers cookie={cookie}>
                    <Navbar />
                    {children}
                    {/* Global Command Palette (Cmd+K) */}
                    <CommandPalette />
                    {/* Toast Notifications */}
                    <Toaster
                        theme="dark"
                        position="bottom-right"
                        toastOptions={{
                            style: {
                                background: 'rgba(30, 32, 36, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#fff',
                                backdropFilter: 'blur(12px)',
                            },
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}


