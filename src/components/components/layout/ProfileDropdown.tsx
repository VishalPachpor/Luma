'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProfileDropdown() {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

    if (!user) return null;

    const handleSignOut = async () => {
        try {
            await signOut();
            setIsOpen(false);
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div className="relative ml-1" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-7 h-7 rounded-full overflow-hidden transition-all duration-200 border border-transparent ${isOpen ? 'ring-2 ring-white/20 scale-105' : 'hover:opacity-80'
                    }`}
            >
                <Image
                    src={user.photoURL ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random&color=fff&size=28`}
                    alt="Profile"
                    width={28}
                    height={28}
                    className="object-cover"
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-64 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1.5 origin-top-right"
                    >
                        {/* User Header */}
                        <div className="px-4 py-3 border-b border-white/5 mb-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
                                    <Image
                                        src={user.photoURL ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random&color=fff&size=40`}
                                        alt="Profile"
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {user.displayName || 'User'}
                                    </p>
                                    <p className="text-xs text-[#888888] truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="flex flex-col">
                            <Link
                                href="/profile"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#D4D4D4] hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <User size={16} strokeWidth={2} />
                                View Profile
                            </Link>
                            <Link
                                href="/settings"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#D4D4D4] hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <Settings size={16} strokeWidth={2} />
                                Settings
                            </Link>
                        </div>

                        <div className="my-1.5 border-t border-white/5" />

                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#D4D4D4] hover:text-white hover:bg-white/5 transition-colors text-left"
                        >
                            <LogOut size={16} strokeWidth={2} />
                            Sign Out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
