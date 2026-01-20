/**
 * Event Feedback API
 * POST /api/feedback - Submit feedback for an event
 * GET /api/feedback?eventId=<uuid> - Get feedback for an event (organizer only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase';

// POST: Submit feedback
export async function POST(request: NextRequest) {
    try {
        const { eventId, rating, comment } = await request.json();

        // Validation
        if (!eventId) {
            return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
        }
        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 });
        }

        // Auth check
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const adminSupabase = getServiceSupabase();

        // Verify user attended this event (has RSVP or guest entry)
        const { data: attendance } = await adminSupabase
            .from('rsvps')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .eq('status', 'going')
            .single();

        if (!attendance) {
            // Check guests table as fallback
            const { data: guest } = await adminSupabase
                .from('guests')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .eq('status', 'accepted')
                .single();

            if (!guest) {
                return NextResponse.json(
                    { error: 'You must be an attendee to submit feedback' },
                    { status: 403 }
                );
            }
        }

        // Check if event has ended (optional but recommended)
        const { data: event } = await adminSupabase
            .from('events')
            .select('end_time, start_time')
            .eq('id', eventId)
            .single();

        if (event) {
            const eventEndTime = new Date(event.end_time || event.start_time);
            if (eventEndTime > new Date()) {
                return NextResponse.json(
                    { error: 'Cannot submit feedback before event ends' },
                    { status: 400 }
                );
            }
        }

        // Insert or update feedback
        const { data: feedback, error: insertError } = await adminSupabase
            .from('event_feedback')
            .upsert({
                event_id: eventId,
                user_id: user.id,
                rating,
                comment: comment || null,
            }, {
                onConflict: 'event_id,user_id'
            })
            .select()
            .single();

        if (insertError) {
            console.error('[Feedback] Insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to submit feedback', details: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback
        });

    } catch (error) {
        console.error('[Feedback] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET: Retrieve feedback for an event (organizer only)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');
        const calendarId = searchParams.get('calendarId');

        if (!eventId && !calendarId) {
            return NextResponse.json(
                { error: 'eventId or calendarId is required' },
                { status: 400 }
            );
        }

        // Auth check
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const adminSupabase = getServiceSupabase();

        // Build query
        let query = adminSupabase
            .from('event_feedback')
            .select(`
                id,
                rating,
                comment,
                created_at,
                event:events!inner(
                    id,
                    title,
                    calendar:calendars!inner(
                        id,
                        owner_id
                    )
                )
            `);

        if (eventId) {
            query = query.eq('event_id', eventId);
        }

        if (calendarId) {
            query = query.eq('event.calendar_id', calendarId);
        }

        const { data: feedbacks, error: fetchError } = await query;

        if (fetchError) {
            console.error('[Feedback] Fetch error:', fetchError);
            return NextResponse.json(
                { error: 'Failed to fetch feedback' },
                { status: 500 }
            );
        }

        // Filter to only show feedback for calendars the user owns
        const userFeedback = feedbacks?.filter(
            f => f.event?.calendar?.owner_id === user.id
        ) || [];

        // Calculate aggregates
        const totalRatings = userFeedback.length;
        const avgRating = totalRatings > 0
            ? userFeedback.reduce((sum, f) => sum + f.rating, 0) / totalRatings
            : null;

        return NextResponse.json({
            success: true,
            data: {
                feedbacks: userFeedback,
                aggregates: {
                    totalCount: totalRatings,
                    averageRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
                    distribution: {
                        5: userFeedback.filter(f => f.rating === 5).length,
                        4: userFeedback.filter(f => f.rating === 4).length,
                        3: userFeedback.filter(f => f.rating === 3).length,
                        2: userFeedback.filter(f => f.rating === 2).length,
                        1: userFeedback.filter(f => f.rating === 1).length,
                    }
                }
            }
        });

    } catch (error) {
        console.error('[Feedback] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
