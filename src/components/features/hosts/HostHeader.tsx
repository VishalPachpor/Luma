import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/components/ui';
import { Globe, Instagram, Linkedin, Twitter, Share2, Check, Users, MapPin, Clock } from 'lucide-react';
import type { User } from '@/types';

interface HostHeaderProps {
    host: User;
    isSubscribed: boolean;
    onSubscribe: () => void;
    isOwner: boolean;
    onEdit: () => void;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'recently';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function HostHeader({ host, isSubscribed, onSubscribe, isOwner, onEdit }: HostHeaderProps) {
    return (
        <div className="w-full bg-bg-primary pt-8 pb-4">
            <div className="max-w-5xl mx-auto px-6">
                {/* Banner - Constrained & Rounded */}
                <div className="relative w-full aspect-[3.2/1] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                    {/* Gradient Overlay for text readability if needed */}
                    <div className="absolute inset-0 bg-black/20 z-10" />

                    {host.coverImage ? (
                        <Image
                            src={host.coverImage}
                            alt="Cover"
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full bg-linear-to-r from-[#2A1B3D] to-[#1A1B2E]" />
                    )}
                </div>

                {/* Header Content */}
                <div className="relative px-2">
                    {/* Logo & Subscribe Row */}
                    <div className="flex justify-between items-end -mt-10 md:-mt-16 mb-6 relative z-20">
                        {/* Logo - Rounded Square with heavy shadow */}
                        <div className="relative w-24 h-24 md:w-36 md:h-36 rounded-3xl bg-bg-primary p-1.5 shadow-2xl shrink-0">
                            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white border border-white/10">
                                <Image
                                    src={host.avatar || '/placeholder-avatar.png'}
                                    alt={host.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>

                        {/* Subscribe Button (Right Aligned, Pink) */}
                        <div className="mb-2 md:mb-4">
                            {isOwner ? (
                                <Button
                                    variant="secondary"
                                    onClick={onEdit}
                                    className="rounded-full px-6 font-semibold"
                                >
                                    Edit Profile
                                </Button>
                            ) : (
                                <Button
                                    onClick={onSubscribe}
                                    className={`rounded-full px-6 h-10 text-sm font-semibold transition-all shadow-lg hover:shadow-xl ${isSubscribed
                                        ? 'bg-white/10 text-white hover:bg-white/20'
                                        : 'bg-[#C5355D] hover:bg-[#A32B4C] text-white border-0'
                                        }`}
                                >
                                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="pl-1">
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">{host.name}</h1>

                        {/* Meta Row */}
                        <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-text-secondary mb-6 font-medium">
                            <span className="flex items-center gap-2">
                                <Clock size={16} className="text-text-muted" />
                                <span>Local Time: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })} (Mock)</span>
                            </span>
                            {host.location && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-text-muted" />
                                    <span className="">{host.location}</span>
                                </>
                            )}
                        </div>

                        {/* Bio */}
                        {host.bio && (
                            <p className="text-text-secondary leading-relaxed max-w-3xl text-base md:text-lg mb-8">
                                {host.bio}
                            </p>
                        )}

                        {/* Social Links */}
                        <div className="flex items-center gap-6 pb-2">
                            {host.socialLinks?.instagram && (
                                <a href={host.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                    <Instagram size={20} />
                                </a>
                            )}
                            {host.socialLinks?.twitter && (
                                <a href={host.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                    <Twitter size={20} />
                                </a>
                            )}
                            {host.socialLinks?.youtube && (
                                <a href={host.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                    {/* Using Share as placeholder or YouTube icon if available? Lucide doesn't have YouTube default, checking imports */}
                                    {/* Lucide React usually has Youtube? I'll check. If not, I'll use Share2 */}
                                    {/* I'll use Globe as placeholder if Youtube missing, or check library */}
                                    <Globe size={20} />
                                </a>
                            )}
                            {host.socialLinks?.linkedin && (
                                <a href={host.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                    <Linkedin size={20} />
                                </a>
                            )}
                            {host.socialLinks?.website && (
                                <a href={host.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-white transition-colors">
                                    <Globe size={20} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


