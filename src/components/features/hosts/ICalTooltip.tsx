'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rss } from 'lucide-react';
import { toast } from 'sonner';

export default function ICalTooltip() {
    const [isHovered, setIsHovered] = useState(false);

    const handleCopy = () => {
        // Mock copy
        toast.success("iCal Link Copied", {
            description: "Paste this link into your calendar app to subscribe."
        });
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                onClick={handleCopy}
                className="bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10 h-10 w-10 p-0 rounded-lg transition-colors flex items-center justify-center"
            >
                <Rss size={16} />
            </button>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-md shadow-lg whitespace-nowrap z-50"
                    >
                        Add iCal Subscription
                        {/* Triangle pointing down */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
