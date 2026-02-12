/**
 * Modal Component
 * Reusable modal wrapper
 */

'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: ReactNode;
    maxWidth?: string;
}

export default function Modal({
    isOpen,
    onClose,
    children,
    title,
    maxWidth = 'max-w-2xl',
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-md"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative w-full ${maxWidth} bg-bg-elevated border border-white/10 rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden`}
                >
                    {title && (
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-text-primary">
                                {title}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-text-muted hover:text-text-primary transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )}
                    <div className="p-0 overflow-y-auto max-h-[90vh]">{children}</div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
