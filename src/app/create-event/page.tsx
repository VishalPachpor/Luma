'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/components/ui';
import TimezoneSelect from '@/components/components/ui/TimezoneSelect';
import { QuestionBuilder } from '@/components/features/events/QuestionBuilder';
import { CalendarSelector } from '@/components/features/events/CalendarSelector';
import { VisibilityToggle, EventVisibility } from '@/components/features/events/VisibilityToggle';
import { RegistrationQuestion } from '@/types/event';
import { create as createEvent } from '@/lib/repositories/event.repository';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
    LayoutGrid,
    ChevronDown,
    Globe,
    Dices,
    MapPin,
    Plus,
    Ticket,
    UserCheck,
    Users as UsersIcon,
    Image as ImageIcon,
    X,
    Loader2,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { THEMES } from '@/lib/themes';


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
    about: string; // Rich text content (for now just multiline)
    agenda: { title: string; description: string; time: string }[];
    hosts: { name: string; role: string; icon: string }[];
    // Calendar & Visibility
    calendarId: string | null;
    visibility: EventVisibility;
}

function CreateEventForm() {
    const router = useRouter();
    const { user } = useAuth();
    const { currentTheme, setThemeByName } = useTheme();

    const cycleTheme = () => {
        const currentIndex = THEMES.findIndex(t => t.name === currentTheme.name);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        setThemeByName(THEMES[nextIndex].name);
    };

    // Form State
    const [formData, setFormData] = useState<EventFormData>({
        name: '',
        startDate: '',
        startTime: '16:00',
        endDate: '',
        endTime: '17:00',
        timezone: 'Asia/Kolkata',
        location: '',
        description: '', // Short description
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
        // Calendar & Visibility
        calendarId: null,
        visibility: 'public',
    });

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

    // Initialize dates on mount
    useEffect(() => {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        setFormData((prev) => ({
            ...prev,
            startDate: dateStr,
            endDate: dateStr,
        }));
    }, []);

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
            let coverImageUrl = formData.imageUrl || 'https://picsum.photos/seed/event/800/600';

            // Upload image to Supabase Storage if file provided
            if (formData.imageFile) {
                const supabase = createSupabaseBrowserClient();
                const fileExt = formData.imageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `covers/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('events') // Bucket 'events'
                    .upload(filePath, formData.imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('events')
                    .getPublicUrl(filePath);

                coverImageUrl = publicUrl;
            }

            // Format date string
            const dateStr = formData.startDate
                ? new Date(`${formData.startDate}T${formData.startTime}`).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                })
                : new Date().toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                });

            // Create event via Repository (handles Auth and API)
            const event = await createEvent({
                title: formData.name,
                description: formData.description || 'No description provided',
                date: dateStr,
                location: formData.location || 'TBD',
                city: 'Unknown',
                coords: { lat: 0, lng: 0 },
                coverImage: coverImageUrl,
                attendees: 0,
                tags: [],
                organizer: user?.displayName || 'Anonymous',
                organizerId: user?.uid || '',
                price: formData.ticketPrice || 0,
                capacity: formData.capacity || 0,
                requireApproval: formData.requireApproval,
                registrationQuestions: formData.registrationQuestions.length > 0
                    ? formData.registrationQuestions
                    : [{ id: crypto.randomUUID(), type: 'short_text', label: 'Full Name', required: true }],
                socialLinks: formData.socialLinks,
                about: formData.about ? [formData.about] : [],
                agenda: formData.agenda,
                hosts: formData.hosts.map(h => ({ ...h, description: h.role })),
                status: 'published',
                visibility: formData.visibility,
                calendarId: formData.calendarId ?? undefined,
            });

            console.log('Event created:', event);

            // Redirect to the new event
            router.push(`/events/${event.id}`);
        } catch (err) {
            console.error('Error creating event:', err);
            setSubmitError(err instanceof Error ? err.message : 'Failed to create event');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-page)] text-text-primary transition-colors duration-500 ease-in-out">
            <div className="flex flex-col lg:flex-row min-h-screen">

                {/* Left: Sticky Sidebar (Visuals) */}
                <div className="lg:w-[45%] lg:h-screen lg:sticky lg:top-0 p-6 lg:p-10 flex flex-col gap-6 overflow-y-auto custom-scrollbar relative z-10">

                    {/* Close Button (Mobile) */}
                    <button
                        onClick={() => router.back()}
                        className="lg:hidden absolute top-6 right-6 p-2 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all z-20"
                    >
                        <X size={20} />
                    </button>

                    {/* Image Upload */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square w-full rounded-[32px] overflow-hidden relative group cursor-pointer border-2 border-dashed border-white/5 hover:border-[color:var(--accent-glow)] transition-all flex flex-col items-center justify-center gap-4 bg-[var(--surface-1)] shadow-2xl"
                    >
                        <Image
                            src={formData.imageUrl || "https://picsum.photos/seed/abstract/800/800"}
                            fill
                            className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                            alt="Cover"
                        />
                        <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-xl p-3 rounded-2xl text-white group-hover:scale-110 transition-transform shadow-lg border border-white/10">
                            <ImageIcon size={20} />
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </div>

                    {/* Theme Selector */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div
                            onClick={cycleTheme}
                            className="flex-1 flex items-center justify-between p-4 bg-[var(--surface-1)] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors backdrop-blur-md shadow-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    <LayoutGrid size={20} className="text-[color:var(--accent-solid)]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                        Theme
                                    </p>
                                    <p className="text-sm font-semibold text-text-primary">
                                        {currentTheme.label}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown size={18} className="text-text-muted" />
                        </div>

                        <button className="h-full aspect-square flex items-center justify-center p-4 bg-[var(--surface-1)] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors backdrop-blur-md shadow-lg">
                            <Dices size={20} className="text-text-muted" />
                        </button>
                    </div>

                    {/* Registration Questions */}
                    <div className="pt-6 border-t border-white/5">
                        <h3 className="text-lg font-serif mb-4 text-white/90">Registration</h3>
                        <QuestionBuilder
                            questions={formData.registrationQuestions}
                            onChange={(qs) => updateField('registrationQuestions', qs)}
                        />
                    </div>
                </div>

                {/* Right: Scrolling Form Content */}
                <div className="lg:w-[55%] p-6 lg:p-14 lg:pt-20 flex flex-col min-h-screen relative">

                    {/* Close Button (Desktop) */}
                    <button
                        onClick={() => router.back()}
                        className="hidden lg:flex absolute top-10 right-10 p-2 text-white/40 hover:text-white transition-colors z-20 hover:rotate-90 duration-300"
                    >
                        <X size={28} />
                    </button>

                    <div className="max-w-2xl w-full mx-auto space-y-10 pb-20">

                        {/* Header Controls */}
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

                        {/* Title Input */}
                        <div className="relative group">
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="Event Name"
                                className="w-full bg-transparent border-none text-6xl font-serif text-white outline-none placeholder:text-white/10 tracking-tight leading-tight"
                            />
                            <div className="absolute bottom-0 left-0 w-0 h-1 bg-[image:var(--accent-main)] transition-all group-hover:w-full opacity-50" />
                        </div>


                        {/* Date/Time Section */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-[auto_1fr] gap-6 items-start">
                                {/* Timeline Visual */}
                                <div className="flex flex-col items-center gap-1 pt-2">
                                    <div className="w-3 h-3 rounded-full bg-[image:var(--accent-main)] shadow-[0_0_10px_var(--accent-glow)]" />
                                    <div className="w-0.5 h-12 bg-gradient-to-b from-[var(--accent-solid)] to-transparent opacity-30" />
                                    <div className="w-3 h-3 rounded-full border-2 border-[var(--accent-solid)] bg-transparent" />
                                </div>

                                <div className="space-y-6">
                                    {/* Start */}
                                    <div className="flex flex-wrap items-center gap-4 bg-[var(--surface-1)] p-4 rounded-xl border border-white/5 hover:border-[color:var(--accent-glow)] transition-colors backdrop-blur-md">
                                        <span className="text-sm font-semibold text-white/60 w-12">Start</span>
                                        <input
                                            ref={startDateRef}
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => updateField('startDate', e.target.value)}
                                            className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer"
                                        />
                                        <input
                                            ref={startTimeRef}
                                            type="time"
                                            value={formData.startTime}
                                            onChange={(e) => updateField('startTime', e.target.value)}
                                            className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer ml-auto"
                                        />
                                    </div>

                                    {/* End */}
                                    <div className="flex flex-wrap items-center gap-4 bg-[var(--surface-1)] p-4 rounded-xl border border-white/5 hover:border-[color:var(--accent-glow)] transition-colors backdrop-blur-md">
                                        <span className="text-sm font-semibold text-white/60 w-12">End</span>
                                        <input
                                            ref={endDateRef}
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => updateField('endDate', e.target.value)}
                                            className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer"
                                        />
                                        <input
                                            ref={endTimeRef}
                                            type="time"
                                            value={formData.endTime}
                                            onChange={(e) => updateField('endTime', e.target.value)}
                                            className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer ml-auto"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pl-10">
                                <TimezoneSelect
                                    value={formData.timezone}
                                    onChange={(tz) => updateField('timezone', tz)}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-4">
                            {isEditingLocation ? (
                                <div className="p-1 bg-gradient-to-r from-[var(--accent-solid)] to-[var(--accent-glow)] rounded-2xl p-[1px]">
                                    <div className="bg-[var(--bg-page)] rounded-2xl p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <MapPin size={18} className="text-[color:var(--accent-solid)]" />
                                            <span className="text-sm font-semibold text-white">Event Location</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => updateField('location', e.target.value)}
                                            placeholder="Enter address or virtual meeting link..."
                                            className="w-full bg-[var(--surface-1)] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:bg-white/5 transition-colors"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button onClick={() => setIsEditingLocation(false)} className="px-4 py-2 text-xs font-bold text-black bg-white rounded-lg hover:bg-white/90">
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setIsEditingLocation(true)}
                                    className="p-5 bg-[var(--surface-1)] rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer group hover:bg-[var(--surface-2)] transition-all backdrop-blur-md"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <MapPin size={20} className="text-white/60 group-hover:text-[color:var(--accent-solid)]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-base font-medium text-white group-hover:translate-x-1 transition-transform">
                                            {formData.location || 'Add Event Location'}
                                        </p>
                                        {!formData.location && <p className="text-sm text-white/40">Offline location or virtual link</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            {isEditingDescription ? (
                                <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[color:var(--accent-glow)] backdrop-blur-md">
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => updateField('description', e.target.value)}
                                        placeholder="Add a short description..."
                                        rows={3}
                                        className="w-full bg-transparent text-white placeholder:text-white/20 outline-none resize-none text-lg"
                                        autoFocus
                                    />
                                    <button onClick={() => setIsEditingDescription(false)} className="mt-2 text-xs font-bold text-[color:var(--accent-solid)] uppercase tracking-wider">
                                        Save Description
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setIsEditingDescription(true)}
                                    className="p-5 bg-[var(--surface-1)] rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer group hover:bg-[var(--surface-2)] transition-all backdrop-blur-md"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus size={20} className="text-white/60 group-hover:text-[color:var(--accent-solid)]" />
                                    </div>
                                    <p className="text-base font-medium text-white group-hover:translate-x-1 transition-transform">
                                        {formData.description || 'Add Description'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Rich Details */}
                        <div className="p-6 bg-[var(--surface-1)] rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <Plus size={18} className="text-[color:var(--accent-solid)]" />
                                <span className="text-sm font-semibold text-white">About Event</span>
                            </div>
                            <textarea
                                value={formData.about}
                                onChange={(e) => updateField('about', e.target.value)}
                                placeholder="Markdown supported. Tell your story..."
                                rows={8}
                                className="w-full bg-black/10 border-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-[color:var(--accent-glow)]"
                            />
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Socials */}
                            <div className="p-6 bg-[var(--surface-1)] rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <Globe size={18} className="text-[color:var(--accent-solid)]" />
                                    <span className="text-sm font-semibold text-white">Social Links</span>
                                </div>
                                <div className="space-y-3">
                                    {Object.entries(formData.socialLinks).slice(0, 3).map(([key, val]) => (
                                        <input
                                            key={key}
                                            type="text"
                                            placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} URL`}
                                            value={val}
                                            onChange={(e) => setFormData(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [key]: e.target.value } }))}
                                            className="w-full bg-black/10 border-none rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-[color:var(--accent-glow)]"
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Settings (Capacity, Approval) */}
                            <div className="p-6 bg-[var(--surface-1)] rounded-3xl border border-white/5 space-y-6 backdrop-blur-md">
                                {/* Ticket Price */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Ticket size={18} className="text-white/60" />
                                        <span className="text-sm font-medium text-white">Price</span>
                                    </div>
                                    <div className="flex items-center bg-black/20 rounded-lg px-2">
                                        <span className="text-white/40 text-xs mr-1">$</span>
                                        <input
                                            type="number"
                                            value={formData.ticketPrice || ''}
                                            onChange={(e) => updateField('ticketPrice', parseFloat(e.target.value))}
                                            placeholder="Free"
                                            className="w-16 bg-transparent text-right text-sm text-white outline-none py-1"
                                        />
                                    </div>
                                </div>

                                {/* Approval */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <UserCheck size={18} className="text-white/60" />
                                        <span className="text-sm font-medium text-white">Approval</span>
                                    </div>
                                    <button
                                        onClick={() => updateField('requireApproval', !formData.requireApproval)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${formData.requireApproval ? 'bg-[color:var(--accent-solid)]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.requireApproval ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Capacity */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <UsersIcon size={18} className="text-white/60" />
                                        <span className="text-sm font-medium text-white">Capacity</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={formData.capacity || ''}
                                        onChange={(e) => updateField('capacity', parseInt(e.target.value))}
                                        placeholder="Unlimited"
                                        className="w-20 bg-black/20 rounded-lg text-right text-sm text-white outline-none px-2 py-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="sticky bottom-6 z-30 pt-4">
                            <Button
                                fullWidth
                                size="lg"
                                className="rounded-[20px] bg-white! text-black! font-serif text-lg h-16 hover:bg-white/90! shadow-[0_0_40px_-10px_var(--accent-glow)] transition-shadow duration-500"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Creating Event...
                                    </>
                                ) : (
                                    'Create Event'
                                )}
                            </Button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CreateEventPage() {
    return (
        <ThemeProvider>
            <CreateEventForm />
        </ThemeProvider>
    );
}
