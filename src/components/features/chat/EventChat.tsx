/**
 * Event Chat Component
 * Luma-style floating chat panel with real-time messaging
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Users, Send, Smile, Loader2, ArrowUp } from 'lucide-react';
import Image from 'next/image';
import { useEventChat } from '@/hooks/useEventChat';
import { useAuth } from '@/contexts/AuthContext';
import ChatMessage from './ChatMessage';

interface EventChatProps {
    eventId: string;
    eventTitle: string;
    eventImage?: string;
    isOpen: boolean;
    onClose: () => void;
    isHost?: boolean;
}

export default function EventChat({
    eventId,
    eventTitle,
    eventImage,
    isOpen,
    onClose,
    isHost = false,
}: EventChatProps) {
    const { user } = useAuth();
    const {
        messages,
        isLoading,
        sendMessage,
        loadMore,
        hasMore,
        participantCount,
    } = useEventChat({ eventId, enabled: isOpen });

    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = useCallback(async () => {
        if (!inputValue.trim() || isSending) return;

        setIsSending(true);
        const success = await sendMessage(inputValue);

        if (success) {
            setInputValue('');
        }
        setIsSending(false);
    }, [inputValue, isSending, sendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current || !hasMore) return;

        const { scrollTop } = messagesContainerRef.current;
        if (scrollTop < 50) {
            loadMore();
        }
    }, [hasMore, loadMore]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-4 right-4 w-[380px] h-[520px] bg-bg-primary rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden z-50"
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-bg-primary">
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-text-muted" />
                        </button>

                        {/* Event Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {eventImage && (
                                <Image
                                    src={eventImage}
                                    alt={eventTitle}
                                    width={36}
                                    height={36}
                                    className="rounded-lg object-cover"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white text-sm truncate">
                                    {eventTitle}
                                </h3>
                                <div className="flex items-center gap-1 text-xs text-text-muted">
                                    <Users className="w-3 h-3" />
                                    <span>{participantCount.toLocaleString()} participants</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-text-muted" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Send className="w-7 h-7 text-text-muted" />
                                </div>
                                <p className="text-text-muted text-sm">
                                    No messages yet. Be the first to say hello!
                                </p>
                            </div>
                        ) : (
                            <div className="py-2">
                                {hasMore && (
                                    <button
                                        onClick={loadMore}
                                        className="w-full py-2 text-xs text-text-muted hover:text-white transition-colors"
                                    >
                                        Load older messages
                                    </button>
                                )}
                                {messages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        message={msg}
                                        isCurrentUser={msg.user_id === user?.uid}
                                    />
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-white/5 bg-bg-primary">
                        {user ? (
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                                <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                                    <Smile className="w-5 h-5 text-text-muted" />
                                </button>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Send a message"
                                    className="flex-1 bg-transparent text-sm text-white placeholder-text-muted outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isSending}
                                    className={`p-1.5 rounded-lg transition-colors ${inputValue.trim()
                                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                        : 'text-text-muted'
                                        }`}
                                >
                                    {isSending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ArrowUp className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center text-sm text-text-muted py-2">
                                <a href="/login" className="text-indigo-400 hover:underline">
                                    Sign in
                                </a>{' '}
                                to join the conversation
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
