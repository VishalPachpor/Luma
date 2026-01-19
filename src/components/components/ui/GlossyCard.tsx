/**
 * GlossyCard Component
 * Premium card with interactive spotlight effects - Luma style
 */

'use client';

import { useRef, useState, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlossyCardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    variant?: 'default' | 'elevated';
}

export default function GlossyCard({
    children,
    className = '',
    onClick,
    variant = 'default',
}: GlossyCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [mouseX, setMouseX] = useState(0);
    const [mouseY, setMouseY] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        setMouseX(e.clientX - rect.left);
        setMouseY(e.clientY - rect.top);
    };

    const variantStyles = {
        default: 'bg-surface-2 border-border-default',
        elevated: 'bg-surface-3 border-border-strong shadow-card',
    };

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ y: -2, scale: 1.002 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClick}
            className={`
                relative overflow-hidden
                glass-morphism rounded-2xl
                border
                ${variantStyles[variant]}
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            {/* Interactive Spotlight Effect */}
            <div
                className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
                style={{
                    opacity: isHovered ? 1 : 0,
                    background: `radial-gradient(350px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.05), transparent 70%)`,
                }}
            />

            {/* Accent Border Glow Effect */}
            <div
                className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
                style={{
                    opacity: isHovered ? 1 : 0,
                    background: `radial-gradient(180px circle at ${mouseX}px ${mouseY}px, rgba(123,97,255,0.08), transparent 70%)`,
                }}
            />

            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}

