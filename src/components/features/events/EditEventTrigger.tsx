'use client';

import { useState } from 'react';
import { Event } from '@/types/event';
import { EditEventSidebar } from './EditEventSidebar';

interface EditEventTriggerProps {
    event: Event;
    className?: string; // To match exact styles
}

export function EditEventTrigger({ event, className }: EditEventTriggerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={className}
            >
                Edit Event
            </button>

            {/* Sidebar Logic */}
            {isOpen && (
                <EditEventSidebar
                    event={event}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
