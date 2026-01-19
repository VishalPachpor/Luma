'use client';

import { useState } from 'react';
import { Globe, Lock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ChangeVisibilityButtonProps {
    eventId: string;
    currentVisibility: 'public' | 'private';
}

export function ChangeVisibilityButton({ eventId, currentVisibility }: ChangeVisibilityButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const [visibility, setVisibility] = useState(currentVisibility);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/events/${eventId}/visibility`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visibility }),
            });

            if (!response.ok) {
                throw new Error('Failed to update visibility');
            }

            setShowModal(false);
            router.refresh(); // Refresh to show updated visibility
        } catch (error) {
            console.error('Error updating visibility:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-[#1C1F26] hover:bg-[#242830] border border-white/10 text-white text-sm font-medium rounded-[10px] transition-all"
            >
                Change Visibility
            </button>

            {/* Visibility Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1C1F26] border border-white/10 rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">Event Visibility</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            {/* Public Option */}
                            <button
                                onClick={() => setVisibility('public')}
                                className={`w-full p-4 rounded-xl border transition-all flex items-start gap-4 text-left ${visibility === 'public'
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${visibility === 'public' ? 'bg-green-500/20' : 'bg-white/10'
                                    }`}>
                                    <Globe className={`w-5 h-5 ${visibility === 'public' ? 'text-green-400' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <div className={`font-medium mb-1 ${visibility === 'public' ? 'text-green-400' : 'text-white'}`}>
                                        Public
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Anyone can find and register for this event. It will appear on your profile and in search results.
                                    </div>
                                </div>
                            </button>

                            {/* Private Option */}
                            <button
                                onClick={() => setVisibility('private')}
                                className={`w-full p-4 rounded-xl border transition-all flex items-start gap-4 text-left ${visibility === 'private'
                                        ? 'bg-orange-500/10 border-orange-500/30'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${visibility === 'private' ? 'bg-orange-500/20' : 'bg-white/10'
                                    }`}>
                                    <Lock className={`w-5 h-5 ${visibility === 'private' ? 'text-orange-400' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <div className={`font-medium mb-1 ${visibility === 'private' ? 'text-orange-400' : 'text-white'}`}>
                                        Private
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Only people with the link can see and register for this event. It won't appear in search results.
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Save Button */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || visibility === currentVisibility}
                                className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-100 text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
