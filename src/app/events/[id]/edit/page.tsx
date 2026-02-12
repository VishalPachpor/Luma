'use client';

import {
    LayoutGrid,
    ChevronDown,
    Dices,
    MapPin,
    Plus,
    Users as UsersIcon,
    Image as ImageIcon,
    X,
    Loader2,
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/components/ui';
import TimezoneSelect from '@/components/components/ui/TimezoneSelect';
import { QuestionBuilder } from '@/components/features/events/QuestionBuilder';
import { CalendarSelector } from '@/components/features/events/CalendarSelector';
import { VisibilityToggle, EventVisibility } from '@/components/features/events/VisibilityToggle';
import { RegistrationQuestion } from '@/types/event';
import { findById } from '@/lib/repositories/event.repository';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

// Note: EventFormData mirrors create-page
interface EventFormData {
    name: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    timezone: string;
    location: string;
    description: string;
    ticketPrice: number | null;
    capacity: number | null;
    requireApproval: boolean;
    imageFile: File | null;
    imageUrl: string;
    registrationQuestions: RegistrationQuestion[];
    // New Fields
    socialLinks: {
        website: string;
        twitter: string;
        telegram: string;
        discord: string;
        instagram: string;
    };
    about: string;
    agenda: { title: string; description: string; time: string }[];
    hosts: { name: string; role: string; icon: string }[];
    // Calendar & Visibility
    calendarId: string | null;
    visibility: EventVisibility;
}

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { user } = useAuth(); // Wait for user to be loaded

    // Form State
    const [formData, setFormData] = useState<EventFormData>({
        name: '',
        startDate: '',
        startTime: '16:00',
        endDate: '',
        endTime: '17:00',
        timezone: 'Asia/Kolkata',
        location: '',
        description: '',
        ticketPrice: null,
        capacity: null,
        requireApproval: false,
        imageFile: null,
        imageUrl: '',
        registrationQuestions: [],
        socialLinks: { website: '', twitter: '', telegram: '', discord: '', instagram: '' },
        about: '',
        agenda: [],
        hosts: [],
        calendarId: null,
        visibility: 'public',
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    // UI State
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Image Upload
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setFormData(prev => ({
                ...prev,
                imageFile: file,
                imageUrl: url
            }));
        }
    };

    // Refs for date/time pickers
    const startDateRef = useRef<HTMLInputElement>(null);
    const startTimeRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);
    const endTimeRef = useRef<HTMLInputElement>(null);


    // Fetch Event Data
    useEffect(() => {
        async function loadEvent() {
            if (!id) return;
            try {
                const event = await findById(id);
                if (!event) {
                    throw new Error('Event not found');
                }

                // Parse Date
                const d = new Date(event.date);
                const dateStr = d.toISOString().split('T')[0];
                const timeStr = d.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

                setFormData({
                    name: event.title,
                    startDate: dateStr,
                    startTime: timeStr,
                    endDate: dateStr, // Assuming single day for now as repo stores single date
                    endTime: '18:00', // Default end time as repo stores only start date
                    timezone: 'UTC', // Default or parse
                    location: event.location,
                    description: event.description,
                    ticketPrice: (event.price ?? 0) > 0 ? (event.price ?? 0) : null,
                    capacity: (event.capacity ?? 0) > 0 ? (event.capacity ?? 0) : null,
                    requireApproval: event.requireApproval ?? false,
                    imageFile: null,
                    imageUrl: event.coverImage,
                    registrationQuestions: event.registrationQuestions || [],
                    socialLinks: {
                        website: event.socialLinks?.website || '',
                        twitter: event.socialLinks?.twitter || '',
                        telegram: event.socialLinks?.telegram || '',
                        discord: event.socialLinks?.discord || '',
                        instagram: event.socialLinks?.instagram || ''
                    },
                    about: event.about?.[0] || '',
                    agenda: event.agenda?.map(a => ({
                        title: a.title,
                        description: a.description,
                        time: a.time || ''
                    })) || [],
                    hosts: event.hosts?.map(h => ({
                        name: h.name,
                        role: h.role || h.description || '',
                        icon: h.icon || ''
                    })) || [],
                    calendarId: event.calendarId || null,
                    visibility: event.visibility,
                });

            } catch (e) {
                console.error('Failed to load event:', e);
                setSubmitError('Failed to load event details.');
            } finally {
                setIsLoadingData(false);
            }
        }

        loadEvent();
    }, [id]);


    const updateField = <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.name.trim()) {
            setSubmitError('Please enter an event name');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            let coverImageUrl = formData.imageUrl;

            // Upload image to Supabase Storage if NEW file provided
            if (formData.imageFile) {
                const supabase = createSupabaseBrowserClient();
                const fileExt = formData.imageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `covers/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('events')
                    .upload(filePath, formData.imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('events')
                    .getPublicUrl(filePath);

                coverImageUrl = publicUrl;
            }

            // Format date string
            const dateStr = formData.startDate
                ? new Date(`${formData.startDate}T${formData.startTime}`).toISOString()
                : new Date().toISOString();


            // Prepare Update Payload
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: formData.name,
                    description: formData.description,
                    date: dateStr,
                    location: formData.location,
                    coverImage: coverImageUrl,
                    capacity: formData.capacity || 0,
                    price: formData.ticketPrice || 0,
                    registrationQuestions: formData.registrationQuestions,
                    // Note: Update API to handle other fields if needed
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update event');
            }

            console.log('Event updated');

            // Redirect to event page
            router.push(`/events/${id}`);
        } catch (err) {
            console.error('Error updating event:', err);
            setSubmitError(err instanceof Error ? err.message : 'Failed to create event');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    // RENDER (Same as CreateEventPage basically)
    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
            <div className="w-full max-w-7xl bg-surface-1 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl flex flex-col lg:flex-row h-[90vh]">

                {/* Left: Image Upload & Theme */}
                <div className="lg:w-[45%] bg-surface-2/50 p-10 flex flex-col gap-8 border-r border-white/10 relative overflow-y-auto custom-scrollbar">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square w-full rounded-[32px] overflow-hidden relative group cursor-pointer border-2 border-dashed border-white/10 hover:border-accent/40 transition-all flex flex-col items-center justify-center gap-4 bg-surface-1/50 shrink-0"
                    >
                        <Image
                            src={formData.imageUrl || "https://picsum.photos/seed/abstract/800/800"}
                            fill
                            className="object-cover opacity-80"
                            alt="Cover"
                        />
                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md p-2 rounded-xl text-white group-hover:scale-110 transition-transform">
                            <ImageIcon size={16} />
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </div>

                    {/* Close Button mobile*/}
                    <button
                        onClick={() => router.back()}
                        className="lg:hidden absolute top-6 right-6 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-all z-20"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex-1 flex items-center justify-between p-4 bg-surface-1/50 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    <LayoutGrid size={20} className="text-text-muted" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                        Theme
                                    </p>
                                    <p className="text-sm font-semibold text-text-primary">
                                        Minimal
                                    </p>
                                </div>
                            </div>
                            <ChevronDown size={18} className="text-text-muted" />
                        </div>

                        <button className="h-full aspect-square flex items-center justify-center p-4 bg-surface-1/50 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                            <Dices size={20} className="text-text-muted" />
                        </button>
                    </div>

                    {/* Question Builder Section */}
                    <div className="shrink-0 pt-4 border-t border-white/10">
                        <QuestionBuilder
                            questions={formData.registrationQuestions}
                            onChange={(qs) => updateField('registrationQuestions', qs)}
                        />
                    </div>
                </div>

                {/* Right: Form */}
                <div className="lg:w-[55%] p-10 flex flex-col h-full bg-surface-1 relative">
                    {/* Close Button desktop */}
                    <button
                        onClick={() => router.back()}
                        className="hidden lg:flex absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors z-20"
                    >
                        <X size={24} />
                    </button>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex flex-col gap-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Edit Event</h2>

                            {/* Header - Calendar & Visibility */}
                            <div className="flex items-center justify-between">
                                {user?.uid && (
                                    <CalendarSelector
                                        userId={user.uid}
                                        selectedCalendarId={formData.calendarId}
                                        onSelect={(id) => updateField('calendarId', id)}
                                        userName={user.displayName || undefined}
                                    />
                                )}
                                <VisibilityToggle
                                    value={formData.visibility}
                                    onChange={(v) => updateField('visibility', v)}
                                />
                            </div>

                            <div className="space-y-6">
                                {/* Event Name */}
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    placeholder="Event Name"
                                    className="w-full bg-transparent border-none text-4xl font-serif text-text-primary outline-none placeholder:text-white/20 tracking-tight"
                                />

                                {/* Date/Time Grid */}
                                <div className="grid grid-cols-[1fr_140px] gap-3">
                                    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-4 relative">
                                        <div className="absolute left-[26px] top-[28px] bottom-[28px] w-px border-l border-dashed border-white/20" />

                                        {/* Start Row */}
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-surface-2" />
                                                <span className="text-sm font-medium text-text-primary">
                                                    Start
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    ref={startDateRef}
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={(e) => updateField('startDate', e.target.value)}
                                                    className="text-sm bg-surface-1/50 px-3 py-1.5 rounded-lg border border-white/10 text-text-secondary hover:bg-white/10 transition-colors cursor-pointer scheme-dark"
                                                />
                                                <input
                                                    ref={startTimeRef}
                                                    type="time"
                                                    value={formData.startTime}
                                                    onChange={(e) => updateField('startTime', e.target.value)}
                                                    className="text-sm bg-surface-1/50 px-3 py-1.5 rounded-lg border border-white/10 text-text-secondary hover:bg-white/10 transition-colors cursor-pointer scheme-dark"
                                                />
                                            </div>
                                        </div>

                                        {/* End Row */}
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full border border-text-muted bg-surface-2 ring-2 ring-surface-2" />
                                                <span className="text-sm font-medium text-text-primary">
                                                    End
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    ref={endDateRef}
                                                    type="date"
                                                    value={formData.endDate}
                                                    onChange={(e) => updateField('endDate', e.target.value)}
                                                    className="text-sm bg-surface-1/50 px-3 py-1.5 rounded-lg border border-white/10 text-text-secondary hover:bg-white/10 transition-colors cursor-pointer scheme-dark"
                                                />
                                                <input
                                                    ref={endTimeRef}
                                                    type="time"
                                                    value={formData.endTime}
                                                    onChange={(e) => updateField('endTime', e.target.value)}
                                                    className="text-sm bg-surface-1/50 px-3 py-1.5 rounded-lg border border-white/10 text-text-secondary hover:bg-white/10 transition-colors cursor-pointer scheme-dark"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <TimezoneSelect
                                        value={formData.timezone}
                                        onChange={(tz) => updateField('timezone', tz)}
                                    />
                                </div>

                                {/* Location */}
                                {isEditingLocation ? (
                                    <div className="p-4 bg-white/5 rounded-2xl border border-accent/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <MapPin size={18} className="text-accent" />
                                            <span className="text-sm font-semibold text-text-primary">Event Location</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => updateField('location', e.target.value)}
                                            placeholder="Enter address or virtual meeting link..."
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button
                                                onClick={() => {
                                                    setIsEditingLocation(false);
                                                }}
                                                className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setIsEditingLocation(true)}
                                        className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3 cursor-pointer group hover:bg-white/10 transition-all"
                                    >
                                        <MapPin
                                            size={18}
                                            className="text-text-muted group-hover:text-accent transition-colors"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-text-primary">
                                                {formData.location || 'Add Event Location'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                {isEditingDescription ? (
                                    <div className="p-4 bg-white/5 rounded-2xl border border-accent/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Plus size={18} className="text-accent" />
                                            <span className="text-sm font-semibold text-text-primary">Description</span>
                                        </div>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            placeholder="Describe your event..."
                                            rows={4}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 resize-none"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button
                                                onClick={() => setIsEditingDescription(false)}
                                                className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setIsEditingDescription(true)}
                                        className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3 cursor-pointer group hover:bg-white/10 transition-all"
                                    >
                                        <Plus
                                            size={18}
                                            className="text-text-muted group-hover:text-accent transition-colors"
                                        />
                                        <p className="text-sm font-semibold text-text-primary">
                                            {formData.description ? formData.description.substring(0, 50) + '...' : 'Add Description'}
                                        </p>
                                    </div>

                                )}

                                {/* Error Message */}
                                {submitError && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                        {submitError}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <Button
                                    fullWidth
                                    size="lg"
                                    className="rounded-[20px] bg-white! text-black! font-bold h-14 hover:bg-white/90! shadow-2xl gap-2"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Event'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
