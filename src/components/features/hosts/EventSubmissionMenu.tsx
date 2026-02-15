'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Link as LinkIcon, Rss } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface EventSubmissionMenuProps {
    hostId?: string; // If we implement logic later
}

export default function EventSubmissionMenu({ hostId }: EventSubmissionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleCreateNew = () => {
        setIsOpen(false);
        router.push('/create-event');
    };

    const handleComingSoon = (feature: string) => {
        setIsOpen(false);
        toast.info(`${feature} is coming soon!`, {
            description: "We're working on enabling external event submissions."
        });
    };

    return (
        <div className="relative flex-1" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium h-10 rounded-lg transition-all ${isOpen ? 'bg-white/10 border-white/20' : ''}`}
            >
                <Plus size={16} />
                Submit Event
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-12 left-0 w-64 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-left"
                    >
                        <div className="p-1 space-y-0.5">
                            <button
                                onClick={handleCreateNew}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left group"
                            >
                                <Plus size={16} className="text-white/70 group-hover:text-white" />
                                <span className="text-sm font-medium text-white">Create New Event</span>
                            </button>

                            <button
                                onClick={() => handleComingSoon('Luma Import')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left group"
                            >
                                <Sparkles size={16} className="text-white/70 group-hover:text-white" />
                                <span className="text-sm font-medium text-white">Submit Existing Luma Event</span>
                            </button>

                            <button
                                onClick={() => handleComingSoon('External Event')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left group"
                            >
                                <LinkIcon size={16} className="text-white/70 group-hover:text-white" />
                                <span className="text-sm font-medium text-white">Submit External Event</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
