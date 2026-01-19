/**
 * Social Links Component
 * Input fields for social media profiles
 */

'use client';

import { Instagram, Linkedin, Globe } from 'lucide-react';
import { SocialLinks as SocialLinksType } from '@/types/settings';

// Custom icons for platforms without lucide icons
const XIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const YouTubeIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);

const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
);

interface SocialLinksProps {
    links: SocialLinksType;
    onChange: (links: SocialLinksType) => void;
    disabled?: boolean;
}

const socialFields: { key: keyof SocialLinksType; label: string; prefix: string; icon: React.ReactNode }[] = [
    { key: 'instagram', label: 'Instagram', prefix: 'instagram.com/', icon: <Instagram className="w-5 h-5" /> },
    { key: 'twitter', label: 'X (Twitter)', prefix: 'x.com/', icon: <XIcon /> },
    { key: 'youtube', label: 'YouTube', prefix: 'youtube.com/@', icon: <YouTubeIcon /> },
    { key: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/@', icon: <TikTokIcon /> },
    { key: 'linkedin', label: 'LinkedIn', prefix: 'linkedin.com/in/', icon: <Linkedin className="w-5 h-5" /> },
    { key: 'website', label: 'Website', prefix: '', icon: <Globe className="w-5 h-5" /> },
];

export default function SocialLinks({ links, onChange, disabled }: SocialLinksProps) {
    const handleChange = (key: keyof SocialLinksType, value: string) => {
        onChange({ ...links, [key]: value });
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-medium text-text-secondary">Social Links</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {socialFields.map((field) => (
                    <div key={field.key} className="flex items-center gap-3">
                        <div className="text-text-muted shrink-0">
                            {field.icon}
                        </div>
                        <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-accent/50 transition-colors">
                            {field.prefix && (
                                <span className="pl-3 text-sm text-text-muted whitespace-nowrap">
                                    {field.prefix}
                                </span>
                            )}
                            <input
                                type="text"
                                value={links[field.key] || ''}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                placeholder={field.key === 'website' ? 'https://yoursite.com' : 'username'}
                                disabled={disabled}
                                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
