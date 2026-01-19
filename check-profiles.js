const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { createClient } = require('@supabase/supabase-js');

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.log('Error selecting profiles:', error.message);
    } else {
        console.log('profiles exists. Sample:', JSON.stringify(data[0]));
    }
}

check();
