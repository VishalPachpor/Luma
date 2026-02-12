'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus, Shield, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { getCalendarMembers, inviteCalendarMember, removeCalendarMember, type CalendarMember } from '@/app/actions/calendar-members';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminsSettingsPage() {
    const params = useParams();
    const calendarId = params.id as string;

    const [members, setMembers] = useState<CalendarMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Add form state
    const [isAdding, setIsAdding] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => {
        loadMembers();
    }, [calendarId]);

    async function loadMembers() {
        try {
            const data = await getCalendarMembers(calendarId);
            setMembers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setIsInviting(true);
        setInviteStatus(null);

        try {
            const result = await inviteCalendarMember(calendarId, inviteEmail);
            if (result.success) {
                setInviteStatus({ type: 'success', message: 'Admin added successfully' });
                setInviteEmail('');
                setIsAdding(false); // Close form on success
                loadMembers();
                // Clear success message after 3s
                setTimeout(() => setInviteStatus(null), 3000);
            } else {
                setInviteStatus({ type: 'error', message: result.message || 'Failed to add admin' });
            }
        } catch (error) {
            setInviteStatus({ type: 'error', message: 'An unexpected error occurred' });
        } finally {
            setIsInviting(false);
        }
    }

    async function handleRemoveMember(userId: string) {
        if (!confirm('Are you sure you want to remove this admin?')) return;

        try {
            const result = await removeCalendarMember(calendarId, userId);
            if (result.success) {
                setMembers(prev => prev.filter(m => m.user_id !== userId));
            } else {
                toast.error('Failed to remove admin');
            }
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Admins</h2>
                    <p className="text-sm text-white/50">
                        Manage who has access to manage this calendar.
                    </p>
                </div>
            </div>

            {/* Invite Status Message */}
            {inviteStatus && (
                <div className={cn(
                    "p-3 rounded-lg text-sm flex items-center gap-2",
                    inviteStatus.type === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                    {inviteStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {inviteStatus.message}
                </div>
            )}

            {/* In-line Add Form */}
            {isAdding ? (
                <div className="bg-bg-elevated border border-white/10 rounded-xl p-6 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Add New Admin
                    </h3>
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-white/70">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="bg-white/5 border-white/10 text-white focus:border-white/20"
                                autoFocus
                            />
                            <p className="text-xs text-white/30">User must already have a Lumma account.</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setIsAdding(false); setInviteStatus(null); }}
                                className="text-white hover:text-white/80 hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-white text-black hover:bg-white/90"
                                disabled={isInviting}
                            >
                                {isInviting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    'Add Admin'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            ) : (
                <Button
                    onClick={() => setIsAdding(true)}
                    className="w-full border-dashed border-2 border-white/10 bg-transparent hover:bg-white/5 text-white/50 hover:text-white h-12"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Admin
                </Button>
            )}

            {/* List */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-widest">Team Members</h3>

                {isLoading ? (
                    <div className="text-center py-8 text-white/40">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading members...
                    </div>
                ) : members.length === 0 ? (
                    <div className="bg-bg-elevated border border-white/10 rounded-lg p-8 text-center">
                        <Shield className="w-8 h-8 text-white/20 mx-auto mb-3" />
                        <p className="text-white/60">No additional admins yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div key={member.id} className="bg-bg-elevated border border-white/10 rounded-lg p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        src={member.user?.avatar_url}
                                        fallback={member.user?.display_name || member.user?.email}
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {member.user?.display_name || 'Unknown User'}
                                        </p>
                                        <p className="text-xs text-white/40">
                                            {member.user?.email}
                                        </p>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold tracking-wider ml-2">
                                        {member.role}
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveMember(member.user_id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Note about Owner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-1">About Ownership</h4>
                <p className="text-xs text-blue-400/70">
                    The calendar creator (Owner) has full control and cannot be removed here.
                    Admins have full access to manage events and settings.
                </p>
            </div>
        </div>
    );
}
