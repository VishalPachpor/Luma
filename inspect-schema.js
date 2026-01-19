const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { createClient } = require('@supabase/supabase-js');

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function inspect() {
    console.log('--- Checking Guest Column Structure ---');
    const { data: guests, error: guestError } = await supabase.from('guests').select('*').limit(1);
    if (guestError) console.error(guestError);
    else console.log('Guests Sample:', JSON.stringify(guests[0], null, 2));

    console.log('\n--- Checking Tables for Answers ---');
    // Try to find a table named 'registration_answers' or 'answers'
    const { data: answers, error: answerError } = await supabase.from('registration_answers').select('*').limit(1);
    if (answerError) console.log('registration_answers table check:', answerError.message);
    else console.log('registration_answers Sample:', JSON.stringify(answers[0], null, 2));

    console.log('\n--- Checking Users/Profiles Table ---');
    const { data: users, error: userError } = await supabase.from('users').select('*').limit(1);
    if (userError) console.log('users table check:', userError.message);
    else console.log('users Sample:', JSON.stringify(users[0], null, 2));

    console.log('\n--- Checking Auth Users (Admin) ---');
    const { data: { users: authUsers }, error: authUserError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 2 });
    if (authUserError) console.error(authUserError);
    else console.log('Auth Users Sample:', JSON.stringify(authUsers, null, 2));
}

inspect();
