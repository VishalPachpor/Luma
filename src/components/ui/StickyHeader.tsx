'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface StickyHeaderProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * StickyHeader that hides when scrolling down and shows when scrolling up
 * Luma-style scroll behavior
 */
export function StickyHeader({ children, className }: StickyHeaderProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isAtTop, setIsAtTop] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollingDown = currentScrollY > lastScrollY.current;
            const scrolledPastThreshold = currentScrollY > 100;

            // Show header when at top or scrolling up
            // Hide header when scrolling down past threshold
            if (currentScrollY <= 10) {
                setIsVisible(true);
                setIsAtTop(true);
            } else {
                setIsAtTop(false);
                if (scrollingDown && scrolledPastThreshold) {
                    setIsVisible(false);
                } else if (!scrollingDown) {
                    setIsVisible(true);
                }
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "border-b border-white/5 bg-[#0E1016]/95 backdrop-blur-md sticky top-0 z-50 transition-transform duration-300",
                !isVisible && "-translate-y-full",
                !isAtTop && "shadow-lg shadow-black/20",
                className
            )}
        >
            {children}
        </header>
    );
}
