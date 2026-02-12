import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { CalendarManageHeader } from '@/components/features/calendar/CalendarManageHeader';

interface LayoutProps {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}

async function getCalendar(id: string, userId?: string) {
    // Security: Only allow access if user is logged in
    if (!userId) return null;

    // Use Admin Client to bypass potentially broken RLS policies
    const { getServiceSupabase } = await import('@/lib/supabase');
    const adminSupabase = getServiceSupabase();

    const { data: calendar, error } = await adminSupabase
        .from('calendars')
        .select('*')
        .eq('id', id)
        .eq('owner_id', userId) // Enforce ownership manually
        .single();

    if (error || !calendar) return null;
    return calendar;
}

export default async function CalendarManageLayout({ children, params }: LayoutProps) {
    const { id } = await params;

    // Fetch user once at the top
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (id === 'personal') {
        const { getServiceSupabase } = await import('@/lib/supabase');
        let redirectUrl = '/calendars'; // Default fallback

        if (!user) {
            redirect('/login?next=/calendar/personal/manage');
        }

        try {
            const adminSupabase = getServiceSupabase();

            const { data: calendars, error: fetchError } = await adminSupabase
                .from('calendars')
                .select('id, name')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (fetchError) {
                console.error("[Layout] Error fetching calendars:", fetchError);
            }

            if (calendars && calendars.length > 0) {
                const personal = calendars.find(c => c.name === 'Personal') || calendars[0];
                redirectUrl = `/calendar/${personal.id}/manage`;
            } else {
                // 2. Create default 'Personal' calendar
                const randomSlug = `personal-${user.id.slice(0, 4)}-${Math.random().toString(36).substring(2, 6)}`;

                const { error: createError, data: newCal } = await adminSupabase
                    .from('calendars')
                    .insert({
                        owner_id: user.id,
                        name: 'Personal',
                        slug: randomSlug,
                        is_private: true
                    })
                    .select('id')
                    .single();

                if (createError) {
                    console.error('Failed to create calendar (DB error):', JSON.stringify(createError, null, 2));
                } else if (newCal) {
                    redirectUrl = `/calendar/${newCal.id}/manage`;
                }
            }
        } catch (err) {
            console.error('[Layout] Critical error:', err);
        }

        // Perform redirect outside of try-catch
        redirect(redirectUrl);
    }

    // Now fetch the actual calendar using the ID and User ID for verification
    const calendar = await getCalendar(id, user?.id);

    if (!calendar) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-bg-primary text-white pt-12">
            {/* Header - Client component with scroll-hide */}
            <Suspense fallback={<div className="h-32 bg-bg-primary" />}>
                <CalendarManageHeader calendarId={id} calendarName={calendar.name} />
            </Suspense>

            {/* Content */}
            <main className="max-w-[800px] mx-auto px-8 pt-12 pb-12 animate-in fade-in duration-500">
                {children}
            </main>
        </div>
    );
}
