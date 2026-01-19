'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyLinkButtonProps {
    eventId: string;
}

export function CopyLinkButton({ eventId }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
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
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center gap-1"
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4" />
                    COPIED
                </>
            ) : (
                <>
                    COPY
                </>
            )}
        </button>
    );
}
