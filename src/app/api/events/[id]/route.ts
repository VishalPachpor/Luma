import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getServiceSupabase } from '@/lib/supabase';
import { inngest } from '@/inngest/client';

// Note: params needs to be awaited in Next.js 15+ or typed correctly
// But for standard route handlers in current Next.js (13/14), it's usually { params }: { params: { id: string } }

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const supabase = getServiceSupabase();

        // Fetch event details
        // Note: 'events' table should be publicly readable, but using service role ensures we get it
        const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Return normalized event data
        return NextResponse.json({
            id: event.id,
            title: event.title,
            description: event.description,
            date: event.date, // already ISO string
            endDate: event.end_date,
            location: event.location,
            coverImage: event.cover_image,
            organizerId: event.organizer_id,
            // Extract from metadata (flexible JSON)
            theme: (event.metadata as any)?.theme || 'Minimal',
            themeColor: (event.metadata as any)?.themeColor || 'Custom',
            font: (event.metadata as any)?.font || 'Geist Mono',
        });
    } catch (error) {
        console.error('[EventAPI] Get Event Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // Updated for Next.js 15+ patterns just in case, or standard
) {
    const { id } = await context.params;

    try {
        // 1. Auth Check (Same as Create)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        // Verify User
        let uid;
        if (adminAuth) {
            const decoded = await adminAuth.verifyIdToken(token);
            uid = decoded.uid;
        } else {
            // Dev fallback
            uid = 'mock_user_id';
        }

        // 2. Verify Ownership
        let existingEvent;
        if (adminDb) {
            const doc = await adminDb.collection('events').doc(id).get();
            if (!doc.exists) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            existingEvent = doc.data();

            if (existingEvent?.organizerId !== uid) {
                return NextResponse.json({ error: 'Forbidden: You are not the organizer' }, { status: 403 });
            }
        }

        const body = await request.json();
        // Extract updatable fields
        const { title, description, date, location, coverImage, capacity, price, registrationQuestions, theme, themeColor, font, endDate } = body;

        // 3. Update Firestore (Dual Write 1)
        if (adminDb) {
            const updateData: any = { updatedAt: new Date() };
            if (title) updateData.title = title;
            if (description) updateData.description = description;
            if (date) updateData.date = new Date(date); // Convert string to Date
            if (location) updateData.location = location;
            if (coverImage) updateData.coverImage = coverImage;
            if (capacity) updateData.capacity = Number(capacity);
            if (price) updateData.price = Number(price);
            if (registrationQuestions) updateData.registrationQuestions = registrationQuestions;
            // Add new fields
            if (theme) updateData.theme = theme;
            if (themeColor) updateData.themeColor = themeColor;
            if (font) updateData.font = font;
            if (endDate) updateData.endDate = new Date(endDate); // Firestore usually likes Dates

            await adminDb.collection('events').doc(id).update(updateData);
        }

        // 4. Update Supabase (Dual Write 2)
        const supabase = getServiceSupabase();

        const supaUpdate: any = { updated_at: new Date().toISOString() };
        if (title) supaUpdate.title = title;
        if (description) supaUpdate.description = description;
        if (date) supaUpdate.date = new Date(date).toISOString();
        if (location) supaUpdate.location = location;
        if (coverImage) supaUpdate.cover_image = coverImage;
        if (capacity) supaUpdate.capacity = Number(capacity);
        if (price) supaUpdate.price = Number(price);
        if (registrationQuestions) supaUpdate.registration_questions = registrationQuestions;
        // New fields
        // Fetch current metadata to merge
        const { data: currentData } = await supabase.from('events').select('metadata').eq('id', id).maybeSingle();
        const currentMeta: any = currentData?.metadata || {};

        const newMeta = {
            ...currentMeta,
            ...(theme && { theme }),
            ...(themeColor && { themeColor }),
            ...(font && { font })
        };
        supaUpdate.metadata = newMeta;

        // EndDate Column
        if (endDate) supaUpdate.end_date = new Date(endDate).toISOString();

        try {
            const { error: updateError } = await supabase.from('events').update(supaUpdate).eq('id', id);
            if (updateError) throw updateError;
        } catch (supaError: any) {
            console.error('Supabase Update Failed:', supaError);
            // If error related to metadata (column missing), retry without it
            // Also handling general errors to attempt partial save if possible
            if (supaError.message?.includes('metadata') || supaError.message?.includes('column') || supaError.code === '42703') {
                console.warn('Retrying update without metadata...');
                delete supaUpdate.metadata;
                const { error: retryError } = await supabase.from('events').update(supaUpdate).eq('id', id);
                if (retryError) throw retryError;
            } else {
                throw supaError;
            }
        }

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
    const { id: rawId } = await context.params;
    const id = rawId?.trim();
    console.log(`[DELETE API] Deleting event with ID: "${id}" (Length: ${id?.length})`);

    try {
        // 1. Auth Check (Supabase Verification)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const supabase = getServiceSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('Supabase token verification failed:', authError);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const uid = user.id;

        // 2. Verify Ownership & Get Event Details (Supabase)
        // Check if ID is likely a UUID (36 chars) vs Legacy Firebase ID (20 chars)
        const isUuid = id?.length === 36;
        console.log(`[DELETE API] isUuid check: ${isUuid} (ID: "${id}")`);

        if (!isUuid) {
            // Legacy Firebase ID? Only check Firebase if adminDb exists
            // But if we are full Supabase, we might block this.
            if (adminDb && adminAuth) {
                console.warn(`[DELETE API] Blocking legacy event deletion for non-UUID ID: ${id}`);
                return NextResponse.json({ error: 'Legacy event deletion not supported with Supabase token' }, { status: 400 });
            }
            return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
        }

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

        // 3. Trigger Cancellation Email (Inngest) - Non-blocking
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

        // 4. Delete related records (RSVPs) first (Supabase)
        const { error: rsvpError } = await supabase.from('rsvps').delete().eq('event_id', id);
        if (rsvpError) {
            console.error('Failed to delete associated RSVPs:', rsvpError);
        }

        // Delete Guests too? (guests table)
        const { error: guestError } = await supabase.from('guests').delete().eq('event_id', id);
        if (guestError) {
            console.error('Failed to delete associated Guests:', guestError);
        }

        // 5. Delete Event (Supabase)
        const { error: deleteError } = await supabase.from('events').delete().eq('id', id);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // 6. Delete from Firestore (Dual Write - Best Effort)
        if (adminDb) {
            try {
                await adminDb.collection('events').doc(id).delete();
            } catch (e) {
                console.warn('Firestore delete failed:', e);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete Event Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
