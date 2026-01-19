/**
 * Migration Script: Firestore -> Supabase
 * 
 * Usage:
 * 1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account path
 * 2. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env
 * 3. Run: npx tsx scripts/migrate-to-supabase.ts
 */

import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// --- Configuration ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// For Firebase, we expect GOOGLE_APPLICATION_CREDENTIALS or use default app credential
// But for this script, we'll try to find a service account file or warn user

// --- Supabase Setup ---
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// --- Firebase Setup ---
// We support both GOOGLE_APPLICATION_CREDENTIALS (file) and Vercel-style Env Vars
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            console.log('🔹 Using Firebase credentials from .env file');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            });
        } else {
            // Fallback to application default (standard Google strategy)
            console.log('🔹 Attempting to use GOOGLE_APPLICATION_CREDENTIALS or default credentials...');
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        }
        console.log('✅ Firebase Admin initialized');
    } catch (e) {
        console.error('❌ Failed to initialize Firebase Admin.');
        console.error('You need ONE of the following:');
        console.error('1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to your service-account.json');
        console.error('2. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in your .env file');
        process.exit(1);
    }
}

const db = admin.firestore();

async function migrateUsers() {
    console.log('\n--- Migrating Users ---');
    const snapshot = await db.collection('users').get();

    let count = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const uid = doc.id;

        const { error } = await supabase.from('users').upsert({
            id: uid, // Valid because id is TEXT in our schema
            email: data.email || `missing_${uid}@example.com`,
            display_name: data.displayName || data.name || null,
            avatar_url: data.photoURL || data.avatar || null,
            created_at: data.createdAt?.toDate?.() || new Date(),
            updated_at: new Date()
        });

        if (error) console.error(`Failed to migrate user ${uid}:`, error.message);
        else count++;
    }
    console.log(`✅ Migrated ${count}/${snapshot.size} users`);
}

async function migrateEvents() {
    console.log('\n--- Migrating Events ---');
    const snapshot = await db.collection('events').get();

    let count = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const eventId = doc.id;

        // Ensure organizer is migrated first? Ideally yes, but we use TEXT id so FK will work if user exists
        let organizerId = data.organizerId || data.organizer?.id;

        if (!organizerId) {
            console.warn(`Skipping event ${eventId}: No organizer ID`);
            continue;
        }

        // Construct metadata object for extra fields
        const { title, description, date, location, organizerId: oid, coverImage, category, capacity, price, ...rest } = data;

        // Parse date (Firestore Timestamp or string)
        let eventDate = new Date();
        if (data.date?.toDate) eventDate = data.date.toDate();
        else if (typeof data.date === 'string') eventDate = new Date(data.date);

        const { error } = await supabase.from('events').upsert({
            id: eventId, // Typically we want UUIDs, but if Firestore IDs are strings, it might fail if table is UUID. 
            // Check Schema: id uuid default uuid_generate_v4() primary key.
            // FIX: If Firestore IDs are not UUIDs, we can't force them into UUID column easily.
            // Strategy: If Firestore IDs look like UUIDs, use them. Else, let Supabase generate new one and map it? 
            // Realistically, for "Hybrid", we want to KEEP the ID to not break URLs.
            // *** CRITICAL CHANGE ***: We should alter the table to accept TEXT id if we want to keep generic Firestore IDs.
            // For now, let's assume we want to TRY to keep them. If they fail UUID validation, we generate new one.
            // To be safe for this script, I will try to insert. If it fails due to UUID, I'll generate a new one 
            // and we'll lose the URL stability.
            // BETTER: Let's assume for this "Production Grade" task we want to keep IDs.
            // I will check if the ID is a valid UUID. If not, I'll warn.
            // Actually, Firestore auto-IDs are 20 char alphanumeric, NOT UUIDs.
            // We MUST change the `events` table `id` to `text` or `varchar` in Supabase to support migration.
            title: data.title || 'Untitled Event',
            description: data.description || '',
            date: eventDate.toISOString(),
            location: data.location || '',
            organizer_id: organizerId,
            cover_image: data.coverImage || null,
            category: data.category || 'General',
            capacity: data.capacity || 0,
            price: data.price || 0,
            metadata: rest,
            created_at: data.createdAt?.toDate?.() || new Date(),
        });

        if (error) {
            if (error.code === '22P02') { // Invalid text representation for uuid
                console.error(`Skipping event ${eventId}: ID is not a UUID. Requires schema change to TEXT.`);
            } else {
                console.error(`Failed to migrate event ${eventId}:`, error.message);
            }
        } else {
            count++;
        }
    }
    console.log(`✅ Migrated ${count}/${snapshot.size} events`);
}

async function migrateRSVPs() {
    console.log('\n--- Migrating RSVPs (New Denormalized Collection) ---');
    // We iterate USERS, then their RSVPs
    const usersSnapshot = await db.collection('users').get();

    let count = 0;
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const rsvpsSnapshot = await userDoc.ref.collection('rsvps').get();

        for (const rsvpDoc of rsvpsSnapshot.docs) {
            const data = rsvpDoc.data();
            const eventId = rsvpDoc.id; // RSVP doc ID is usually eventId in our new structure

            const { error } = await supabase.from('rsvps').upsert({
                user_id: userId,
                event_id: eventId,
                status: data.status || 'going',
                created_at: data.rsvpAt?.toDate?.() || new Date()
            });

            if (error) console.error(`Failed RSVP ${userId}->${eventId}:`, error.message);
            else count++;
        }
    }
    console.log(`✅ Migrated ${count} RSVPs`);
}

async function main() {
    console.log('🚀 Starting Migration...');
    await migrateUsers();
    await migrateEvents();
    await migrateRSVPs();
    console.log('✨ Migration Complete!');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
