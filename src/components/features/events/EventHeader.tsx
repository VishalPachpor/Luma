'use client';

import Link from 'next/link';
import { ChevronsRight, Copy, ArrowUpRight, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/components/ui';
import { useState } from 'react';

interface EventHeaderProps {
    eventId: string;
    eventLink?: string;
}

export function EventHeader({ eventId, eventLink = '' }: EventHeaderProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const link = eventLink || window.location.href;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <header className="sticky top-0 z-50 h-[60px] bg-[#0E0F13] border-b border-white/5 flex items-center justify-between px-4 transition-all duration-200">
            <div className="flex items-center gap-3">
                {/* Collapse / Back Button */}
                <Link href="/events" className="group">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 group-hover:text-white transition-all">
                        <ChevronsRight size={20} />
                    </div>
                </Link>

                {/* Divider vertical line (optional, based on image implied separation) */}
                {/* Actually image shows buttons are pill shaped and dark grey */}

                {/* Copy Link */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 rounded-lg text-xs font-medium px-3 gap-2"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span className="hidden sm:inline">Copy Link</span>
                </Button>

                {/* Event Page (External/Self Link) */}
                {eventLink && (
                    <Link href={eventLink} target="_blank">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 rounded-lg text-xs font-medium px-3 gap-2"
                        >
                            <span>Event Page</span>
                            <ArrowUpRight size={14} />
                        </Button>
                    </Link>
                )}
            </div>

            {/* Right Controls: Up/Down */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                    disabled
                >
                    <ChevronUp size={20} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                    disabled
                >
                    <ChevronDown size={20} />
                </Button>
            </div>
        </header>
    );
}
