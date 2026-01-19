const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { createClient } = require('@supabase/supabase-js');

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    const { data: rsvps, error } = await supabase.from('rsvps').select('*').limit(1);
    if (error) {
        console.log('Error selecting rsvps:', error.message);
    } else {
        if (rsvps.length > 0) {
            console.log('RSVPs Sample:', JSON.stringify(rsvps[0], null, 2));
        } else {
            console.log('RSVPs table exists but is empty.');
            // Try to see columns by selecting specific likely ones or just keys of empty object won't work.
            // But valid select * returns empty array means table exists.
        }
    }
}

check();
