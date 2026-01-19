'use client';

import { useState } from 'react';
import InviteModal from './InviteModal';

interface InviteTriggerProps {
    eventId: string;
    eventTitle: string;
    children: React.ReactNode;
    className?: string;
}

export default function InviteTrigger({ eventId, eventTitle, children, className }: InviteTriggerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={className}
            >
                {children}
            </button>

            <InviteModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                eventId={eventId}
                eventTitle={eventTitle}
            />
        </>
    );
}
