/**
 * Calendar People Tab
 * Luma-style audience CRM with search, filter, and sort
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, Filter, Download, MoreHorizontal, UserPlus, ChevronDown, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
import type { CalendarPerson } from '@/types/calendar';
import { calendarPeopleRepository } from '@/lib/repositories/calendar-people.repository';
// import { toast } from 'sonner'; // If toast is available, otherwise alert

type SortOption = 'recently_joined' | 'name' | 'events_attended';

export default function CalendarPeoplePage() {
    const params = useParams();
    const calendarId = params.id as string;
    const { user } = useAuth();
    const supabase = createSupabaseBrowserClient();

    const [people, setPeople] = useState<CalendarPerson[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('recently_joined');
    const [syncing, setSyncing] = useState(false);

    async function fetchPeople() {
        if (!user) return;
        setLoading(true);
        console.log("Fetching people for calendar:", calendarId, "User:", user.id);

        try {
            // Debug check: Fetch calendar owner
            const { data: cal } = await supabase.from('calendars').select('owner_id').eq('id', calendarId).single();
            console.log("DEBUG: Calendar Owner:", cal?.owner_id, "Current User:", user.id, "Match:", cal?.owner_id === user.id);

            // Map UI sort option to Repository sort option
            let repoSortBy: 'joined_at' | 'name' | 'events_attended' | undefined;
            if (sortBy === 'recently_joined') repoSortBy = 'joined_at';
            else if (sortBy === 'name') repoSortBy = 'name';
            else if (sortBy === 'events_attended') repoSortBy = 'events_attended';

            const data = await calendarPeopleRepository.getCalendarPeople(supabase, calendarId, {
                search: searchQuery,
                sortBy: repoSortBy,
                sortOrder: 'desc' // Default to descending
            });
            console.log("DEBUG: Fetched People Count:", data.length);
            setPeople(data);
        } catch (err) {
            console.error("Fetch error:", err);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (user) fetchPeople();
    }, [calendarId, searchQuery, sortBy, user]);

    const handleSync = async () => {
        if (!user) {
            console.error("No authenticated user found for sync");
            return;
        }

        setSyncing(true);
        console.log("Starting sync for user:", user.id);

        try {
            const count = await calendarPeopleRepository.syncFromEvents(supabase, calendarId, user.id);
            console.log("Sync completed. Guests added/updated:", count);

            if (count > 0) {
                await fetchPeople();
                // toast.success(`Synced ${count} guests from your events`);
            } else {
                console.log("No new guests to sync.");
                // toast.info("No new guests found to sync");
            }
        } catch (err) {
            console.error("Sync failed", err);
            // toast.error("Failed to sync guests");
        }
        setSyncing(false);
    };

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'recently_joined', label: 'Recently Joined' },
        { value: 'name', label: 'Name' },
        { value: 'events_attended', label: 'Most Active' },
    ];

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newPerson, setNewPerson] = useState({ name: '', email: '' });
    const [adding, setAdding] = useState(false);

    async function handleAddPerson(e: React.FormEvent) {
        e.preventDefault();
        if (!newPerson.email) return;

        setAdding(true);
        try {
            await calendarPeopleRepository.addPerson(supabase, calendarId, newPerson);
            setIsAddOpen(false);
            setNewPerson({ name: '', email: '' });
            await fetchPeople();
            // toast.success('Person added successfully');
        } catch (err) {
            console.error(err);
            // toast.error('Failed to add person');
        }
        setAdding(false);
    }

    return (
        <div className="text-white relative">
            {/* Add Person Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#1C1C1E] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-white">Add Person</h3>
                        <form onSubmit={handleAddPerson} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#888] mb-1">Name (Optional)</label>
                                <input
                                    type="text"
                                    value={newPerson.name}
                                    onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-white/30 outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#888] mb-1">Email <span className="text-red-400">*</span></label>
                                <input
                                    type="email"
                                    required
                                    value={newPerson.email}
                                    onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-white/30 outline-none"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddOpen(false)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-200 text-sm font-bold transition-colors disabled:opacity-50"
                                >
                                    {adding ? 'Adding...' : 'Add Person'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white">
                    People <span className="text-[#666] ml-2 font-normal text-lg">{people.length}</span>
                </h2>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="h-8 px-3 rounded-md bg-[#1C1C1E] border border-white/10 hover:bg-[#2A2A2D] text-[#888] hover:text-white transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                        {syncing ? 'Syncing...' : 'Sync Guests'}
                    </button>

                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="h-8 px-3 rounded-md bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-semibold"
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add People
                    </button>

                    <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-[#1C1C1E] text-[#666] hover:text-white transition-colors">
                        <Download className="h-4 w-4" />
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-[#1C1C1E] text-[#666] hover:text-white transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[#1C1C1E] border border-white/5 rounded-lg text-white placeholder:text-[#666] focus:outline-none focus:border-white/20 transition-colors"
                    />
                </div>

                <button className="px-3 py-2 bg-[#1C1C1E] border border-white/5 rounded-lg text-[#888] hover:text-white hover:border-white/20 transition-colors flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    Filter
                </button>

                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="appearance-none bg-[#1C1C1E] border border-white/5 rounded-lg pl-3 pr-8 py-2 text-sm text-[#888] focus:outline-none focus:border-white/20 cursor-pointer hover:text-white transition-colors"
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666] pointer-events-none" />
                </div>
            </div>

            {/* People List */}
            {loading ? (
                <PeopleSkeleton />
            ) : people.length === 0 ? (
                <EmptyState searchQuery={searchQuery} />
            ) : (
                <div className="border border-white/5 rounded-xl overflow-hidden bg-[#1C1C1E]">
                    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-3 border-b border-white/5 text-xs font-medium text-[#666] uppercase tracking-wider">
                        <div className="w-8"></div>
                        <div>User</div>
                        <div>Status</div>
                        <div>Joined</div>
                    </div>
                    <div>
                        {people.map((person) => (
                            <PersonRow key={person.id} person={person} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function PersonRow({ person }: { person: CalendarPerson }) {
    const joinDate = format(parseISO(person.joinedAt), 'MMM d, yyyy');
    const initials = person.name
        ? person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : person.email[0].toUpperCase();

    return (
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-3 items-center hover:bg-[#252528] transition-colors border-b border-white/5 last:border-0 group cursor-pointer">
            {/* Avatar */}
            {person.avatarUrl ? (
                <img
                    src={person.avatarUrl}
                    alt={person.name || person.email}
                    className="w-8 h-8 rounded-full object-cover bg-[#2A2A2D]"
                />
            ) : (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-indigo-400 text-xs font-bold">
                    {initials}
                </div>
            )}

            {/* Name & Email */}
            <div className="min-w-0">
                <div className="font-medium text-white truncate text-sm">
                    {person.name || 'Unknown'}
                </div>
                <div className="text-[#666] truncate text-xs">
                    {person.email}
                </div>
            </div>

            {/* Status (Subscribed) */}
            <div>
                {person.subscribed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Subscribed
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        Unsubscribed
                    </span>
                )}
            </div>

            {/* Join Date */}
            <div className="text-sm text-[#666] font-mono">
                {joinDate}
            </div>
        </div>
    );
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
    return (
        <div className="text-center py-24 border border-white/5 rounded-xl bg-[#1C1C1E] border-dashed">
            <div className="w-12 h-12 bg-[#2A2A2D] rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-6 w-6 text-[#666]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
                {searchQuery ? 'No people found' : 'Audience CRM'}
            </h3>
            <p className="text-[#888] mb-6 max-w-sm mx-auto text-sm">
                {searchQuery
                    ? "Try a different search term"
                    : "Manage your audience here. Sync guests from your past events to populated this list."}
            </p>
        </div>
    );
}

function PeopleSkeleton() {
    return (
        <div className="space-y-1 mt-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3 px-4 bg-[#1C1C1E] rounded-lg border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-[#2A2A2D] animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-[#2A2A2D] rounded animate-pulse" />
                        <div className="h-3 w-24 bg-[#2A2A2D] rounded animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
}
