/**
 * Chat Floating Button
 * Luma-style floating chat icon in bottom-right corner
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
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

    if (!user) return null;

    const handleSelectChat = (eventId: string, eventTitle: string, eventImage?: string) => {
        setIsListOpen(false);
        setActiveChat({ eventId, eventTitle, eventImage });
    };

    const handleCloseChat = () => {
        setActiveChat(null);
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
