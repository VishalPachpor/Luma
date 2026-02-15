import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const hostId = 'abf4af53-cefe-43ac-aab0-82219abc3765';

    console.log(`Syncing avatar for Host ID: ${hostId}`);

    // Get Auth User
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(hostId);

    if (authError || !user) {
        console.error('Auth Error:', authError);
        return;
    }

    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    console.log('Found Auth Avatar:', avatarUrl);

    if (avatarUrl) {
        // Update Profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', hostId);

        if (updateError) {
            console.error('Update Error:', updateError);
        } else {
            console.log('Successfully updated profile avatar_url.');
        }
    } else {
        console.log('No avatar found in user_metadata.');
        // Optional: Set a fallback if none found?
        // const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`;
        // ...
    }
}

main().catch(console.error);
