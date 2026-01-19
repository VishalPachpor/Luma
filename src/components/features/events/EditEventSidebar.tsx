'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Check, type LucideIcon, LayoutGrid, Palette, Type, Clock, Calendar as CalendarIcon, MapPin, Loader2, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceSupabase } from '@/lib/supabase';
import { Event } from '@/types/event';
import { format } from 'date-fns';
import { storage } from '@/lib/firebase'; // Ensure these work on client
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface EditEventSidebarProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
}

export function EditEventSidebar({ event, isOpen, onClose }: EditEventSidebarProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize Form Data from Event
    const [formData, setFormData] = useState({
        name: event.title || '',
        description: event.description || '',
        location: event.location || '',
        startDate: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
        startTime: event.date ? new Date(event.date).toTimeString().substring(0, 5) : '00:00',
        endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : (event.date ? new Date(event.date).toISOString().split('T')[0] : ''),
        endTime: event.endDate ? new Date(event.endDate).toTimeString().substring(0, 5) : '19:00',
        theme: event.theme || 'Minimal',
        themeColor: event.themeColor || 'Custom',
        font: event.font || 'Geist Mono',
        coverImage: event.coverImage || '',
        imageFile: null as File | null,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateField = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            updateField('imageFile', file);
            updateField('coverImage', url);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // 1. Upload new image if exists
            let coverImageUrl = formData.coverImage;
            if (formData.imageFile) {
                // assume storage is available or handle error
                if (storage) {
                    const fileRef = ref(storage, `events/${Date.now()}_${formData.imageFile.name}`);
                    const snapshot = await uploadBytes(fileRef, formData.imageFile);
                    coverImageUrl = await getDownloadURL(snapshot.ref);
                }
            }

            // 2. Construct Date ISOs
            const dateStr = new Date(`${formData.startDate}T${formData.startTime}`).toISOString();
            const endDateStr = formData.endDate && formData.endTime ? new Date(`${formData.endDate}T${formData.endTime}`).toISOString() : null;

            // 3. API Call
            // Use existing API route
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${event.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: formData.name,
                    description: formData.description,
                    location: formData.location,
                    date: dateStr,
                    endDate: endDateStr,
                    coverImage: coverImageUrl,
                    theme: formData.theme,
                    themeColor: formData.themeColor,
                    font: formData.font,
                })
            });

            if (!res.ok) throw new Error('Failed to update');

            router.refresh();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to update event');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render nothing if closed (or use CSS)
    // Using CSS transform for slide-in animation
    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-[480px] bg-[#141414] border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer group" onClick={onClose}>
                        <div className="p-1 rounded-md group-hover:bg-white/10">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm">Edit Event</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <label className="text-white font-semibold text-sm">Basic Info</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-white/20 outline-none transition-colors"
                            placeholder="Event Title"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-white font-semibold text-sm">Description</label>
                            <button className="text-[10px] text-white/40 hover:text-white transition-colors flex items-center gap-1">
                                ✨ Suggest Description
                            </button>
                        </div>
                        <textarea
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-white/20 outline-none transition-colors min-h-[100px] resize-none"
                            placeholder="Everyone enjoys crypto..."
                        />
                    </div>

                    {/* Location (Added) */}
                    <div className="space-y-4">
                        <label className="text-white font-semibold text-sm">Location</label>
                        <div className="relative group">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/80 transition-colors" />
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => updateField('location', e.target.value)}
                                className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/20 focus:border-white/20 outline-none transition-colors"
                                placeholder="Add Event Location"
                            />
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="space-y-4">
                        <label className="text-white font-semibold text-sm">Appearance</label>

                        {/* Theme Grid */}
                        <div className="grid grid-cols-4 gap-2">
                            {['Minimal', 'Quantum', 'Warp', 'Emoji', 'Confetti'].map((t) => (
                                <div
                                    key={t}
                                    onClick={() => updateField('theme', t)}
                                    className={`relative aspect-4/3 rounded-lg border cursor-pointer overflow-hidden group ${formData.theme === t ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/10 hover:border-white/30'}`}
                                >
                                    <div className={`absolute inset-0 ${t === 'Minimal' ? 'bg-[#222]' : t === 'Quantum' ? 'bg-linear-to-br from-blue-500 to-purple-500' : 'bg-linear-to-r from-red-500 to-orange-500'}`}>
                                        <div className="absolute top-2 left-2 w-8 h-1 bg-white/20 rounded-full"></div>
                                        <div className="absolute top-4 left-2 w-5 h-1 bg-white/10 rounded-full"></div>
                                    </div>
                                    <div className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] font-medium text-white/80">
                                        {t}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#1C1C1E] rounded-lg p-2.5 flex items-center justify-between border border-white/10 cursor-pointer hover:border-white/20">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-emerald-400"></div>
                                    <span className="text-xs text-white">Color</span>
                                </div>
                                <span className="text-xs text-white/40">Custom</span>
                            </div>
                            <div className="bg-[#1C1C1E] rounded-lg p-2.5 flex items-center justify-between border border-white/10 cursor-pointer hover:border-white/20">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-white/70">Ag</span>
                                    <span className="text-xs text-white">Font</span>
                                </div>
                                <span className="text-xs text-white/40">Geist Mono</span>
                            </div>
                        </div>
                    </div>

                    {/* Time */}
                    <div className="space-y-4">
                        <label className="text-white font-semibold text-sm">Time</label>
                        <div className="bg-[#1C1C1E] border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                                <div className="flex flex-col">
                                    <span className="text-xs text-white/40 mb-1">Start Date</span>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => updateField('startDate', e.target.value)}
                                        className="bg-transparent text-white text-sm outline-none font-medium"
                                    />
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-white/40 mb-1">Start Time</span>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => updateField('startTime', e.target.value)}
                                        className="bg-transparent text-white text-sm outline-none font-medium text-right"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs text-white/40 mb-1">End Date</span>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => updateField('endDate', e.target.value)}
                                        className="bg-transparent text-white text-sm outline-none font-medium"
                                    />
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-white/40 mb-1">End Time</span>
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => updateField('endTime', e.target.value)}
                                        className="bg-transparent text-white text-sm outline-none font-medium text-right"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-[#141414]">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full h-12 bg-white hover:bg-white/90 text-black font-bold rounded-xl transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Update Event
                            </>
                        )}
                    </button>
                </div>

            </div>
        </>
    );
}
