'use client';

import { useState } from 'react';

interface LumaCopyButtonProps {
    eventId: string;
}

export function LumaCopyButton({ eventId }: LumaCopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent parent link click if nested
        e.stopPropagation();

        const url = typeof window !== 'undefined'
            ? `${window.location.origin}/events/${eventId}`
            : `/events/${eventId}`;

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/10 px-2.5 py-1 rounded tracking-wider transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 uppercase"
        >
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}
