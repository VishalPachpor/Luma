import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { inngest } from '@/inngest/client';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const supabase = getServiceSupabase();

        const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: event.id,
            title: event.title,
            description: event.description,
            date: event.date,
            endDate: event.end_date,
            location: event.location,
            coverImage: event.cover_image,
            organizerId: event.organizer_id,
            theme: (event.metadata as any)?.theme || 'Minimal',
            themeColor: (event.metadata as any)?.themeColor || 'Custom',
            font: (event.metadata as any)?.font || 'Geist Mono',
            capacity: event.capacity,
            price: event.price,
            currency: event.currency,
            registrationQuestions: event.registration_questions,
            visibility: event.visibility,
            status: event.status,
            requireApproval: event.require_approval,
        });
    } catch (error) {
        console.error('[EventAPI] Get Event Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const uid = user.id;

        const { data: existingEvent, error: fetchError } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', id)
            .single();

        if (fetchError || !existingEvent) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        if (existingEvent.organizer_id !== uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, date, location, coverImage, capacity, price, registrationQuestions, theme, themeColor, font, endDate, status, visibility, requireApproval } = body;

        const supaUpdate: any = { updated_at: new Date().toISOString() };
        if (title) supaUpdate.title = title;
        if (description) supaUpdate.description = description;
        if (date) supaUpdate.date = new Date(date).toISOString();
        if (location) supaUpdate.location = location;
        if (coverImage) supaUpdate.cover_image = coverImage;
        if (capacity !== undefined) supaUpdate.capacity = Number(capacity);
        if (price !== undefined) supaUpdate.price = Number(price);
        if (registrationQuestions) supaUpdate.registration_questions = registrationQuestions;
        if (endDate) supaUpdate.end_date = new Date(endDate).toISOString();
        if (status) supaUpdate.status = status;
        if (visibility) supaUpdate.visibility = visibility;
        if (requireApproval !== undefined) supaUpdate.require_approval = requireApproval;

        const { data: currentData } = await supabase.from('events').select('metadata').eq('id', id).maybeSingle();
        const currentMeta: any = currentData?.metadata || {};

        const newMeta = {
            ...currentMeta,
            ...(theme && { theme }),
            ...(themeColor && { themeColor }),
            ...(font && { font })
        };
        supaUpdate.metadata = newMeta;

        const { error: updateError } = await supabase.from('events').update(supaUpdate).eq('id', id);
        if (updateError) throw updateError;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update Event Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const uid = user.id;

        const { data: event, error: fetchError } = await supabase
            .from('events')
            .select('id, title, organizer_id')
            .eq('id', id)
            .single();

        if (fetchError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        if (event.organizer_id !== uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        try {
            await inngest.send({
                name: "app/event.cancelled",
                data: {
                    eventId: id,
                    eventTitle: event.title,
                    organizerId: uid
                }
            });
        } catch (e) {
            console.warn('Inngest email trigger failed:', e);
        }

        // Delete related
        await supabase.from('rsvps').delete().eq('event_id', id);
        await supabase.from('guests').delete().eq('event_id', id);

        const { error: deleteError } = await supabase.from('events').delete().eq('id', id);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete Event Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
