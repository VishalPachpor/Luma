'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/components/ui';
import TimezoneSelect from '@/components/components/ui/TimezoneSelect';

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
import { useImmersiveNavbar } from '@/contexts/NavbarThemeContext';
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
    const { currentTheme, setThemeByName, randomizeTheme } = useTheme();

    const cycleTheme = () => {
        const currentIndex = THEMES.findIndex(t => t.name === currentTheme.name);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        setThemeByName(THEMES[nextIndex].name);
    };

    // Sync navbar with current theme for immersive experience
    useImmersiveNavbar(currentTheme.colors.bgPage);

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
            {/* Centered Container - Like Luma */}
            <div className="max-w-[1000px] mx-auto px-6 pt-20 pb-16 min-h-screen">

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">

                    {/* Left Column: Image + Theme */}
                    <div className="lg:sticky lg:top-8 space-y-4">

                        {/* Image Upload - Square */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square w-full rounded-xl overflow-hidden relative group cursor-pointer border border-white/10 hover:border-[color:var(--accent-glow)] transition-all bg-[var(--surface-1)]"
                        >
                            <Image
                                src={formData.imageUrl || "https://picsum.photos/seed/abstract/600/600"}
                                fill
                                className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                                alt="Cover"
                            />
                            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xl p-2 rounded-lg text-white group-hover:scale-110 transition-transform border border-white/10">
                                <ImageIcon size={14} />
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Theme Selector - Compact */}
                        <div className="flex items-center gap-2">
                            <div
                                onClick={cycleTheme}
                                className="flex-1 flex items-center gap-3 p-3 bg-[var(--surface-1)] rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <LayoutGrid size={16} className="text-[color:var(--accent-solid)]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Theme</p>
                                    <p className="text-sm font-medium text-text-primary">{currentTheme.label}</p>
                                </div>
                                <ChevronDown size={14} className="text-text-muted" />
                            </div>

                            <button
                                onClick={randomizeTheme}
                                className="w-12 h-12 flex items-center justify-center bg-[var(--surface-1)] rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors hover:scale-105 active:scale-95"
                            >
                                <Dices size={16} className="text-text-muted" />
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div className="space-y-3">

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

                        {/* Event Name - Large Title */}
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            placeholder="Event Name"
                            className="w-full bg-transparent border-none text-4xl font-serif text-white outline-none placeholder:text-white/20 tracking-tight"
                        />

                        {/* Date/Time Card - Exact Luma Layout */}
                        <div className="bg-[var(--surface-1)] rounded-xl border border-white/5 overflow-hidden">
                            <div className="flex">
                                {/* Left side: Start/End rows */}
                                <div className="flex-1 border-r border-white/5">
                                    {/* Start Row */}
                                    <div className="flex items-center py-3 px-4 border-b border-white/5">
                                        <div className="flex items-center gap-2 w-16">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[13px] text-white/70">Start</span>
                                        </div>
                                        <div className="flex-1 flex items-center gap-3">
                                            <div
                                                onClick={() => startDateRef.current?.showPicker()}
                                                className="bg-white/10 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/15 transition-colors"
                                            >
                                                <span className="text-[13px] text-white font-medium">
                                                    {new Date(formData.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                                <input
                                                    ref={startDateRef}
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={(e) => updateField('startDate', e.target.value)}
                                                    className="sr-only"
                                                />
                                            </div>
                                            <div
                                                onClick={() => startTimeRef.current?.showPicker()}
                                                className="bg-white/10 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/15 transition-colors"
                                            >
                                                <span className="text-[13px] text-white font-medium">
                                                    {new Date('2000-01-01T' + formData.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </span>
                                                <input
                                                    ref={startTimeRef}
                                                    type="time"
                                                    value={formData.startTime}
                                                    onChange={(e) => updateField('startTime', e.target.value)}
                                                    className="sr-only"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* End Row */}
                                    <div className="flex items-center py-3 px-4">
                                        <div className="flex items-center gap-2 w-16">
                                            <div className="w-2 h-2 rounded-full border border-white/40" />
                                            <span className="text-[13px] text-white/70">End</span>
                                        </div>
                                        <div className="flex-1 flex items-center gap-3">
                                            <div
                                                onClick={() => endDateRef.current?.showPicker()}
                                                className="bg-white/10 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/15 transition-colors"
                                            >
                                                <span className="text-[13px] text-white font-medium">
                                                    {new Date(formData.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                                <input
                                                    ref={endDateRef}
                                                    type="date"
                                                    value={formData.endDate}
                                                    onChange={(e) => updateField('endDate', e.target.value)}
                                                    className="sr-only"
                                                />
                                            </div>
                                            <div
                                                onClick={() => endTimeRef.current?.showPicker()}
                                                className="bg-white/10 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/15 transition-colors"
                                            >
                                                <span className="text-[13px] text-white font-medium">
                                                    {new Date('2000-01-01T' + formData.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </span>
                                                <input
                                                    ref={endTimeRef}
                                                    type="time"
                                                    value={formData.endTime}
                                                    onChange={(e) => updateField('endTime', e.target.value)}
                                                    className="sr-only"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right side: Timezone - spanning both rows */}
                                <div className="flex items-center justify-center px-4 min-w-[100px]">
                                    <div className="text-center text-white/60">
                                        <Globe size={16} className="mx-auto mb-1" />
                                        <div className="text-[11px] font-medium">{formData.timezone.split('/')[1] || formData.timezone}</div>
                                        <div className="text-[10px] text-white/40">{formData.timezone.split('/')[0]}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Location - Compact like Luma */}
                        {isEditingLocation ? (
                            <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-white/10">
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                    placeholder="Enter address or virtual meeting link..."
                                    className="w-full bg-transparent text-[13px] text-white placeholder:text-white/30 outline-none"
                                    autoFocus
                                    onBlur={() => setIsEditingLocation(false)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingLocation(false)}
                                />
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsEditingLocation(true)}
                                className="py-3 px-4 bg-[var(--surface-1)] rounded-xl border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                            >
                                <MapPin size={16} className="text-white/50 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-white">
                                        {formData.location || 'Add Event Location'}
                                    </p>
                                    {!formData.location && <p className="text-[11px] text-white/40">Offline location or virtual link</p>}
                                </div>
                            </div>
                        )}

                        {/* Description - Compact like Luma */}
                        {isEditingDescription ? (
                            <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-white/10">
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    placeholder="Add a short description..."
                                    rows={2}
                                    className="w-full bg-transparent text-[13px] text-white placeholder:text-white/30 outline-none resize-none"
                                    autoFocus
                                    onBlur={() => setIsEditingDescription(false)}
                                />
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsEditingDescription(true)}
                                className="py-3 px-4 bg-[var(--surface-1)] rounded-xl border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                            >
                                <Plus size={16} className="text-white/50 shrink-0" />
                                <p className="text-[13px] font-medium text-white">
                                    {formData.description || 'Add Description'}
                                </p>
                            </div>
                        )}

                        {/* Event Options Section */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1">Event Options</p>
                            <div className="bg-[var(--surface-1)] rounded-xl border border-white/5 divide-y divide-white/5">
                                {/* Ticket Price */}
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <Ticket size={16} className="text-white/50" />
                                        <span className="text-sm font-medium text-white">Ticket Price</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-white/70 text-sm">
                                        {formData.ticketPrice ? `$${formData.ticketPrice}` : 'Free'}
                                        <button
                                            onClick={() => {
                                                const price = prompt('Enter ticket price (leave empty for free):', formData.ticketPrice?.toString() || '');
                                                updateField('ticketPrice', price ? parseFloat(price) : null);
                                            }}
                                            className="text-white/30 hover:text-white ml-1"
                                        >
                                            ✎
                                        </button>
                                    </div>
                                </div>

                                {/* Require Approval */}
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <UserCheck size={16} className="text-white/50" />
                                        <span className="text-sm font-medium text-white">Require Approval</span>
                                    </div>
                                    <button
                                        onClick={() => updateField('requireApproval', !formData.requireApproval)}
                                        className={`w-11 h-6 rounded-full relative transition-colors ${formData.requireApproval ? 'bg-white' : 'bg-white/20'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${formData.requireApproval ? 'left-6 bg-black' : 'left-1 bg-white/60'}`} />
                                    </button>
                                </div>

                                {/* Capacity */}
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <UsersIcon size={16} className="text-white/50" />
                                        <span className="text-sm font-medium text-white">Capacity</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-white/70 text-sm">
                                        {formData.capacity ? formData.capacity : 'Unlimited'}
                                        <button
                                            onClick={() => {
                                                const cap = prompt('Enter capacity (leave empty for unlimited):', formData.capacity?.toString() || '');
                                                updateField('capacity', cap ? parseInt(cap) : null);
                                            }}
                                            className="text-white/30 hover:text-white ml-1"
                                        >
                                            ✎
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="pt-4">
                            <Button
                                fullWidth
                                size="lg"
                                className="rounded-xl font-medium text-base h-12 text-white border-0 hover:opacity-90 transition-opacity"
                                style={{ background: currentTheme.colors.accentMain }}
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
