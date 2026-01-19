'use client';

import { useState, ReactNode } from 'react';
import ShareModal from './ShareModal';

interface ShareTriggerProps {
    children: ReactNode;
    eventUrl: string;
    eventTitle: string;
    className?: string;
}

export default function ShareTrigger({ children, eventUrl, eventTitle, className }: ShareTriggerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={className}
            >
                {children}
            </button>
            <ShareModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                eventUrl={eventUrl}
                eventTitle={eventTitle}
            />
        </>
    );
}
