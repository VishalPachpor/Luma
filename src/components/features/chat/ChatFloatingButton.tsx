/**
 * Chat Floating Button
 * Luma-style floating chat icon in bottom-right corner
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ChatListPanel from './ChatListPanel';
import EventChat from './EventChat';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatFloatingButton() {
    const { user } = useAuth();
    const [isListOpen, setIsListOpen] = useState(false);
    const [activeChat, setActiveChat] = useState<{
        eventId: string;
        eventTitle: string;
        eventImage?: string;
    } | null>(null);

    // Added for URL-based opening
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const hasOpenedRef = useRef(false);

    useEffect(() => {
        const checkUrlForChat = async () => {
            const tab = searchParams.get('tab');
            // Simple regex to match /events/[uuid]
            const match = pathname.match(/^\/events\/([a-f0-9-]+)$/i);

            if (tab === 'chat' && match && !activeChat && !hasOpenedRef.current) {
                const eventId = match[1];

                // Fetch event details to populate chat header
                const { data: event } = await supabase
                    .from('events')
                    .select('title, cover_image')
                    .eq('id', eventId)
                    .single();

                if (event) {
                    setActiveChat({
                        eventId,
                        eventTitle: event.title,
                        eventImage: event.cover_image
                    });
                    hasOpenedRef.current = true; // Prevent re-opening loop if closed
                }
            }
        };

        checkUrlForChat();
    }, [searchParams, pathname, activeChat]); // Depend on params/path

    const handleSelectChat = (eventId: string, eventTitle: string, eventImage?: string) => {
        setIsListOpen(false);
        setActiveChat({ eventId, eventTitle, eventImage });
    };

    const handleCloseChat = () => {
        setActiveChat(null);
        // Optional: Remove query param? 
        // For now, keep it simple. If they close, they close.
        hasOpenedRef.current = false; // Allow re-opening if they navigate away and back
    };

    const handleToggleList = () => {
        if (activeChat) {
            setActiveChat(null);
        }
        setIsListOpen(!isListOpen);
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={handleToggleList}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-shadow"
                style={{ display: isListOpen || activeChat ? 'none' : 'flex' }}
            >
                <MessageCircle className="w-6 h-6 text-gray-800" />
            </motion.button>

            {/* Chat List Panel */}
            <ChatListPanel
                isOpen={isListOpen && !activeChat}
                onClose={() => setIsListOpen(false)}
                onSelectChat={handleSelectChat}
            />

            {/* Active Chat Panel */}
            {activeChat && (
                <EventChat
                    eventId={activeChat.eventId}
                    eventTitle={activeChat.eventTitle}
                    eventImage={activeChat.eventImage}
                    isOpen={true}
                    onClose={handleCloseChat}
                />
            )}
        </>
    );
}
