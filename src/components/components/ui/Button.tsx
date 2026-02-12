/**
 * Button Component
 * Reusable button with variants and Framer Motion animations - Luma style
 */

'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    ...props
}: ButtonProps) {
    const baseStyles = `
        inline-flex items-center justify-center 
        font-semibold transition-all duration-200 
        disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
        primary: `
            bg-accent-primary text-black 
            rounded-xl
            hover:brightness-95 
            border border-white/10
            shadow-glow-primary
        `,
        gradient: `
            bg-gradient-to-r from-accent-primary to-accent-secondary
            text-white rounded-full
            hover:brightness-110
            border border-white/10
            shadow-glow-primary
        `,
        secondary: `
            bg-surface-2 text-text-primary 
            rounded-xl
            border border-border-default 
            hover:bg-surface-hover hover:border-border-strong
        `,
        ghost: `
            bg-transparent text-text-secondary 
            rounded-lg
            hover:text-text-primary hover:bg-surface-1
        `,
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-8 py-3 text-base',
    };

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15 }}
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                fullWidth ? 'w-full' : '',
                className
            )}
            {...props}
        >
            {children}
        </motion.button>
    );
}

