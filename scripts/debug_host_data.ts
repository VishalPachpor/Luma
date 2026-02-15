import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
    const hostId = 'abf4af53-cefe-43ac-aab0-82219abc3765';

    console.log(`Checking data for Host ID: ${hostId}`);

    // Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', hostId)
        .single();

    if (profileError) {
        console.error('Profile Error:', profileError);
    } else {
        console.log('Profile Data:');
        console.log(`- Display Name: ${profile.display_name}`);
        console.log(`- Avatar URL: ${profile.avatar_url}`);
        console.log(`- Cover Image: ${profile.cover_image}`);
    }

    // Check Events
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, date, status, organizer_id')
        .eq('organizer_id', hostId)
        .order('date', { ascending: false });

    if (eventsError) {
        console.error('Events Error:', eventsError);
    } else {
        console.log(`Found ${events.length} events for host.`);
        events.forEach(e => {
            console.log(`- ${e.title} (${e.date}) [${e.status}]`);
        });
    }
}

main().catch(console.error);
