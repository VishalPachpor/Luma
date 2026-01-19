'use client';

import { useState, useEffect } from 'react';
import { Plus, ExternalLink, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AddHostModal from './AddHostModal';

interface Host {
    id: string;
    email: string;
    role: string;
    name?: string; // Optional if we fetch user details later
}

interface HostsSectionProps {
    eventId: string;
    organizerName: string;
    organizerEmail?: string; // If available
}

export default function HostsSection({ eventId, organizerName, organizerEmail }: HostsSectionProps) {
    const { user } = useAuth();
    const [hosts, setHosts] = useState<Host[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchHosts = async () => {
        try {
            const token = await user?.getIdToken();
            // Assuming this endpoint is public or we need token? 
            // The API requires token for management, but listing might be restricted to organizers/hosts.
            if (!token) return;

            const res = await fetch(`/api/events/${eventId}/hosts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHosts(data.hosts || []);
            }
        } catch (error) {
            console.error('Failed to fetch hosts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchHosts();
        }
    }, [user, eventId]);

    const handleRemoveHost = async (hostId: string) => {
        if (!confirm('Are you sure you want to remove this host?')) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/events/${eventId}/hosts?hostId=${hostId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setHosts(prev => prev.filter(h => h.id !== hostId));
            } else {
                alert('Failed to remove host');
            }
        } catch (error) {
            console.error('Error removing host', error);
        }
    };

    return (
        <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Hosts</h3>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium border border-white/10 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add Host
                </button>
            </div>

            <div className="rounded-xl bg-[#1e2025] border border-white/5 overflow-hidden divide-y divide-white/5">
                {/* Creator / Organizer (Always specific) */}
                <div className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-inner">
                        {(organizerName || 'H').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{organizerName}</span>
                            {organizerEmail && <span className="text-xs text-white/40 truncate">{organizerEmail}</span>}
                            <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium uppercase tracking-wide">Creator</span>
                        </div>
                    </div>
                </div>

                {/* Additional Hosts */}
                {hosts.map(host => (
                    <div key={host.id} className="p-3 flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-inner border border-white/10">
                            {(host.name || host.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">{host.email}</span>
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium uppercase tracking-wide">Host</span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleRemoveHost(host.id)}
                            className="text-white/20 hover:text-red-400 transition-colors cursor-pointer p-1"
                            title="Remove Host"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {loading && hosts.length === 0 && (
                    <div className="p-3 text-xs text-white/30 text-center">Loading extra hosts...</div>
                )}
            </div>

            <div className="text-xs text-white/40 flex items-center gap-1.5 cursor-pointer hover:text-white/60 transition-colors">
                <ExternalLink className="w-3 h-3" />
                Manage check-in staff and options
            </div>

            <AddHostModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                eventId={eventId}
                onHostAdded={fetchHosts}
            />
        </div>
    );
}
