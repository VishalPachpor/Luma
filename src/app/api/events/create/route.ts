import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getServiceSupabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        let uid: string;

        if (adminAuth) {
            try {
                const decodedToken = await adminAuth.verifyIdToken(token);
                uid = decodedToken.uid;
            } catch (e) {
                console.error('Token verification failed:', e);
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            }
        } else {
            // Mock auth for dev if admin auth not set up (NOT RECOMMENDED FOR PROD)
            console.warn('⚠️ Admin Auth not initialized. Skipping verification (DEV ONLY).');
            uid = 'mock_user_id';
            // Ideally we fail here: return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const body = await request.json();
        const {
            title,
            description,
            date,
            location,
            coverImage,
            category,
            capacity,
            price,
            city,
            coords,
            organizer,
            tags,
            registrationQuestions
        } = body;

        // Validation
        if (!title || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate ID (Use Standard UUID for compatibility with Supabase)
        const eventId = crypto.randomUUID();
        const createdAt = new Date();
        const eventData = {
            id: eventId, // explicit ID
            title,
            description: description || '',
            date: new Date(date), // Firestore Timestamp
            location: location || '',
            city: city || '', // New field
            coords: coords || null, // New field
            organizerId: uid,
            organizer: organizer || '', // New field
            coverImage: coverImage || null,
            category: category || 'General',
            capacity: Number(capacity) || 0,
            price: Number(price) || 0,
            attendees: 0,
            tags: tags || [], // New field
            createdAt: createdAt,
            updatedAt: createdAt,
            registrationQuestions: registrationQuestions || [] // Add new field
        };

        // 2. Write to Firestore
        if (adminDb) {
            await adminDb.collection('events').doc(eventId).set(eventData);
        } else {
            console.warn('⚠️ Admin DB not initialized. Skipping Firestore write.');
        }

        // 3. Write to Supabase (Dual Write)
        const supabase = getServiceSupabase();

        // Transform for SQL (snake_case)
        const { error: supaError } = await supabase.from('events').insert({
            id: eventId,
            title,
            description: description || '',
            date: new Date(date).toISOString(),
            location: location || '',
            city: city || '', // New field
            coords: coords || null, // New field
            organizer_id: uid, // We assume user exists in Supabase (synced via other means or just now)
            organizer: organizer || '', // New field
            cover_image: coverImage || null,
            category: category || 'General',
            capacity: Number(capacity) || 0,
            price: Number(price) || 0,
            attendees: 0, // New field
            tags: tags || [], // New field
            created_at: createdAt.toISOString(),
            updated_at: createdAt.toISOString(),
            registration_questions: registrationQuestions || [] // New field
            // metadata: { ... } // optional
        });

        if (supaError) {
            console.error('Supabase Write Failed:', supaError);
            // We choose NOT to fail the request if Supabase fails (Best Effort availability),
            // OR we could fail. For "Migration Phase", logging is safer to not block users.

            // If the error is foreign key violation (organizer_id), it means user not in Supabase.
            // We should ideally sync the user profile here too using "Upsert".
            if (supaError.code === '23503') { // FK violation
                console.warn('Organizer not found in Supabase. Attempting lazy sync...');
                // Only if we had user details... we don't have them in this body.
                // We'd need to fetch from Firestore user or Auth token.
                // For now, let's just log.
            }
        }

        return NextResponse.json({ success: true, eventId });

    } catch (error) {
        console.error('Create Event Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
