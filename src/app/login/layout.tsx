import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sign In | Lumma',
    description: 'Sign in to Lumma to discover and create amazing events.',
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
