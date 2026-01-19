const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { createClient } = require('@supabase/supabase-js');

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);
const eventId = '7030ca5e-677f-405a-b5d0-b7023ace3f76';

async function check() {
    console.log(`Checking guests for event: ${eventId}`);

    // 1. Get all guests
    const { data: guests, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId);

    if (error) {
        console.error('Error fetching guests:', error);
        return;
    }

    console.log(`Found ${guests.length} guests.`);
    guests.forEach(g => {
        console.log(`Guest ID: ${g.id}, User ID: ${g.user_id}, Status: ${g.status}`);
    });

    if (guests.length > 0) {
        const userId = guests[0].user_id;
        console.log(`\nChecking profile for User ID: ${userId}`);
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        console.log('Profile:', profile);
    }
}

check();
