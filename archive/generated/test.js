const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xhzxeuromnuxobiibwpf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoenhldXJvbW51eG9iaWlid3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzI1NTEsImV4cCI6MjA4NzkwODU1MX0.PeoEgfItVkNgksJsLwWODwfY4FwmS8-SJIw9f6WYvqo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
    const email = `testuser_${Date.now()}@gmail.com`;
    console.log("Signing up with:", email);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: 'password123!'
    });

    if (authError) {
        console.error("Auth Signup Error:", authError);
        return;
    }

    console.log("Signup success! Auth User ID:", authData.user?.id);

    // Check if the trigger inserted them into public.users
    if (authData.user) {
        const { data: usersData, error: usersError } = await (supabase.from('users').select('*').eq('id', authData.user.id));
        console.log("Rows in public.users:", usersData, "Error:", usersError);
    }
}

testSignup();
