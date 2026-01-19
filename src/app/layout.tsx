/**
 * Root Layout
 * Next.js App Router root layout with metadata and global styles
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/components/layout/Navbar';

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
    themeColor: '#0B0C0E',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Pass cookie string to client for hydration
    const cookie = (await headers()).get('cookie') ?? '';

    return (
        <html lang="en" className={inter.variable} suppressHydrationWarning>
            <body className="min-h-screen bg-[#0E0F13] text-white">
                {/* App Content */}
                <Providers cookie={cookie}>
                    <Navbar />
                    {children}
                </Providers>
            </body>
        </html>
    );
}

