import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sign In | Luma',
    description: 'Sign in to Luma to discover and create amazing events.',
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
