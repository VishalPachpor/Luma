'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
    href: string;
    icon: React.ElementType;
    label: string;
}

export function NavLink({ href, icon: Icon, label }: NavLinkProps) {
    const pathname = usePathname();
    const isActive = pathname === href || pathname?.startsWith(`${href}/`);

    return (
        <Link
            href={href}
            className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${isActive
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-text-muted hover:text-white hover:border-white/10'
                }`}
        >
            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : ''}`} />
            {label}
        </Link>
    );
}
