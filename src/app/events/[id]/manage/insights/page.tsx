
import { getDashboardStats } from '@/lib/repositories/analytics.repository';
import { notFound } from 'next/navigation';
import { Eye, Mail, Users, TrendingUp, BarChart3, ArrowUpRight } from 'lucide-react';

interface InfoCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon: React.ReactNode;
    trend?: string;
}

function InfoCard({ title, value, subtext, icon, trend }: InfoCardProps) {
    return (
        <div className="bg-[#151A29] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
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

export default async function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const stats = await getDashboardStats(id);

    if (!stats) {
        notFound();
    }

    const conversionRate = stats.totalViews > 0
        ? ((stats.registrations / stats.totalViews) * 100).toFixed(1)
        : '0.0';

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

            {/* Placeholder for future charts */}
            <div className="bg-[#151A29] border border-white/5 rounded-2xl p-8 text-center py-20">
                <div className="inline-flex p-4 bg-white/5 rounded-full mb-4">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Detailed Analytics Coming Soon</h3>
                <p className="text-white/40 max-w-sm mx-auto">
                    We're building advanced charts to track your traffic sources and daily trends.
                </p>
            </div>
        </div>
    );
}
