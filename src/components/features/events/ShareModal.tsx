'use client';

import { useState } from 'react';
import { X, Copy, Check, Facebook, Twitter, Linkedin, Mail, MessageCircle, Share2, MessageSquare } from 'lucide-react';
import Modal from '@/components/modals/Modal';
import { Button } from '@/components/components/ui';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventUrl: string;
    eventTitle: string;
}

export default function ShareModal({ isOpen, onClose, eventUrl, eventTitle }: ShareModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(eventUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy keys', err);
        }
    };

    const shareLinks = [
        {
            name: 'Share',
            icon: Facebook,
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`
        },
        {
            name: 'Tweet',
            icon: Twitter, // Or X icon if available
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(eventTitle)}&url=${encodeURIComponent(eventUrl)}`
        },
        {
            name: 'Post',
            icon: Linkedin,
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`
        },
        {
            name: 'Email',
            icon: Mail,
            url: `mailto:?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(eventUrl)}`
        },
        {
            name: 'Text',
            icon: MessageSquare,
            url: `sms:?body=${encodeURIComponent(eventTitle + ' ' + eventUrl)}`
        }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Share This Event"
            maxWidth="max-w-md"
        >
            <div className="p-6 pt-2 space-y-6">

                {/* Social Grid */}
                <div className="grid grid-cols-4 gap-4">
                    {shareLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                                <link.icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs text-text-muted group-hover:text-white transition-colors">
                                {link.name}
                            </span>
                        </a>
                    ))}
                    {/* Native Share Fallback */}
                    <button
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: eventTitle,
                                    url: eventUrl
                                });
                            }
                        }}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                            <Share2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs text-text-muted group-hover:text-white transition-colors">
                            More
                        </span>
                    </button>
                </div>

                {/* Copy Link Section */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                        Share the link:
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-muted truncate font-mono">
                            {eventUrl}
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopy}
                            className="w-20 shrink-0"
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                </div>

            </div>
        </Modal>
    );
}
