
import { getDashboardStats } from '@/lib/repositories/analytics.repository';
import { notFound } from 'next/navigation';
import { Eye, Mail, Users, TrendingUp, BarChart3, ArrowUpRight, CheckCircle2, Clock, UserCheck, XCircle } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase';

interface InfoCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon: React.ReactNode;
    trend?: string;
}

function InfoCard({ title, value, subtext, icon, trend }: InfoCardProps) {
    return (
        <div className="bg-surface-1 border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl text-white/80 group-hover:text-white transition-colors">
                    {icon}
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-green-400 text-xs font-medium bg-green-400/10 px-2 py-1 rounded-full">
                        <TrendingUp size={12} />
                        {trend}
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <h3 className="text-3xl font-bold text-white">{value}</h3>
                <p className="text-sm text-white/40 font-medium uppercase tracking-wider">{title}</p>
            </div>
            {subtext && (
                <p className="mt-4 text-xs text-white/30 border-t border-white/5 pt-3">
                    {subtext}
                </p>
            )}
        </div>
    );
}

async function getGuestBreakdown(eventId: string) {
    const supabase = getServiceSupabase();
    const { data: guests } = await supabase
        .from('guests')
        .select('status')
        .eq('event_id', eventId);

    if (!guests) return { approved: 0, pending: 0, checkedIn: 0, rejected: 0, total: 0 };

    const breakdown = {
        approved: guests.filter(g => g.status === 'issued' || g.status === 'approved').length,
        pending: guests.filter(g => g.status === 'pending_approval').length,
        checkedIn: guests.filter(g => g.status === 'scanned').length,
        rejected: guests.filter(g => g.status === 'rejected' || g.status === 'forfeited').length,
        total: guests.length,
    };

    return breakdown;
}

export default async function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [stats, guestBreakdown] = await Promise.all([
        getDashboardStats(id),
        getGuestBreakdown(id),
    ]);

    if (!stats) {
        notFound();
    }

    const conversionRate = stats.totalViews > 0
        ? ((stats.registrations / stats.totalViews) * 100).toFixed(1)
        : '0.0';

    // Build funnel data
    const funnelSteps = [
        { label: 'Views', value: stats.totalViews, color: 'bg-blue-500' },
        { label: 'Registrations', value: stats.registrations, color: 'bg-indigo-500' },
        { label: 'Checked In', value: guestBreakdown.checkedIn, color: 'bg-green-500' },
    ];
    const funnelMax = Math.max(...funnelSteps.map(s => s.value), 1);

    // Guest status segments
    const statusSegments = [
        { label: 'Approved', value: guestBreakdown.approved, color: 'bg-green-500', icon: <CheckCircle2 size={14} /> },
        { label: 'Pending', value: guestBreakdown.pending, color: 'bg-yellow-500', icon: <Clock size={14} /> },
        { label: 'Checked In', value: guestBreakdown.checkedIn, color: 'bg-blue-500', icon: <UserCheck size={14} /> },
        { label: 'Rejected', value: guestBreakdown.rejected, color: 'bg-red-500', icon: <XCircle size={14} /> },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-white">Event Insights</h1>
                <p className="text-white/40">Real-time performance metrics for your event</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard
                    title="Total Views"
                    value={stats.totalViews}
                    icon={<Eye size={20} />}
                    subtext="Unique page visits"
                />

                <InfoCard
                    title="Registrations"
                    value={stats.registrations}
                    icon={<Users size={20} />}
                    subtext="Confirmed attendees"
                />

                <InfoCard
                    title="Invites Sent"
                    value={stats.invitesSent}
                    icon={<Mail size={20} />}
                    subtext="Through platform"
                />

                <InfoCard
                    title="Conversion"
                    value={`${conversionRate}%`}
                    icon={<BarChart3 size={20} />}
                    subtext="Views to Registration"
                    trend={Number(conversionRate) > 10 ? 'High' : undefined}
                />
            </div>

            {/* Registration Funnel */}
            <div className="bg-surface-1 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white/5 rounded-lg">
                        <TrendingUp size={18} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">Registration Funnel</h3>
                        <p className="text-sm text-white/40">Conversion at each stage</p>
                    </div>
                </div>
                <div className="space-y-4">
                    {funnelSteps.map((step, i) => {
                        const pct = funnelMax > 0 ? (step.value / funnelMax) * 100 : 0;
                        const prevStep = i > 0 ? funnelSteps[i - 1] : null;
                        const dropoff = prevStep && prevStep.value > 0
                            ? ((1 - step.value / prevStep.value) * 100).toFixed(0)
                            : null;

                        return (
                            <div key={step.label}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/60">{step.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-white">{step.value.toLocaleString()}</span>
                                        {dropoff && (
                                            <span className="text-xs text-white/30">-{dropoff}%</span>
                                        )}
                                    </div>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${step.color} rounded-full transition-all duration-700`}
                                        style={{ width: `${Math.max(pct, 2)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Guest Status Breakdown */}
            <div className="bg-surface-1 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white/5 rounded-lg">
                        <Users size={18} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">Guest Breakdown</h3>
                        <p className="text-sm text-white/40">{guestBreakdown.total} total guests</p>
                    </div>
                </div>

                {guestBreakdown.total === 0 ? (
                    <p className="text-sm text-white/30 text-center py-8">No guests registered yet</p>
                ) : (
                    <>
                        {/* Horizontal stacked bar */}
                        <div className="h-4 rounded-full overflow-hidden flex mb-6">
                            {statusSegments.map((seg) => {
                                const pct = guestBreakdown.total > 0 ? (seg.value / guestBreakdown.total) * 100 : 0;
                                if (pct === 0) return null;
                                return (
                                    <div
                                        key={seg.label}
                                        className={`${seg.color} transition-all duration-500`}
                                        style={{ width: `${pct}%` }}
                                    />
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {statusSegments.map((seg) => (
                                <div key={seg.label} className="flex items-center gap-3 p-3 bg-white/2 rounded-xl">
                                    <div className={`w-3 h-3 rounded-full ${seg.color}`} />
                                    <div>
                                        <p className="text-sm font-medium text-white">{seg.value}</p>
                                        <p className="text-xs text-white/30">{seg.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
