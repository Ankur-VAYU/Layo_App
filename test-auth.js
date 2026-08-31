import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://hlqeddasjkxweiqadege.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTcyMTEsImV4cCI6MjA5MzUzMzIxMX0.EJJ_kELoWM2wsQ4GiDkOXSS0Lc5yFQ3Zw-RSIAWMhMA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Starting login...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'ankur84090@gmail.com',
    password: 'wrongpassword123'
  });
  console.log("Result:", { data, error });
}
test();
