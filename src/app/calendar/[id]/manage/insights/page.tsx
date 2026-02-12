'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Ticket, Users, DollarSign, Star, Download, ChevronDown, Info, RefreshCw } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/SupabaseAuthContext';

interface CalendarInsights {
    totalEvents: number;
    totalTicketsSold: number;
    totalSubscribers: number;
    totalRevenue: number;
    eventsLastWeek: number;
    ticketsLastWeek: number;
    subscribersLastWeek: number;
    revenueLastWeek: number;
    avgRating?: number;
    totalFeedbackCount: number;
}

interface FeedbackItem {
    id: string;
    rating: number;
    comment?: string;
    created_at: string;
    event?: {
        id: string;
        title: string;
    };
}

export default function CalendarInsightsPage() {
    const params = useParams();
    const calendarId = params.id as string;
    const { user } = useAuth();
    const supabase = createSupabaseBrowserClient();

    const [insights, setInsights] = useState<CalendarInsights | null>(null);
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch insights data
    const fetchInsights = useCallback(async () => {
        if (!user) return;

        try {
            // Use any cast since calendar_insights table is not yet in generated types
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from('calendar_insights')
                .select('*')
                .eq('calendar_id', calendarId)
                .single();

            if (!error && data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const d = data as any;
                setInsights({
                    totalEvents: d.total_events || 0,
                    totalTicketsSold: d.total_tickets_sold || 0,
                    totalSubscribers: d.total_subscribers || 0,
                    totalRevenue: parseFloat(d.total_revenue || '0'),
                    eventsLastWeek: d.events_this_week || 0,
                    ticketsLastWeek: d.tickets_this_week || 0,
                    subscribersLastWeek: d.subscribers_this_week || 0,
                    revenueLastWeek: parseFloat(d.revenue_this_week || '0'),
                    avgRating: d.avg_rating ? parseFloat(d.avg_rating) : undefined,
                    totalFeedbackCount: d.total_feedback_count || 0,
                });
            } else {
                setInsights({
                    totalEvents: 0,
                    totalTicketsSold: 0,
                    totalSubscribers: 0,
                    totalRevenue: 0,
                    eventsLastWeek: 0,
                    ticketsLastWeek: 0,
                    subscribersLastWeek: 0,
                    revenueLastWeek: 0,
                    totalFeedbackCount: 0,
                });
            }
        } catch (err) {
            console.error('[Insights] Fetch error:', err);
        }
    }, [calendarId, user, supabase]);

    // Fetch feedback data
    const fetchFeedback = useCallback(async () => {
        if (!user) return;

        try {
            const response = await fetch(`/api/feedback?calendarId=${calendarId}`);
            const result = await response.json();

            if (result.success && result.data?.feedbacks) {
                setFeedbacks(result.data.feedbacks);
            }
        } catch (err) {
            console.error('[Insights] Feedback fetch error:', err);
        }
    }, [calendarId, user]);

    // Trigger refresh
    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);

        try {
            const response = await fetch('/api/insights/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ calendarId }),
            });

            if (response.ok) {
                await fetchInsights();
                await fetchFeedback();
            }
        } catch (err) {
            console.error('[Insights] Refresh error:', err);
        } finally {
            setRefreshing(false);
        }
    };

    // Initial load with auto-refresh
    useEffect(() => {
        async function init() {
            setLoading(true);

            // Trigger background refresh
            fetch('/api/insights/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ calendarId }),
            }).catch(() => { }); // Silent fail

            await fetchInsights();
            await fetchFeedback();
            setLoading(false);
        }

        init();
    }, [calendarId, user, fetchInsights, fetchFeedback]);

    const kpiCards = [
        {
            icon: Calendar,
            label: 'Events',
            value: insights?.totalEvents ?? 0,
            trend: insights?.eventsLastWeek ?? 0,
        },
        {
            icon: Ticket,
            label: 'Tickets',
            value: insights?.totalTicketsSold ?? 0,
            trend: insights?.ticketsLastWeek ?? 0,
        },
        {
            icon: Users,
            label: 'Subscribers',
            value: insights?.totalSubscribers ?? 0,
            trend: insights?.subscribersLastWeek ?? 0,
        },
        {
            icon: DollarSign,
            label: 'Sales',
            value: `US$${(insights?.totalRevenue ?? 0).toLocaleString()}`,
            trend: `US$${(insights?.revenueLastWeek ?? 0).toLocaleString()}`,
        },
    ];

    return (
        <div className="space-y-8 max-w-[800px] mx-auto">
            {/* KPI Cards - Luma Style */}
            <div className="grid grid-cols-4 gap-0">
                {loading ? (
                    <>
                        {[1, 2, 3, 4].map((i) => (
                            <KPICardSkeleton key={i} />
                        ))}
                    </>
                ) : (
                    kpiCards.map((kpi, index) => (
                        <KPICard
                            key={kpi.label}
                            icon={kpi.icon}
                            label={kpi.label}
                            value={kpi.value}
                            trend={kpi.trend}
                            isLast={index === kpiCards.length - 1}
                        />
                    ))
                )}
            </div>

            {/* Note */}
            <p className="text-sm text-white/40 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Only events created under this calendar count towards these stats.
            </p>

            {/* Event Feedback Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Event Feedback</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select className="appearance-none bg-white/10 border border-white/10 rounded-lg px-4 py-2 pr-8 text-sm text-white focus:outline-none focus:border-white/30 cursor-pointer">
                                <option>By Event</option>
                                <option>All Feedback</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button className="p-2 text-white/40 hover:text-white transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <FeedbackSkeleton />
                ) : (insights?.totalFeedbackCount ?? 0) === 0 ? (
                    <FeedbackEmptyState />
                ) : (
                    <FeedbackDisplay
                        avgRating={insights?.avgRating}
                        totalCount={insights?.totalFeedbackCount ?? 0}
                        feedbacks={feedbacks}
                    />
                )}
            </section>
        </div>
    );
}

interface KPICardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    trend: string | number;
    isLast?: boolean;
}

function KPICard({ icon: Icon, label, value, trend, isLast }: KPICardProps) {
    return (
        <div className={`py-4 px-4 border-r border-white/5 ${isLast ? 'border-r-0' : ''}`}>
            <div className="flex items-center gap-2 text-white/50 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
            </div>
            <p className="text-2xl font-semibold text-white mb-0.5">
                {value}
            </p>
            <p className="text-sm text-white/40">
                {trend} last week
            </p>
        </div>
    );
}

function KPICardSkeleton() {
    return (
        <div className="py-4 px-4 border-r border-white/5 last:border-r-0">
            <div className="h-4 w-16 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-8 w-12 bg-white/10 rounded animate-pulse mb-1" />
            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
        </div>
    );
}

interface FeedbackDisplayProps {
    avgRating?: number;
    totalCount: number;
    feedbacks: FeedbackItem[];
}

function FeedbackDisplay({ avgRating, totalCount, feedbacks }: FeedbackDisplayProps) {
    return (
        <div className="space-y-4">
            {/* Rating Summary */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                    <span className="text-3xl font-bold text-white">{avgRating?.toFixed(1) ?? '-'}</span>
                </div>
                <div className="text-white/50 text-sm">
                    Average rating from {totalCount} {totalCount === 1 ? 'response' : 'responses'}
                </div>
            </div>

            {/* Individual Feedbacks */}
            {feedbacks.length > 0 && (
                <div className="space-y-3 mt-6">
                    {feedbacks.slice(0, 5).map((feedback) => (
                        <div key={feedback.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`h-4 w-4 ${star <= feedback.rating
                                                ? 'text-yellow-500 fill-yellow-500'
                                                : 'text-white/20'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-white/40">
                                    {feedback.event?.title || 'Unknown Event'}
                                </span>
                            </div>
                            {feedback.comment && (
                                <p className="text-sm text-white/70">{feedback.comment}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function FeedbackEmptyState() {
    return (
        <div className="py-12 text-center">
            <div className="relative w-28 h-24 mx-auto mb-4">
                <Star className="absolute top-0 left-2 h-6 w-6 text-yellow-500 fill-yellow-500" />
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-bg-elevated border border-white/10 rounded-lg w-20 h-14 flex flex-col items-center justify-center shadow-lg">
                    <div className="w-12 h-2 bg-white/20 rounded mb-2" />
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="h-3 w-3 text-white/30" />
                        ))}
                    </div>
                    <div className="w-10 h-2 bg-white/20 rounded mt-2" />
                </div>
                <Star className="absolute bottom-0 right-0 h-8 w-8 text-yellow-500 fill-yellow-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Feedback</h3>
            <p className="text-white/40">
                No feedback has been collected for your events.
            </p>
        </div>
    );
}

function FeedbackSkeleton() {
    return (
        <div className="py-6">
            <div className="h-8 w-24 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
        </div>
    );
}
