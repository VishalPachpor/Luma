/**
 * Chat Message Component
 * Renders individual chat message in Luma style
 */

'use client';

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Database } from '@/types/database.types';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

interface ChatMessageProps {
    message: ChatMessage;
    isCurrentUser?: boolean;
}

export default function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
    const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: false });

    // System message style
    if (message.type === 'system' || message.type === 'announcement') {
        return (
            <div className="flex justify-center py-2">
                <div className={`text-xs px-3 py-1.5 rounded-full ${message.type === 'announcement'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-white/5 text-text-muted'
                    }`}>
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex gap-3 py-2 px-3 hover:bg-white/[0.02] transition-colors group ${isCurrentUser ? '' : ''
            }`}>
            {/* Avatar */}
            <div className="shrink-0">
                {message.sender_avatar ? (
                    <Image
                        src={message.sender_avatar}
                        alt={message.sender_name}
                        width={32}
                        height={32}
                        className="rounded-full"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {message.sender_name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <span className={`font-medium text-sm ${isCurrentUser ? 'text-indigo-400' : 'text-white'
                        }`}>
                        {message.sender_name}
                    </span>
                    <span className="text-xs text-text-muted">
                        {timeAgo}
                    </span>
                </div>
                <p className="text-sm text-gray-300 break-words mt-0.5">
                    {renderContent(message.content)}
                </p>
            </div>
        </div>
    );
}

// Render message content with link detection
function renderContent(content: string) {
    // Simple URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline break-all"
                >
                    {part.length > 40 ? `${part.slice(0, 40)}...` : part}
                </a>
            );
        }
        return part;
    });
}
