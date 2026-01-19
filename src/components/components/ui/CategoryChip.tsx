/**
 * CategoryChip Component (Luma-style)
 * Horizontal scrollable category chips with icon + label
 */

'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface CategoryChipProps {
    id: string;
    name: string;
    count: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    isActive?: boolean;
    onClick?: () => void;
}

export default function CategoryChip({
    name,
    count,
    icon: Icon,
    color,
    bgColor,
    isActive = false,
    onClick,
}: CategoryChipProps) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl
                border transition-all duration-200 cursor-pointer
                shrink-0 select-none
                ${isActive
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/3 border-white/6 hover:bg-white/6 hover:border-white/10'
                }
            `}
        >
            <div
                className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}
            >
                <Icon size={16} className={color} strokeWidth={2} />
            </div>
            <div className="text-left">
                <span className="text-[13px] font-semibold text-white block leading-tight">
                    {name}
                </span>
                <span className="text-[11px] text-white/40 font-medium">
                    {count}
                </span>
            </div>
        </motion.button>
    );
}
