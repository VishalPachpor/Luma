/**
 * Add to Calendar Component
 * Dropdown menu with calendar integration options
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/components/ui';
import {
    generateGoogleCalendarUrl,
    downloadICS,
    parseEventDate,
    CalendarEvent,
} from '@/lib/utils/calendar';

interface AddToCalendarProps {
    eventTitle: string;
    eventDescription: string;
    eventLocation: string;
    eventDate: string;
}

export default function AddToCalendar({
    eventTitle,
    eventDescription,
    eventLocation,
    eventDate,
}: AddToCalendarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    // Parse event date and create 2-hour duration
    const startDate = parseEventDate(eventDate);
    const endDate = parseEventDate(eventDate, 2);

    const calendarEvent: CalendarEvent = {
        title: eventTitle,
        description: eventDescription,
        location: eventLocation,
        startDate,
        endDate,
    };

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Align right edge of dropdown with right edge of button
            // width of dropdown is w-64 = 16rem = 256px
            const dropdownWidth = 256;

            setCoords({
                top: rect.bottom + window.scrollY + 8,
                left: (rect.right + window.scrollX) - dropdownWidth
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            // recalculate on resize/scroll to keep attached (optional, but good for UX)
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true); // capture phase for all scrollable parents
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    const handleGoogleCalendar = () => {
        const url = generateGoogleCalendarUrl(calendarEvent);
        window.open(url, '_blank');
        setIsOpen(false);
    };

    const handleDownloadICS = () => {
        downloadICS(calendarEvent);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <Button
                ref={buttonRef}
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    gap-2 text-indigo-300 hover:text-white hover:bg-indigo-500/10 
                    border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl
                    transition-all duration-300 ${isOpen ? 'bg-indigo-500/10 text-white' : ''}
                `}
            >
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Add to Calendar</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <Portal>
                        {/* Backdrop to close on click outside - completely transparent but captures clicks */}
                        <div
                            className="fixed inset-0 z-9998"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                            style={{
                                position: 'absolute',
                                top: coords.top,
                                left: coords.left,
                                width: '16rem' // w-64
                            }}
                            className="bg-bg-secondary/95 backdrop-blur-xl border border-indigo-500/20 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-9999 ring-1 ring-white/5"
                        >
                            <div className="p-1.5 space-y-0.5">
                                <button
                                    onClick={handleGoogleCalendar}
                                    className="w-full px-3 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-3 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/5">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    </div>
                                    <span className="font-medium">Google Calendar</span>
                                    <ExternalLink className="w-3 h-3 ml-auto text-gray-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                                </button>

                                <div className="h-px bg-white/5 my-1 mx-2" />

                                <button
                                    onClick={handleDownloadICS}
                                    className="w-full px-3 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-3 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/5">
                                        <Calendar className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                    <span className="font-medium">Apple Calendar / iCal</span>
                                    <Download className="w-3 h-3 ml-auto text-gray-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            </div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>
        </div>
    );
}

// Simple Portal Component
function Portal({ children }: { children: React.ReactNode }) {
    if (typeof window === 'undefined') return null;
    return createPortal(children, document.body);
}
